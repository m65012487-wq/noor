import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPrayerTimes2 } from './prayerSource';
import { localDateKey, atTime } from './calendarDate';

export const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const pending = new Map();
export function scheduleIdentity({ lat, lng, sourceId, school, tune }) {
  return JSON.stringify([lat, lng, sourceId, school, tune || {}, Intl.DateTimeFormat().resolvedOptions().timeZone]);
}

// All consumers share the same dated snapshot, including any offline fallback.
export function getPrayerDay(options, date = new Date()) {
  const key = 'prayerDay:v2:' + scheduleIdentity(options) + ':' + localDateKey(date);
  if (pending.has(key)) return pending.get(key);
  const task = loadDay(key, options, date).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
async function loadDay(key, options, date) {
  let cached;
  try { cached = JSON.parse(await AsyncStorage.getItem(key)); } catch {}
  if (cached) return cached;
  let offlineFallback = false;
  const raw = await getPrayerTimes2({ ...options, date, onFallback: () => { offlineFallback = true; } });
  const dateKey = localDateKey(date);
  const timings = Object.fromEntries(PRAYER_ORDER.map(name => {
    const time = raw[name]?.match(/^\d{2}:\d{2}/)?.[0];
    if (!atTime(dateKey, time)) throw new Error('Invalid prayer time: ' + name);
    return [name, time];
  }));
  const result = { date: dateKey, timings, sourceId: options.sourceId, offlineFallback,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  try { await AsyncStorage.setItem(key, JSON.stringify(result)); } catch {}
  return result;
}
export async function getPrayerWindow(options) {
  const dates = Array.from({ length: 9 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() + i - 1); date.setHours(12, 0, 0, 0); return date;
  });
  const days = [];
  for (let i = 0; i < dates.length; i += 3) days.push(...await Promise.all(dates.slice(i, i + 3).map(d => getPrayerDay(options, d))));
  return days;
}
export function prayerEvents(days, now = new Date()) {
  const events = days.flatMap(day => PRAYER_ORDER.filter(name => name !== 'Sunrise').map(name => ({
    name, time: day.timings[name], date: atTime(day.date, day.timings[name]),
  }))).filter(e => e.date).sort((a, b) => a.date - b.date);
  const upcoming = events.filter(e => e.date > now);
  const previous = events.filter(e => e.date <= now).pop();
  const next = upcoming[0];
  return { next, afterNext: upcoming[1], progress: previous && next ? Math.max(0, Math.min(1, (now - previous.date) / (next.date - previous.date))) : 0 };
}
