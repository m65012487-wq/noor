import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import NoorAlarm, { alarmKitSupported } from '../../modules/noor-alarm';
import { ensurePermission } from './prayerNotifications';
import { loadJSON, saveJSON } from './helpers';
import { localDateKey, prayerMoment } from './calendarDate';

// Будильник на Фаджр: до четырёх сигналов каждое из трёх ближайших утр, с
// Фаджра до восхода, пока человек не отметит «Я проснулся».
//
// На iOS 26 это настоящие системные будильники (AlarmKit, модуль noor-alarm):
// звенят в беззвучном режиме и в фокусе «Сон», экран будильника с кнопкой
// «Стоп». На старых iOS или без разрешения на будильники — уведомления, как
// раньше: они такими правами не обладают.

const TAG = 'fajr-alarm';
const KIT_IDS = 'fajrAlarmKitIds';
const SOUND = 'alarm.wav';

export async function getFajrAlarmSettings() {
  return { enabled: await loadJSON('fajrAlarmEnabled', false), interval: await loadJSON('fajrAlarmInterval', 5) };
}
export async function setFajrAlarmEnabled(value) { await saveJSON('fajrAlarmEnabled', value); }
export async function setFajrAlarmInterval(value) { await saveJSON('fajrAlarmInterval', value); }

async function cancelKit(filter = () => true) {
  if (!alarmKitSupported()) return;
  const saved = await loadJSON(KIT_IDS, []);
  const drop = saved.filter(filter);
  try { NoorAlarm.cancel(drop.map(a => a.id)); } catch { /* будильник уже прозвенел */ }
  await saveJSON(KIT_IDS, saved.filter(a => !drop.includes(a)));
}

export async function cancelFajrAlarm() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter(n => n.content?.data?.tag === TAG).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  await cancelKit();
  // Будильники Noor в AlarmKit — только эти, поэтому снимаем и потерянные
  // (например, после переустановки, когда список id не сохранился).
  if (alarmKitSupported()) { try { NoorAlarm.cancelAll(); } catch { /* нечего снимать */ } }
}

// Что вышло при последнем планировании — для разбора, если будильник не придёт:
// сколько сигналов стоит, когда ближайший и почему нет ни одного.
const STATUS_KEY = 'fajrAlarmStatus';
async function saveStatus(status) { await saveJSON(STATUS_KEY, { ...status, at: Date.now() }); }
export async function getFajrAlarmStatus() { return loadJSON(STATUS_KEY, null); }

// Есть ли разрешение на системные будильники. Первый вызов показывает запрос iOS.
async function kitAuthorized() {
  if (!alarmKitSupported()) return false;
  try { return (await NoorAlarm.authorize()) === 'authorized'; } catch { return false; }
}

// «Срочный» уровень пробивает фокус «Сон», но требует права от Apple. Если
// приложение переподписано без него, iOS отвергает такое уведомление целиком —
// тогда ставим обычное: пусть лучше придёт без привилегий, чем не придёт совсем.
async function scheduleNotification(content, date) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { ...content, interruptionLevel: 'timeSensitive' },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date } });
    return 'timeSensitive';
  } catch {
    await Notifications.scheduleNotificationAsync({ content, trigger: { type: SchedulableTriggerInputTypes.DATE, date } });
    return 'active';
  }
}

export async function scheduleFajrDays(days, labels) {
  const settings = await getFajrAlarmSettings();
  await cancelFajrAlarm();
  if (!settings.enabled) { await saveStatus({ count: 0, reason: 'off' }); return 0; }
  const kit = await kitAuthorized();
  if (!kit && !(await ensurePermission())) { await saveStatus({ count: 0, reason: 'denied' }); return 0; }
  const now = Date.now();
  const awakeDate = await loadJSON('fajrAwakeDate', null);
  // Окно начинается с момента Фаджра, а не с его часов на дате строки: в графике
  // высоких широт Фаджр строки D бывает записан как 23:54, то есть вечером D−1.
  // date при этом остаётся датой строки — по ней отмечается «я проснулся».
  const windows = days.map(day => ({ date: day.date,
    from: prayerMoment(day, 'Fajr')?.getTime(),
    to: prayerMoment(day, 'Sunrise')?.getTime(),
  })).filter(w => w.from && w.to > now && w.date !== awakeDate).slice(0, 3);
  let scheduled = 0;
  let next = null;
  let level = kit ? 'alarmkit' : null;
  let error = null;
  const kitIds = [];
  for (const window of windows) {
    for (let i = 0; i < 4; i += 1) {
      const time = window.from + i * Math.max(1, settings.interval) * 60000;
      if (time <= now || time >= window.to) continue;
      try {
        if (kit) {
          kitIds.push({ id: await NoorAlarm.schedule(time, labels.title, labels.stop, SOUND), day: window.date });
        } else {
          level = await scheduleNotification({ title: labels.title, body: labels.body, sound: SOUND,
            data: { tag: TAG, day: window.date } }, new Date(time));
        }
        scheduled += 1;
        if (next == null || time < next) next = time;
      } catch (e) {
        error = String(e?.message || e);
      }
    }
  }
  if (kit) await saveJSON(KIT_IDS, kitIds);
  await saveJSON('fajrAlarmWindows', windows);
  await saveStatus({ count: scheduled, next, level, error,
    // Поддержка есть, а разрешения нет — пишем, что работают лишь уведомления.
    kitDenied: alarmKitSupported() && !kit,
    reason: scheduled ? null : (error ? 'error' : windows.length ? 'past' : 'none') });
  return scheduled;
}
// «Проснулся» помнится по дате строки окна, а не по календарной дате «сейчас»:
// окно строки D может начаться в 23:54 вечера D−1, и отметка, поставленная до
// полуночи, должна гасить именно его, а не вернуться баннером после неё.
export async function isInAlarmWindow() {
  const awakeDate = await loadJSON('fajrAwakeDate', null);
  const windows = await loadJSON('fajrAlarmWindows', []);
  return windows.some(w => w.date !== awakeDate && Date.now() >= w.from && Date.now() < w.to);
}
export async function markAwake() {
  const windows = await loadJSON('fajrAlarmWindows', []);
  const now = Date.now();
  const day = windows.find(w => now >= w.from && now < w.to)?.date || localDateKey();
  await saveJSON('fajrAwakeDate', day);
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter(n => n.content?.data?.tag === TAG && n.content?.data?.day === day)
    .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  // Оставшиеся системные будильники этого утра больше не нужны.
  await cancelKit(a => a.day === day);
}
