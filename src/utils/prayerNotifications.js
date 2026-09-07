// Планировщик напоминаний о намазе.
//
// До этого в приложении был экран настройки напоминаний и хранилище для них,
// но само планирование отсутствовало: пользователь выбирал «за 10 минут»,
// и ничего не происходило. Здесь эта часть и живёт.
//
// iOS держит не более 64 отложенных уведомлений на приложение, поэтому
// расписание ставится на несколько дней вперёд и перепланируется при каждом
// открытии приложения и смене настроек.
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const TAG = 'prayer-reminder';
// Восход тоже присылает уведомление: он завершает время утренней молитвы.
// Напоминание «за N минут» к нему не относится — оно ставится только
// перед началом намаза.
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const EXTRA = ['Sunrise'];

// Запас: будильник на рассвет ставит собственную цепочку, ему тоже нужно место.
// iOS держит не более 64 отложенных уведомлений на приложение. На каждый намаз
// приходится до двух (наступление и напоминание) плюс восход — около одиннадцати
// в сутки, поэтому горизонт сокращён до четырёх дней. Двенадцать мест
// оставлено будильнику на рассвет: иначе его цепочка вытеснялась молча.
const MAX_SCHEDULED = 45;

export async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return !!asked.granted;
}

// Снимаем только свои напоминания, не трогая будильник на рассвет.
export async function cancelPrayerReminders() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => n.content?.data?.tag === TAG)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // Планировщик недоступен (например, в веб-сборке) — молча пропускаем.
  }
}

// "05:14" + дата -> Date. Возвращает null, если время не разобралось:
// источник времён может отдать прочерк, когда солнце не заходит.
function timeToDate(hhmm, day) {
  if (typeof hhmm !== 'string') return null;
  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const date = new Date(day);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

/**
 * Перепланировать напоминания на несколько дней вперёд.
 *
 * @param {object}   options
 * @param {function} options.timesForDate  (Date) => { Fajr: "05:14", ... }
 * @param {object}   options.reminders     { Fajr: { enabled, minutesBefore }, ... }
 * @param {function} options.label         (prayer) => отображаемое имя
 * @param {function} options.body          (prayer, minutesBefore) => текст
 * @param {number}   [options.days]        на сколько дней вперёд
 * @returns {Promise<number>} сколько уведомлений поставлено
 */
export async function schedulePrayerReminders({
  timesForDate, reminders, label, body, sound, days = 4,
}) {
  await cancelPrayerReminders();

  const enabled = PRAYERS.filter((p) => reminders?.[p]?.enabled);
  if (!enabled.length && !EXTRA.length) return 0;
  if (!(await ensurePermission())) return 0;

  const now = Date.now();
  const planned = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    day.setHours(0, 0, 0, 0);

    let times;
    try {
      times = timesForDate(day);
    } catch {
      continue;
    }
    if (!times) continue;

    for (const prayer of [...enabled, ...EXTRA]) {
      const at = timeToDate(times[prayer], day);
      if (!at) continue;

      // Само наступление времени: приходит всегда, для всех намазов
      // и для восхода.
      const push = (fireAt, minutesBefore) => {
        // Прошедшее время iOS показал бы немедленно — это выглядит как сбой.
        if (fireAt.getTime() <= now + 30000) return;
        planned.push({ prayer, fireAt, minutesBefore });
      };
      push(at, 0);

      // Напоминание заранее — отдельное уведомление, а не замена первому.
      // К восходу не относится: он не начало молитвы, а конец её времени.
      const before = EXTRA.includes(prayer) ? 0 : (reminders[prayer]?.minutesBefore || 0);
      if (before > 0) push(new Date(at.getTime() - before * 60000), before);
    }
  }

  planned.sort((a, b) => a.fireAt - b.fireAt);

  let scheduled = 0;
  for (const item of planned.slice(0, MAX_SCHEDULED)) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: label(item.prayer),
          body: body(item.prayer, item.minutesBefore),
          // Имя файла вместо true: iOS проигрывает звук из бандла,
          // а true даёт системный по умолчанию.
          sound: sound || true,
          // Сквозь режим сна и «Фокус» обычное уведомление не проходит: оно
          // приходит беззвучно и копится до утра. Время намаза привязано к
          // моменту, а не к удобному случаю, поэтому уровень повышен.
          interruptionLevel: 'timeSensitive',
          data: { tag: TAG, prayer: item.prayer },
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: item.fireAt },
      });
      scheduled += 1;
    } catch {
      // Одно неудачное уведомление не должно рвать всё расписание.
    }
  }

  return scheduled;
}

// Сколько наших напоминаний сейчас стоит в очереди — для экрана настроек.
export async function countScheduled() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.filter((n) => n.content?.data?.tag === TAG).length;
  } catch {
    return 0;
  }
}
