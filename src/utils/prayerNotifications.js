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
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Запас: будильник на рассвет ставит собственную цепочку, ему тоже нужно место.
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
  timesForDate, reminders, label, body, days = 7,
}) {
  await cancelPrayerReminders();

  const enabled = PRAYERS.filter((p) => reminders?.[p]?.enabled);
  if (!enabled.length) return 0;
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

    for (const prayer of enabled) {
      const at = timeToDate(times[prayer], day);
      if (!at) continue;

      const minutesBefore = reminders[prayer].minutesBefore || 0;
      const fireAt = new Date(at.getTime() - minutesBefore * 60000);
      // Прошедшее время iOS показал бы немедленно — это выглядит как сбой.
      if (fireAt.getTime() <= now + 30000) continue;

      planned.push({ prayer, fireAt, minutesBefore });
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
          sound: true,
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
