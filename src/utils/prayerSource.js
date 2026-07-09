// Unified prayer-times provider.
// Sources: 'auto' (RU -> Russian method, else international via Aladhan),
//          'aladhan' (international API), 'local' (offline adhan calc).
// Always falls back to local offline calc if the network fails.
import { computePrayerTimes, computeDumRussia } from './prayerCalc';

const ALADHAN = 'https://api.aladhan.com/v1/timings';

function applyTune(times, tune) {
  if (!tune) return times;
  const out = {};
  for (const k of Object.keys(times)) {
    const [h, m] = times[k].split(':').map(Number);
    const d = new Date(); d.setHours(h, m + (tune[k] || 0), 0, 0);
    out[k] = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return out;
}

// Map our internal method ids -> Aladhan numeric method.
const ALADHAN_METHOD = {
  mwl: 3, isna: 2, egypt: 5, makkah: 4, karachi: 1, dubai: 8, kuwait: 9,
  qatar: 10, turkey: 13, tehran: 7, singapore: 11, moonsighting: 15, russia: 14,
};

async function fetchAladhan(lat, lng, methodNum, school) {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  const tzp = tz ? `&timezonestring=${encodeURIComponent(tz)}` : '';
  const schoolNum = school === 'hanafi' ? 1 : 0;
  const url = `${ALADHAN}?latitude=${lat}&longitude=${lng}&method=${methodNum}&school=${schoolNum}${tzp}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('aladhan http ' + res.status);
  const j = await res.json();
  const t = j.data.timings;
  return { Fajr: t.Fajr, Sunrise: t.Sunrise, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
}

// Detect if the user is in Russia (by timezone) for the 'auto' source.
function isRussia() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return tz.startsWith('Europe/Mosc') || tz.startsWith('Europe/Kaliningrad') ||
      tz.startsWith('Asia/Yekaterinburg') || tz.startsWith('Asia/Novosibirsk') ||
      tz.startsWith('Asia/Krasnoyarsk') || tz.startsWith('Asia/Irkutsk') ||
      tz.startsWith('Asia/Vladivostok') || tz.startsWith('Asia/Omsk') ||
      tz.startsWith('Asia/Yakutsk') || tz.startsWith('Asia/Magadan') ||
      tz.startsWith('Europe/Samara') || tz.startsWith('Asia/Barnaul');
  } catch { return false; }
}

// Available time sources the user can pick explicitly.
// Each maps to a fetcher. Russian sources use Aladhan's Russia method (14).
export const TIME_SOURCES = [
  { id: 'mwl_intl', label_en: 'Muslim World League (Intl.)', label_ru: 'Лига исламского мира (межд.)', method: 3 },
  { id: 'russia', label_en: 'Russia (Spiritual Admin.)', label_ru: 'Россия (ДУМ РФ)', method: 14 },
  { id: 'turkey', label_en: 'Turkey (Diyanet)', label_ru: 'Турция (Диянет)', method: 13 },
  { id: 'egypt', label_en: 'Egyptian Authority', label_ru: 'Египетская организация', method: 5 },
  { id: 'makkah', label_en: 'Umm al-Qura (Makkah)', label_ru: 'Умм аль-Кура (Мекка)', method: 4 },
  { id: 'karachi', label_en: 'Karachi', label_ru: 'Карачи', method: 1 },
  { id: 'isna', label_en: 'ISNA (N. America)', label_ru: 'ISNA (Сев. Америка)', method: 2 },
  { id: 'local', label_en: 'Offline (device calc)', label_ru: 'Офлайн (на устройстве)', method: null },
];

export function getPrayerTimes2({ lat, lng, sourceId = 'mwl_intl', school = 'shafi', tune = null }) {
  const src = TIME_SOURCES.find((s) => s.id === sourceId) || TIME_SOURCES[0];
  // Russia / DUM: use the local DUM calculation (matches the official
  // DUM schedule to the minute, instant and offline).
  if (sourceId === 'russia') {
    return Promise.resolve(applyTune(computeDumRussia(lat, lng, school), tune));
  }
  if (src.method == null) {
    // local offline
    return Promise.resolve(applyTune(computePrayerTimes(lat, lng, 'mwl', school), tune));
  }
  return fetchAladhan(lat, lng, src.method, school)
    .then((t) => applyTune(t, tune))
    .catch(() => applyTune(computePrayerTimes(lat, lng, 'mwl', school), tune));
}
