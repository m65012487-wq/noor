// Официальные графики намаза — таблицы, которые публикует само духовное
// управление. Пока дата и место покрыты таблицей, время берётся из неё;
// для остальных дат и мест остаётся запасной способ управления (prayerSource.js).
//
// Зачем таблица, если есть формула (dumCalc.js). График ДУМ КБР сглажен
// вручную, и гладкая формула повторяет его лишь до трёх минут: в октябре
// 2026 Аср по формуле на 1–3 минуты позже графика, Иша — на минуту. Мечети
// встают по графику, поэтому до минуты с ними совпадает только он сам.
//
// Откуда берутся данные:
//   встроенные — assets/prayer-tables/: index.json (снимок списка управлений)
//                и сами таблицы, перечисленные в BUILTIN_TABLES ниже;
//   с сервера  — noor-times, формат описан в его FORMAT.md. timesServer.js
//                скачивает свежий индекс и таблицы и ставит их сюда через
//                installIndex и installTables.
// Установленное заменяет встроенное: управление — по id, таблица — по тройке
// управление + пункт + год. Без сервера приложение живёт на встроенном.
//
// Индекс перечисляет управления. Код читает из них:
//   id, name, name_en, country (ISO-2), source, fallback, utcOffset;
//   regions — части названия региона в нижнем регистре. Пустой список —
//             управление на всю страну country;
//   places  — пункты, для которых есть графики: id, name, lat, lng, radiusKm
//             (охват, когда регион места неизвестен) и tables (год, путь, hash).
// Незнакомые поля пропускаются: формат может расти без смены версии.
//
// Файл таблицы (assets/prayer-tables/*.json, <управление>/<пункт>/<год>.json):
//   authority — id управления;
//   place     — пункт: id и, чтобы таблица была самодостаточной, копия
//               regions, lat, lng, radiusKm;
//   utcOffset — пояс графика в минутах. Если на устройстве в этот день другой
//               пояс, времена таблицы не годятся и считает запасной способ;
//   start     — дата первой строки, дальше строки идут подряд по дням;
//   days      — строки «Фаджр Восход Зухр Аср Магриб Иша».
// Поля title, source и place.name — справка для людей, код их не читает.
//
// Новая встроенная таблица — это файл в assets/prayer-tables/, строка require
// ниже и запись о пункте в index.json: Metro не собирает папку целиком, а
// таблица, которой нет в индексе, недостижима. Любая из забытых вещей тихо
// отдала бы время формуле, поэтому за ними следит тест.
const BUILTIN_INDEX = require('../../assets/prayer-tables/index.json');
const BUILTIN_TABLES = [
  require('../../assets/prayer-tables/ru-kbr-2026.json'),
];

const NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const RAD = Math.PI / 180;
const CLOCK = /^\d{2}:\d{2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Охват: управление и пункт ----------

// Расстояние по поверхности Земли, км.
function distanceKm(lat1, lng1, lat2, lng2) {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2
    + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lng2 - lng1) * RAD) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Части названия региона у управления. Пустая часть совпала бы с любым
// регионом, поэтому отбрасывается; если не осталось ни одной — управление
// считается страновым.
function regionParts(authority) {
  return (authority.regions || []).map((part) => String(part).trim().toLowerCase()).filter(Boolean);
}

const countryOf = (value) => (typeof value === 'string' ? value.trim().toUpperCase() : '');

