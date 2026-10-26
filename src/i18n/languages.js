// Языки интерфейса. Порядок — как в выборе языка в настройках; label — название
// языка на нём самом. Письма справа налево (арабский, урду) пока нет: для них
// пришлось бы зеркалить все экраны.
export const LANGS = [
  { id: 'ru', label: 'Русский', locale: 'ru-RU' },
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'tr', label: 'Türkçe', locale: 'tr-TR' },
  { id: 'id', label: 'Bahasa Indonesia', locale: 'id-ID' },
  { id: 'fr', label: 'Français', locale: 'fr-FR' },
  { id: 'de', label: 'Deutsch', locale: 'de-DE' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
];

export const LANG_IDS = LANGS.map((l) => l.id);

/** Локаль для дат и чисел (toLocaleDateString и т.п.). */
export function localeOf(lang) {
  return LANGS.find((l) => l.id === lang)?.locale || 'en-GB';
}

/**
 * Поле данных на языке интерфейса. Данные хранят переводы рядом: text_ru,
 * text_en, text_tr… Нет перевода на этот язык — английский, затем русский,
 * затем поле без суффикса.
 *   localized({ title_ru: 'Аср', title_en: 'Asr' }, 'title', 'de') → 'Asr'
 */
export function localized(obj, field, lang) {
  if (!obj) return '';
  return obj[`${field}_${lang}`] ?? obj[`${field}_en`] ?? obj[`${field}_ru`] ?? obj[field] ?? '';
}

/**
 * То же для словаря вида { ru: '…', en: '…', tr: '…' } — так записаны короткие
 * подписи прямо в коде, где заводить ключ в общем словаре нет смысла. Ключи:
 * ru, en, tr, id, fr, de, es (у сущностей с полем id индонезийский — lang_id).
 */
export function pick(variants, lang) {
  if (!variants) return '';
  // Индонезийский 'id' совпадает с полем id у сущностей (зикры, наборы, породы
  // деревьев): у них перевод лежит в lang_id, иначе вернулась бы строка-идентификатор.
  const own = lang === 'id' ? (variants.lang_id ?? variants.id) : variants[lang];
  return own ?? variants.en ?? variants.ru ?? '';
}
