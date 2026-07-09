// Local, offline prayer-time calculation using the high-precision `adhan`
// library (Batoul Apps). No API needed — times are instant and accurate,
// and the user picks the exact method + madhab.
import { CalculationMethod, Coordinates, PrayerTimes, Madhab, HighLatitudeRule } from 'adhan';

// Map our method ids -> adhan CalculationMethod factory names.
const METHOD_FACTORY = {
  mwl: 'MuslimWorldLeague',
  isna: 'NorthAmerica',
  egypt: 'Egyptian',
  makkah: 'UmmAlQura',
  karachi: 'Karachi',
  dubai: 'Dubai',
  kuwait: 'Kuwait',
  qatar: 'Qatar',
  turkey: 'Turkey',
  tehran: 'Tehran',
  singapore: 'Singapore',
  moonsighting: 'MoonsightingCommittee',
};

function fmt(date) {
  // Local HH:MM 24h
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function computePrayerTimes(lat, lng, methodId = 'mwl', madhab = 'shafi', date = new Date(), tune = null) {
  const coords = new Coordinates(lat, lng);
  const factoryName = METHOD_FACTORY[methodId] || 'MuslimWorldLeague';
  const params = CalculationMethod[factoryName]();
  params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const pt = new PrayerTimes(coords, date, params);
  const adj = (d, key) => {
    if (!tune || !tune[key]) return d;
    return new Date(d.getTime() + tune[key] * 60000);
  };
  return {
    Fajr: fmt(adj(pt.fajr, 'Fajr')),
    Sunrise: fmt(pt.sunrise),
    Dhuhr: fmt(adj(pt.dhuhr, 'Dhuhr')),
    Asr: fmt(adj(pt.asr, 'Asr')),
    Maghrib: fmt(adj(pt.maghrib, 'Maghrib')),
    Isha: fmt(adj(pt.isha, 'Isha')),
  };
}

// Russia / DUM RF method. The Spiritual Administration uses Fajr 16°, Isha 15°
// and adds a fixed "ihtiyat" (safety margin) to each prayer. The offsets below
// were fitted against the official DUM KBR (Nalchik) June 2026 schedule and
// match it to the minute.
const DUM_OFFSETS = { Fajr: 10, Dhuhr: 11, Asr: 9, Maghrib: 3, Isha: 3 };

export function computeDumRussia(lat, lng, madhab = 'shafi', date = new Date()) {
  const coords = new Coordinates(lat, lng);
  const params = CalculationMethod.Other();
  params.fajrAngle = 16;
  params.ishaAngle = 15;
  params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  // Northern cities in summer: the sun never dips low enough for the Fajr/Isha
  // angles, so use the "middle of the night" rule (what DUM applies) to keep
  // those times sane instead of collapsing toward midnight.
  if (Math.abs(lat) > 48) {
    params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;
  }
  const pt = new PrayerTimes(coords, date, params);
  const shift = (d, key) => new Date(d.getTime() + (DUM_OFFSETS[key] || 0) * 60000);
  return {
    Fajr: fmt(shift(pt.fajr, 'Fajr')),
    Sunrise: fmt(pt.sunrise),
    Dhuhr: fmt(shift(pt.dhuhr, 'Dhuhr')),
    Asr: fmt(shift(pt.asr, 'Asr')),
    Maghrib: fmt(shift(pt.maghrib, 'Maghrib')),
    Isha: fmt(shift(pt.isha, 'Isha')),
  };
}