// Пункты, чей круг накрывает место. Сравнения записаны так, что пустые
// координаты или забытый радиус дают «не покрывает», а не время Нальчика для
// любой точки мира.
function inCircle(places, { lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  return places.filter((place) => distanceKm(lat, lng, place.lat, place.lng) <= place.radiusKm);
}

// Покрывает ли управление место и какие его пункты в этом участвуют, или null.
//   region  — регион места известен (геокодер или поиск города): решает он.
//             График ДУМ КБР один на всю республику, а сразу за её границей —
//             Ставрополье, Осетия, Ингушетия со своими управлениями, и круг их
//             не отделяет: Пятигорск (76 км от Нальчика) и Беслан (81) ближе
//             Терскола (94), а Назрань (97) ещё внутри круга в 100 км;
//   country — управление на всю страну (regions пуст): решает страна места,
//             а если она неизвестна — круг, как без региона;
//   circle  — региона нет: круг radiusKm вокруг любого пункта.
function coverage(authority, where) {
  const places = authority.places || [];
  const parts = regionParts(authority);
  if (parts.length) {
    const region = typeof where.region === 'string' ? where.region.trim().toLowerCase() : '';
    if (region) return parts.some((part) => region.includes(part)) ? { mode: 'region', places } : null;
  } else {
    const have = countryOf(where.country);
    const want = countryOf(authority.country);
    if (have && want) return have === want ? { mode: 'country', places } : null;
  }
  const near = inCircle(places, where);
  return near.length ? { mode: 'circle', places: near } : null;
}

// Ближайший к месту пункт. Без координат места выбирать не из чего, и берётся
// первый: такое бывает у управления с одним пунктом.
function nearest(places, { lat, lng }) {
  let best = null;
  let bestKm = Infinity;
  for (const place of places) {
    const km = distanceKm(lat, lng, place.lat, place.lng);
    if (km < bestKm) { best = place; bestKm = km; }
  }
  return { place: best || places[0] || null, km: bestKm };
}

// ---------- Реестр: встроенное и установленное ----------

// Таблица годится, если по ней можно найти строку. Проверка нужна не
// встроенным (их проверяет тест), а скачанным: битая таблица с сервера не
// должна ронять расчёт времён.
export function isValidTable(table) {
  return !!table && typeof table === 'object'
    && typeof table.authority === 'string' && table.authority !== ''
    && !!table.place && typeof table.place.id === 'string' && table.place.id !== ''
    && Number.isFinite(table.utcOffset)
    && typeof table.start === 'string' && ISO_DATE.test(table.start)
    && Array.isArray(table.days);
}

const tableYear = (table) => Number(table.start.slice(0, 4));
const tableKey = (authority, placeId, year) => `${authority}/${placeId}/${year}`;

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

// Пункт из индекса или null, если у него нет того, без чего его не выбрать:
// id, координат и радиуса. Пункт без списка таблиц получает пустой.
function normalizePlace(place) {
  if (!isObject(place) || typeof place.id !== 'string' || place.id === ''
    || !Number.isFinite(place.lat) || !Number.isFinite(place.lng) || !Number.isFinite(place.radiusKm)) return null;
  const tables = place.tables === undefined ? [] : place.tables;
  if (!Array.isArray(tables)) return null;
  return { ...place, tables: tables.filter(isObject) };
}

// Управление из индекса в том виде, с каким умеет работать остальной код, или
// null. Индекс приходит с сервера, и одна кривая запись (regions строкой,
// places не массивом) не вправе уронить расчёт времён у всех: регионы,
// которых нет, превратили бы управление в страновое, поэтому такую запись
// отбрасываем целиком, а плохой пункт — отдельно. Запасной способ не объект —
// значит его нет.
function normalizeAuthority(authority) {
  if (!isObject(authority) || typeof authority.id !== 'string' || authority.id === '') return null;
  if (!Array.isArray(authority.regions) || !authority.regions.every((part) => typeof part === 'string')) return null;
  if (!Array.isArray(authority.places)) return null;
  return {
    ...authority,
    country: typeof authority.country === 'string' ? authority.country : '',
    fallback: isObject(authority.fallback) ? authority.fallback : null,
    places: authority.places.map(normalizePlace).filter(Boolean),
  };
}

const BUILTIN_AUTHORITIES = BUILTIN_INDEX.authorities.map(normalizeAuthority).filter(Boolean);
let installedAuthorities = []; // управления из индекса с сервера (уже проверенные)
const installedTables = new Map(); // ключ таблицы -> таблица
const listeners = new Set();
let cache = null; // свёртка встроенного и установленного, сбрасывается установкой

function state() {
  if (cache) return cache;
  const tables = new Map();
  for (const table of BUILTIN_TABLES) {
    if (isValidTable(table)) tables.set(tableKey(table.authority, table.place.id, tableYear(table)), table);
  }
  for (const [key, table] of installedTables) tables.set(key, table);
  const byId = new Map();
  for (const authority of [...BUILTIN_AUTHORITIES, ...installedAuthorities]) byId.set(authority.id, authority);
  cache = { tables, authorities: [...byId.values()], version: null };
  return cache;
}

// Короткий отпечаток текста (djb2): исправленная в таблице цифра меняет его.
function fingerprint(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * Версия графиков: отпечаток всех встроенных и установленных таблиц и тех
 * свойств управлений, от которых зависит результат (регионы, страна, пояс,
 * запасной способ, пункты). Названия и время выпуска индекса в неё не входят:
 * они времён не меняют, а пересчёт сохранённых дней стоит сети.
 *
 * Входит в ключ кэша дней (prayerSchedule.js): с новой или исправленной
 * таблицей пересчитываются и сохранённые дни. Порядок установки на версию не
 * влияет, иначе она менялась бы от запуска к запуску.
 */
export function tablesVersion() {
  const current = state();
  if (current.version === null) {
    const parts = [];
    for (const [key, table] of current.tables) {
      parts.push(`${key}@${table.start}#${fingerprint(JSON.stringify([table.place, table.utcOffset, table.days]))}`);
    }
    for (const a of current.authorities) {
      const places = (a.places || []).map((p) => [p.id, p.lat, p.lng, p.radiusKm]);
      parts.push(`${a.id}~${fingerprint(JSON.stringify([a.country, a.regions, a.utcOffset, a.fallback, places]))}`);
    }
    current.version = fingerprint(parts.sort().join(','));
  }
  return current.version;
}

let batchDepth = 0;
let batchBefore = null;

function notifyIfChanged(before) {
  if (tablesVersion() === before) return;
  for (const listener of [...listeners]) {
    try { listener(); } catch { /* подписчик не должен срывать установку */ }
  }
}

// Установка меняет реестр и, если версия из-за этого сменилась, будит
// подписчиков. Повторная установка того же ничего не сообщает. Внутри
// batchInstall будят один раз, по выходу.
function commit(change) {
  if (batchDepth > 0) {
    change();
    cache = null;
    return;
  }
  const before = tablesVersion();
  change();
  cache = null;
  notifyIfChanged(before);
}

/**
 * Выполнить установки как одну: подписчиков будят один раз по окончании, а не
 * после индекса и ещё раз после таблиц, иначе экран пересчитывал бы времена
 * дважды. Состояние меняется сразу, так что внутри уже видно новое. Работа
 * может быть асинхронной; будят и при её ошибке, если что-то успело встать.
 */
export async function batchInstall(work) {
  if (batchDepth === 0) batchBefore = tablesVersion();
  batchDepth += 1;
  try {
    return await work();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) notifyIfChanged(batchBefore);
  }
}

/**
 * Подписка на смену версии графиков. Возвращает функцию отписки.
 * Хук для экранов — useTablesVersion в useOfficialTables.js.
 */
export function subscribeTables(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Поставить таблицы (с сервера или из хранилища). Одинаковые управление,
 * пункт и год: установленная заменяет встроенную и прежнюю установленную.
 * Негодные таблицы пропускаются. Возвращает, сколько таблиц принято.
 */
export function installTables(tables) {
  const good = (Array.isArray(tables) ? tables : [tables]).filter(isValidTable);
  if (good.length) {
    commit(() => {
      for (const table of good) installedTables.set(tableKey(table.authority, table.place.id, tableYear(table)), table);
    });
  }
  return good.length;
}

/**
 * Поставить индекс с сервера. Он дополняет встроенный снимок и заменяет в нём
 * управления с тем же id; прежний установленный индекс отбрасывается целиком:
 * свежий всегда полный. Чужой версии формата и мусор не принимаются.
 */
export function installIndex(index) {
  if (!isObject(index) || index.v !== 1 || !Array.isArray(index.authorities)) return false;
  // Сначала проверяем, потом меняем: негодная запись состояния не трогает.
  const authorities = index.authorities.map(normalizeAuthority).filter(Boolean);
  commit(() => { installedAuthorities = authorities; });
  return true;
}

// ---------- Вопросы к реестру ----------

/**
 * Управление для места или null.
 *
 * Регион, если он известен, иначе круг пункта; управление на всю страну
 * подходит месту своей страны. Подошло несколько — побеждает то, что названо
 * по региону или кругу, а не по стране, а среди равных ближайшее.
 *
 * @param {{lat?:number, lng?:number, region?:string, country?:string}} where
 * @returns {object|null} запись управления из индекса
 */
export function resolveAuthority(where) {
  const here = where || {};
  let best = null;
  for (const authority of state().authorities) {
    const found = coverage(authority, here);
    if (!found) continue;
    const rank = found.mode === 'country' ? 1 : 0;
    const km = nearest(found.places, here).km;
    if (!best || rank < best.rank || (rank === best.rank && km < best.km)) best = { authority, rank, km };
  }
  return best ? best.authority : null;
}

/**
 * Ближайший к месту пункт управления или null, если пункта нет.
 *
 * Выбранному по региону управлению (у ДУМ КБР один пункт на республику,
 * Терскол от него в 94 км) достаётся ближайший пункт без ограничения радиусом.
 * Управлению на всю страну (Казахстан — два десятка городов, Сингапур — один)
 * ближайший пункт годится, только если место не дальше его radiusKm: иначе
 * таблицы нет и работает метод управления, а не время города за 300 км. Пункт
 * берётся один: чужую таблицу «по соседству» лучше не брать, сотня километров
 * по долготе это уже минуты.
 */
export function resolvePlace(authority, where) {
  if (!authority) return null;
  const here = where || {};
  const found = coverage(authority, here);
  if (!found) return null;
  const { place, km } = nearest(found.places, here);
  // km бесконечен без координат места: проверить радиус нечем, значит не покрывает.
  if (found.mode === 'country' && !(km <= place?.radiusKm)) return null;
  return place;
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

// Тот же день прошлого года; 29 февраля берёт 28-е. В полдень, как и всё
// остальное, чтобы перевод часов не сдвинул дату.
function sameDayLastYear(date) {
  const day = date.getMonth() === 1 && date.getDate() === 29 ? 28 : date.getDate();
  return new Date(date.getFullYear() - 1, date.getMonth(), day, 12);
}

// Времена из строки таблицы на этот день или null: строки нет за пределами
// таблицы, а строку с сервера на всякий случай проверяем по виду.
function rowTimes(table, date) {
  const row = table.days[dayIndex(table.start, date)];
  if (typeof row !== 'string') return null;
  const parts = row.split(' ');
  if (!NAMES.every((_, i) => CLOCK.test(parts[i] || ''))) return null;
  return Object.fromEntries(NAMES.map((name, i) => [name, parts[i]]));
}

/**
 * Времена по официальному графику с пометкой, откуда они, или null, если
 * графика на эту дату и это место нет.
 *
 * Строка берётся из таблицы ближайшего пункта за год даты. Нет такой таблицы
 * (или она эту дату не накрывает, как встроенная на октябрь–декабрь) —
 * берётся та же дата прошлогодней: расхождение не больше минуты-двух.
 * Прошлогодняя помечается approximate.
 *
 * @param {string} authorityId чей график, например 'ru-kbr'
 * @param {{lat?:number, lng?:number, region?:string, country?:string}} where место
 * @param {Date}   date        дата (местная)
 * @returns {{times:object, year:number, approximate:boolean}|null}
 *   year — год таблицы, из которой взята строка
 */
export function officialTimesInfo(authorityId, where, date = new Date()) {
  const authority = state().authorities.find((a) => a.id === authorityId);
  const place = resolvePlace(authority, where);
  if (!place) return null;
  const offset = offsetOn(date);
  const year = date.getFullYear();
  for (const [y, day] of [[year, date], [year - 1, sameDayLastYear(date)]]) {
    const table = state().tables.get(tableKey(authority.id, place.id, y));
    if (!table || table.utcOffset !== offset) continue;
    const times = rowTimes(table, day);
    if (times) return { times, year: y, approximate: y !== year };
  }
  return null;
}

/**
 * Время по официальному графику или null, если графика на эту дату и это
 * место нет.
 *
 * @param {string} authorityId чей график, например 'ru-kbr'
 * @param {{lat?:number, lng?:number, region?:string, country?:string}} where место
 * @param {Date}   date        дата (местная)
 */
export function officialTimes(authorityId, where, date = new Date()) {
  return officialTimesInfo(authorityId, where, date)?.times ?? null;
}
