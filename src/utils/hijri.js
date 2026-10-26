// Дата по хиджре.
//
// Используется табличный (кувейтский) алгоритм: он целиком арифметический,
// работает офлайн и совпадает сам с собой год от года. Настоящий лунный
// месяц начинается с наблюдения молодого месяца, поэтому таблица может
// разойтись с объявленной датой на день-другой — отсюда пользовательская
// поправка. Полагаться на Intl нельзя: в Hermes набор календарей неполон,
// и на устройстве это молча даёт григорианскую дату.

import { pick } from '../i18n/languages';

function gregorianToJdn(y, m, d) {
  const a = Math.floor((m - 14) / 12);
  return Math.floor((1461 * (y + 4800 + a)) / 4)
    + Math.floor((367 * (m - 2 - 12 * a)) / 12)
    - Math.floor((3 * Math.floor((y + 4900 + a) / 100)) / 4)
    + d - 32075;
}

/**
 * @param {Date} date
 * @param {number} offsetDays поправка в сутках, −2…+2
 * @returns {{year:number, month:number, day:number}} month — 1..12
 */
export function toHijri(date = new Date(), offsetDays = 0) {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate())
    + Math.round(offsetDays);
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719)
    + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { year: 30 * n + j - 30, month, day };
}

export const HIJRI_MONTHS_RU = [
  'мухаррам', 'сафар', 'раби аль-авваль', 'раби ас-сани',
  'джумада аль-уля', 'джумада ас-сани', 'раджаб', 'шабан',
  'рамадан', 'шавваль', 'зуль-када', 'зуль-хиджа',
];
export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Shaban',
  'Ramadan', 'Shawwal', 'Dhul-Qadah', 'Dhul-Hijjah',
];
export const HIJRI_MONTHS_TR = [
  'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir',
  'Cemaziyelevvel', 'Cemaziyelahir', 'Recep', 'Şaban',
  'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce',
];
export const HIJRI_MONTHS_ID = [
  'Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir',
  'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban',
  'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah',
];
export const HIJRI_MONTHS_FR = [
  'Mouharram', 'Safar', 'Rabi al-awwal', 'Rabi ath-thani',
  'Joumada al-oula', 'Joumada ath-thania', 'Rajab', 'Chaabane',
  'Ramadan', 'Chawwal', 'Dhou al-qi’da', 'Dhou al-hijja',
];
export const HIJRI_MONTHS_DE = [
  'Muharram', 'Safar', 'Rabi al-awwal', 'Rabi ath-thani',
  'Dschumada al-ula', 'Dschumada ath-thaniya', 'Radschab', 'Schaban',
  'Ramadan', 'Schawwal', 'Dhu l-qada', 'Dhu l-hiddscha',
];
export const HIJRI_MONTHS_ES = [
  'Muharram', 'Safar', 'Rabi al-awwal', 'Rabi al-zani',
  'Yumada al-ula', 'Yumada al-zania', 'Rayab', 'Shaabán',
  'Ramadán', 'Shawwal', 'Dul Qada', 'Dul Hiyya',
];
// Названия месяцев по языкам — для pick().
export const HIJRI_MONTHS = {
  ru: HIJRI_MONTHS_RU, en: HIJRI_MONTHS_EN, tr: HIJRI_MONTHS_TR, id: HIJRI_MONTHS_ID,
  fr: HIJRI_MONTHS_FR, de: HIJRI_MONTHS_DE, es: HIJRI_MONTHS_ES,
};

export function formatHijri(date = new Date(), offsetDays = 0, lang = 'ru') {
  const h = toHijri(date, offsetDays);
  const months = pick(HIJRI_MONTHS, lang);
  const name = months[Math.min(11, Math.max(0, h.month - 1))];
  const base = `${h.day} ${name} ${h.year}`;
  return pick({
    ru: base, en: `${base} AH`, tr: base, id: `${base} H`, fr: `${base} H`, de: `${base} n. H.`, es: `${base} H`,
  }, lang);
}

const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS = { ru: MONTHS_RU, en: MONTHS_EN, tr: MONTHS_TR, id: MONTHS_ID, fr: MONTHS_FR, de: MONTHS_DE, es: MONTHS_ES };

export function formatGregorian(date = new Date(), lang = 'ru') {
  const d = date.getDate();
  const y = date.getFullYear();
  const m = date.getMonth();
  return pick({
    ru: `${d} ${MONTHS_RU[m]} ${y}`,
    en: `${MONTHS_EN[m]} ${d}, ${y}`,
    tr: `${d} ${MONTHS_TR[m]} ${y}`,
    id: `${d} ${MONTHS_ID[m]} ${y}`,
    fr: `${d} ${MONTHS_FR[m]} ${y}`,
    de: `${d}. ${MONTHS_DE[m]} ${y}`,
    es: `${d} de ${MONTHS_ES[m]} de ${y}`,
  }, lang);
}

export function monthName(index, lang = 'ru') {
  return pick(MONTHS, lang)[index];
}
