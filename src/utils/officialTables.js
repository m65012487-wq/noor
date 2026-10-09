// Официальные графики намаза — таблицы, которые публикует само духовное
// управление. Пока дата и место покрыты таблицей, время берётся из неё;
// формула остаётся для остальных дат и мест.
//
// Зачем таблица, если есть формула (dumCalc.js). График ДУМ КБР сглажен
// вручную, и гладкая формула повторяет его лишь до трёх минут: в октябре
// 2026 Аср по формуле на 1–3 минуты позже графика, Иша — на минуту. Мечети
// встают по графику, поэтому до минуты с ними совпадает только он сам.
//
// Файл таблицы (assets/prayer-tables/*.json):
//   authority — чей график ('ru-kbr' — ДУМ КБР);
//   place     — к какому месту относится: regions — части названия региона
//               (в нижнем регистре), radiusKm — круг вокруг lat/lng на случай,
//               когда регион места неизвестен;
//   utcOffset — пояс графика в минутах. Если на устройстве в этот день другой
//               пояс, времена таблицы не годятся и считает формула;
//   start     — дата первой строки, дальше строки идут подряд по дням;
//   days      — строки «Фаджр Восход Зухр Аср Магриб Иша».
// Поля title, source и place.name — справка для людей, код их не читает.
//
// Новая таблица — файл в assets/prayer-tables/ и строка require ниже: Metro
// не собирает папку целиком, и забытая таблица тихо уступит место формуле.
const TABLES = [
  require('../../assets/prayer-tables/ru-kbr-2026.json'),
];

const NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const RAD = Math.PI / 180;

// Расстояние по поверхности Земли, км.
function distanceKm(lat1, lng1, lat2, lng2) {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2
    + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lng2 - lng1) * RAD) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Покрывает ли таблица место. Если регион известен (геокодер или поиск
// города), решает он: график ДУМ КБР один на всю республику, а сразу за её
// границей — Ставрополье, Осетия, Ингушетия со своими управлениями, и круг
// их не отделяет: Пятигорск (76 км от Нальчика) и Беслан (81) ближе Терскола
// (94), а Назрань (97) ещё внутри круга в 100 км. Без региона — круг.
// Сравнения записаны так, что пустые координаты или забытый радиус дают «не
// покрывает», а не время Нальчика для любой точки мира.
function covers(place, { lat, lng, region }) {
  if (typeof region === 'string' && region.trim()) {
    const name = region.toLowerCase();
    return (place.regions || []).some((part) => name.includes(part));
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return distanceKm(lat, lng, place.lat, place.lng) <= place.radiusKm;
}

// Пояс устройства в полдень этой календарной даты. В день перевода часов
// смещение в полночь и в полдень разное, а строка таблицы одна на весь день.
function offsetOn(date) {
  return -new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTimezoneOffset();
}

// Номер строки для календарного дня устройства. Сутки считаем по UTC от
// полуночи, чтобы перевод часов не сдвигал счёт.
function dayIndex(start, date) {
  const [y, m, d] = start.split('-').map(Number);
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
}

/**
 * Время по официальному графику или null, если графика на эту дату и это
 * место нет.
 *
 * @param {string} authority чей график, например 'ru-kbr'
 * @param {{lat:number, lng:number, region?:string}} where место
 * @param {Date}   date      дата (местная)
 */
export function officialTimes(authority, where, date = new Date()) {
  const offset = offsetOn(date);
  for (const table of TABLES) {
    if (table.authority !== authority || table.utcOffset !== offset) continue;
    if (!covers(table.place || {}, where || {})) continue;
    const row = table.days[dayIndex(table.start, date)];
    if (!row) continue;
    const times = row.split(' ');
    return Object.fromEntries(NAMES.map((name, i) => [name, times[i]]));
  }
  return null;
}

// Короткий отпечаток текста (djb2): исправленная в таблице цифра меняет его.
function fingerprint(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Версия встроенных графиков. Входит в ключ кэша дней (prayerSchedule.js):
// с новой или исправленной таблицей пересчитываются и сохранённые дни.
export const TABLES_VERSION = TABLES
  .map((t) => `${t.authority}@${t.start}#${fingerprint(JSON.stringify([t.place, t.utcOffset, t.days]))}`)
  .join(',');
