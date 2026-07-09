// Smart Fajr alarm.
// Schedules repeating notifications from Fajr until sunrise every N minutes.
// "Wake detection" (honest Expo Go version): opening the app or tapping
// "I'm awake" cancels the remaining ring chain. If the person doesn't react,
// it keeps ringing until sunrise.
import * as Notifications from 'expo-notifications';
import { loadJSON, saveJSON } from './helpers';

const TAG = 'fajr-alarm';

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

// Schedule the ring chain for the given fajr/sunrise Date objects.
// Call daily after prayer times are computed.
export async function scheduleFajrAlarm(fajrDate, sunriseDate, labels) {
  const { enabled, interval } = await getFajrAlarmSettings();
  await cancelFajrAlarm();
  if (!enabled || !fajrDate || !sunriseDate) return 0;

  const now = Date.now();
  const step = Math.max(2, interval) * 60000;
  let n = 0;
  for (let t = fajrDate.getTime(); t < sunriseDate.getTime() && n < 40; t += step) {
    if (t <= now) continue; // don't schedule in the past
    await Notifications.scheduleNotificationAsync({
      content: {
        title: labels?.title || 'Фаджр! Пора вставать 🕌',
        body: labels?.body || 'Время утреннего намаза. Открой приложение, когда проснёшься — будильник остановится.',
        sound: true,
        data: { tag: TAG },
      },
      trigger: { date: new Date(t) },
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
