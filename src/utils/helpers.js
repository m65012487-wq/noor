import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Qibla direction ----------
// Returns bearing in degrees from user location toward the Kaaba.
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export function getQiblaBearing(lat, lng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const phiK = toRad(KAABA_LAT);
  const phi = toRad(lat);
  const deltaLng = toRad(KAABA_LNG - lng);

  const y = Math.sin(deltaLng);
  const x =
    Math.cos(phi) * Math.tan(phiK) -
    Math.sin(phi) * Math.cos(deltaLng);

  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

// ---------- Prayer times via Aladhan API ----------
export async function fetchPrayerTimes(lat, lng, method = 13, school = 0, tune = null) {
  // Include the device timezone so times match the user's local clock.
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  const tzParam = tz ? `&timezonestring=${encodeURIComponent(tz)}` : '';
  // tune = { Fajr, Dhuhr, Asr, Maghrib, Isha } minute offsets (optional).
  // Aladhan tune order: Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight
  let tuneParam = '';
  if (tune) {
    const f = tune.Fajr || 0, d = tune.Dhuhr || 0, a = tune.Asr || 0, m = tune.Maghrib || 0, i = tune.Isha || 0;
    tuneParam = `&tune=0,${f},0,${d},${a},${m},0,${i},0`;
  }
  const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}${tzParam}${tuneParam}`;
  const res = await fetch(url);
  const json = await res.json();
  const t = json.data.timings;
  return {
    Fajr: t.Fajr,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  };
}

// Given the timings object, find the next upcoming prayer.
export function getNextPrayer(timings) {
  if (!timings) return null;
  const now = new Date();
  const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  for (const name of order) {
    const [h, m] = timings[name].split(':').map(Number);
    const t = new Date();
    t.setHours(h, m, 0, 0);
    if (t > now) {
      return { name, time: timings[name], date: t };
    }
  }
  // All passed -> next is tomorrow's Fajr
  const [h, m] = timings.Fajr.split(':').map(Number);
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(h, m, 0, 0);
  return { name: 'Fajr', time: timings.Fajr, date: t };
}

// ---------- Storage helpers ----------
export async function saveJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('save failed', e);
  }
}

export async function loadJSON(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

// ---------- Streak logic ----------
// Returns the day index string like "2026-06-21"
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ---------- Days-ago key (for streak grace logic) ----------
export function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Returns the difference in whole days between two YYYY-MM-DD keys.
export function dayDiff(aKey, bKey) {
  const a = new Date(aKey + 'T00:00:00');
  const b = new Date(bKey + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}
