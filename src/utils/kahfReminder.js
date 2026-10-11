import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { ensurePermission } from './prayerNotifications';

// Напоминание о суре аль-Кахф: одно уведомление в неделю, в пятницу утром.
// Это повторяющийся триггер — одно место из 64, которые iOS даёт приложению, и
// его не нужно перепланировать каждый день. Нажатие открывает суру (App.js).
export const KAHF_TAG = 'kahf-reminder';
// weekday в expo-notifications: 1 — воскресенье, 6 — пятница.
const FRIDAY = 6;
const HOUR = 9;

async function cancel() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter(n => n.content?.data?.tag === KAHF_TAG)
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch { /* планировщик недоступен — нечего снимать */ }
}

export async function syncKahfReminder(enabled, { title, body }) {
  await cancel();
  if (!enabled) return false;
  try {
    if (!(await ensurePermission())) return false;
    // Постоянный identifier: повторное планирование заменяет прежнее, и два
    // параллельных вызова не оставят двух уведомлений в пятницу.
    await Notifications.scheduleNotificationAsync({
      identifier: KAHF_TAG,
      content: { title, body, sound: true, data: { tag: KAHF_TAG } },
      trigger: { type: SchedulableTriggerInputTypes.WEEKLY, weekday: FRIDAY, hour: HOUR, minute: 0 },
    });
    return true;
  } catch {
    return false;
  }
}
