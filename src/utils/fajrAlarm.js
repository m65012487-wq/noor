import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { ensurePermission } from './prayerNotifications';
import { loadJSON, saveJSON } from './helpers';
import { atTime, localDateKey } from './calendarDate';

const TAG = 'fajr-alarm';
export async function getFajrAlarmSettings() {
  return { enabled: await loadJSON('fajrAlarmEnabled', false), interval: await loadJSON('fajrAlarmInterval', 5) };
}
export async function setFajrAlarmEnabled(value) { await saveJSON('fajrAlarmEnabled', value); }
export async function setFajrAlarmInterval(value) { await saveJSON('fajrAlarmInterval', value); }
export async function cancelFajrAlarm() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter(n => n.content?.data?.tag === TAG).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// Twelve reserved slots: four alerts for each of the next three mornings.
// These remain notifications; they do not have system-alarm privileges.
export async function scheduleFajrDays(days, labels) {
  const settings = await getFajrAlarmSettings();
  await cancelFajrAlarm();
  if (!settings.enabled || !(await ensurePermission())) return 0;
  const now = Date.now();
  const awakeDate = await loadJSON('fajrAwakeDate', null);
  const windows = days.map(day => ({ date: day.date,
    from: atTime(day.date, day.timings.Fajr)?.getTime(),
    to: atTime(day.date, day.timings.Sunrise)?.getTime(),
  })).filter(w => w.from && w.to > now && w.date !== awakeDate).slice(0, 3);
  let scheduled = 0;
  for (const window of windows) {
    for (let i = 0; i < 4; i += 1) {
      const time = window.from + i * Math.max(1, settings.interval) * 60000;
      if (time <= now || time >= window.to) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: labels.title, body: labels.body, sound: 'alarm.wav',
          interruptionLevel: 'timeSensitive', data: { tag: TAG, day: window.date } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(time) },
      });
      scheduled += 1;
    }
  }
  await saveJSON('fajrAlarmWindows', windows);
  return scheduled;
}
export async function isInAlarmWindow() {
  if (await loadJSON('fajrAwakeDate', null) === localDateKey()) return false;
  const windows = await loadJSON('fajrAlarmWindows', []);
  return windows.some(w => Date.now() >= w.from && Date.now() < w.to);
}
export async function markAwake() {
  const day = localDateKey();
  await saveJSON('fajrAwakeDate', day);
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter(n => n.content?.data?.tag === TAG && n.content?.data?.day === day)
    .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}
