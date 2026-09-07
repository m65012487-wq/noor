// Smart Fajr alarm.
// Schedules repeating notifications from Fajr until sunrise every N minutes.
// "Wake detection" (honest Expo Go version): opening the app or tapping
// "I'm awake" cancels the remaining ring chain. If the person doesn't react,
// it keeps ringing until sunrise.
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { ensurePermission } from './prayerNotifications';
import { loadJSON, saveJSON } from './helpers';

const TAG = 'fajr-alarm';
const MAX_RINGS = 12;

export async function getFajrAlarmSettings() {
  return {
    enabled: await loadJSON('fajrAlarmEnabled', false),
    interval: await loadJSON('fajrAlarmInterval', 5), // minutes
  };
}
export async function setFajrAlarmEnabled(v) { await saveJSON('fajrAlarmEnabled', v); }
export async function setFajrAlarmInterval(v) { await saveJSON('fajrAlarmInterval', v); }

// Cancel only our alarm notifications (not prayer reminders).
export async function cancelFajrAlarm() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content?.data?.tag === TAG) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

// Расписание звонков. Первые шесть идут раз в минуту подряд, дальше — с
// выбранным интервалом. Ровный шаг в пять минут означал, что пропущенный
// первый звонок давал пять минут тишины — за них человек успевает заснуть
// обратно, что и произошло.
function ringTimes(fajrMs, sunriseMs, intervalMin, max) {
  const times = [];
  for (let i = 0; i < 6; i += 1) times.push(fajrMs + i * 60000);
  const step = Math.max(2, intervalMin) * 60000;
  for (let t = fajrMs + 6 * 60000; t < sunriseMs && times.length < max; t += step) {
    times.push(t);
  }
  return times.filter((t) => t < sunriseMs).slice(0, max);
}

// Schedule the ring chain for the given fajr/sunrise Date objects.
// Call daily after prayer times are computed.
export async function scheduleFajrAlarm(fajrDate, sunriseDate, labels) {
  const { enabled, interval } = await getFajrAlarmSettings();
  await cancelFajrAlarm();
  if (!enabled || !fajrDate || !sunriseDate) return 0;
  if (!(await ensurePermission())) return 0;

  const now = Date.now();
  let n = 0;
  // Цепочка ограничена дюжиной звонков. Сорок штук вместе с напоминаниями
  // о намазах перекрывали лимит iOS в 64 отложенных уведомления, и часть
  // расписания отбрасывалась молча — включая сам будильник.
  for (const t of ringTimes(fajrDate.getTime(), sunriseDate.getTime(), interval, MAX_RINGS)) {
    if (t <= now) continue; // don't schedule in the past
    await Notifications.scheduleNotificationAsync({
      content: {
        title: labels?.title || 'Фаджр! Пора вставать 🕌',
        body: labels?.body || 'Время утреннего намаза. Открой приложение, когда проснёшься — будильник остановится.',
        // Свой звук на двадцать девять секунд вместо системного «дзынь»:
        // iOS обрывает звук уведомления на тридцатой секунде, и это предел
        // того, что приложению вообще доступно.
        sound: 'alarm.wav',
        // Сквозь режим сна обычное уведомление не проходит — оно приходит
        // беззвучно и копится до утра. Time Sensitive пробивает «Фокус»;
        // на бесшумный режим переключателем сбоку не влияет ничто, кроме
        // Critical Alerts, а те требуют разрешения Apple.
        interruptionLevel: 'timeSensitive',
        data: { tag: TAG },
      },
      // Тип обязателен: нетипизированный { date } нынешняя версия
      // expo-notifications не принимает, и будильник не ставился вовсе.
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(t) },
    });
    n++;
  }
  await saveJSON('fajrAlarmWindow', { from: fajrDate.getTime(), to: sunriseDate.getTime() });
  return n;
}

// True if we are currently inside today's alarm window.
export async function isInAlarmWindow() {
  const w = await loadJSON('fajrAlarmWindow', null);
  if (!w) return false;
  const now = Date.now();
  return now >= w.from && now <= w.to;
}

// Person confirmed awake -> stop the remaining chain.
export async function markAwake() {
  await cancelFajrAlarm();
}
