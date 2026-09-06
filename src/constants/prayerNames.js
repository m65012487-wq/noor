// Prayer name localization. Key = API name (Fajr/Dhuhr/...).
export const PRAYER_NAMES = {
  Fajr:    { en: 'Fajr',    ru: 'Фаджр' },
  // Восход не намаз, а конец времени фаджра: показывается в расписании
  // и присылает уведомление, но напоминание «за N минут» для него не ставится.
  Sunrise: { en: 'Sunrise', ru: 'Восход' },
  Dhuhr:   { en: 'Dhuhr',   ru: 'Зухр' },
  Asr:     { en: 'Asr',     ru: 'Аср' },
  Maghrib: { en: 'Maghrib', ru: 'Магриб' },
  Isha:    { en: 'Isha',    ru: 'Иша' },
};
export function prayerName(key, lang) {
  const p = PRAYER_NAMES[key];
  if (!p) return key;
  return lang === 'ru' ? p.ru : p.en;
}
