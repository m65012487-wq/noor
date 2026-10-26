// Prayer name localization. Key = API name (Fajr/Dhuhr/...).
import { pick } from '../i18n/languages';

export const PRAYER_NAMES = {
  Fajr:    { en: 'Fajr', tr: 'İmsak', id: 'Subuh', fr: 'Fajr', de: 'Fadschr', es: 'Fayr', ru: 'Фаджр' },
  // Восход не намаз, а конец времени фаджра: показывается в расписании
  // и присылает уведомление, но напоминание «за N минут» для него не ставится.
  Sunrise: { en: 'Sunrise', tr: 'Güneş', id: 'Terbit', fr: 'Chourouq', de: 'Schuruq', es: 'Shuruq', ru: 'Восход' },
  Dhuhr:   { en: 'Dhuhr', tr: 'Öğle', id: 'Dzuhur', fr: 'Dhohr', de: 'Dhuhr', es: 'Duhr', ru: 'Зухр' },
  Asr:     { en: 'Asr', tr: 'İkindi', id: 'Ashar', fr: 'Asr', de: 'Asr', es: 'Asr', ru: 'Аср' },
  Maghrib: { en: 'Maghrib', tr: 'Akşam', id: 'Maghrib', fr: 'Maghrib', de: 'Maghrib', es: 'Magrib', ru: 'Магриб' },
  Isha:    { en: 'Isha', tr: 'Yatsı', id: 'Isya', fr: 'Icha', de: 'Ischa', es: 'Isha', ru: 'Иша' },
};
export function prayerName(key, lang) {
  const p = PRAYER_NAMES[key];
  if (!p) return key;
  return pick(p, lang);
}
