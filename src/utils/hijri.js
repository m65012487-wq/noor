// Дата по хиджре.
//
// Используется табличный (кувейтский) алгоритм: он целиком арифметический,
// работает офлайн и совпадает сам с собой год от года. Настоящий лунный
// месяц начинается с наблюдения молодого месяца, поэтому таблица может
// разойтись с объявленной датой на день-другой — отсюда пользовательская
// поправка. Полагаться на Intl нельзя: в Hermes набор календарей неполон,
// и на устройстве это молча даёт григорианскую дату.

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

export function formatHijri(date = new Date(), offsetDays = 0, lang = 'ru') {
  const h = toHijri(date, offsetDays);
  const months = lang === 'ru' ? HIJRI_MONTHS_RU : HIJRI_MONTHS_EN;
  const name = months[Math.min(11, Math.max(0, h.month - 1))];
  return lang === 'ru'
    ? `${h.day} ${name} ${h.year}`
    : `${h.day} ${name} ${h.year} AH`;
}

const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function formatGregorian(date = new Date(), lang = 'ru') {
  return lang === 'ru'
    ? `${date.getDate()} ${MONTHS_RU[date.getMonth()]} ${date.getFullYear()}`
    : `${MONTHS_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function monthName(index, lang = 'ru') {
  return (lang === 'ru' ? MONTHS_RU : MONTHS_EN)[index];
}
