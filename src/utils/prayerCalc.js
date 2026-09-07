// Local, offline prayer-time calculation using the high-precision `adhan`
// library (Batoul Apps). No API needed — times are instant and accurate,
// and the user picks the exact method + madhab.
import { CalculationMethod, Coordinates, PrayerTimes, Madhab } from 'adhan';

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

// Расчёт по методу ДУМ КБР вынесен в dumCalc.js: там своя солнечная
// математика, потому что adhan не умеет ограничивать угол по времени, а
// без этого график ДУМ не воспроизводится.
