// Prayer name localization. Key = API name (Fajr/Dhuhr/...).
export const PRAYER_NAMES = {
  Fajr:    { en: 'Fajr',    ru: 'Фаджр' },
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
