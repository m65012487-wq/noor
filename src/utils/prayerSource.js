// Unified prayer-times provider.
// Sources: 'auto' (official timetable of the muftiate of the place, else the
//          muftiate's own fallback, else the method of the country),
//          'russia' (DUM KBR: timetable or formula), international methods via
//          Aladhan, 'local' (offline adhan calc).
// Always falls back to local offline calc if the network fails.
import { computePrayerTimes } from './prayerCalc';
import { computeDumKbr } from './dumCalc';
import { officialTimes, officialTimesInfo, resolveAuthority, resolvePlace } from './officialTables';
import { methodForCountry, localMethodFor } from '../constants/countryMethods';

const ALADHAN = 'https://api.aladhan.com/v1/timings';

function applyTune(times, tune) {
  if (!tune) return times;
  const out = {};
  for (const k of Object.keys(times)) {
    const [h, m] = times[k].split(':').map(Number);
    const d = new Date(); d.setHours(h, m + (tune[k] || 0), 0, 0);
    out[k] = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return out;
}

// ДУМ КБР: официальный график, пока дата и место им покрыты, иначе формула.
// Формула восстановлена по графикам за три сезона и расходится с ними до трёх
// минут; до минуты с мечетями совпадает только сам график (officialTables.js).
// region и country — место из LocationContext. Графики берутся из общего
// реестра, поэтому таблицу КБР с сервера (например, на 2027) этот источник
// видит так же, как встроенную.
function dumKbrTimes(lat, lng, region, country, date) {
  return officialTimes('ru-kbr', { lat, lng, region, country }, date) || computeDumKbr(lat, lng, date);
}

// Map our internal method ids -> Aladhan numeric method.
const ALADHAN_METHOD = {
  mwl: 3, isna: 2, egypt: 5, makkah: 4, karachi: 1, dubai: 8, kuwait: 9,
  qatar: 10, turkey: 13, tehran: 7, singapore: 11, moonsighting: 15, russia: 14,
};

async function fetchAladhan(lat, lng, methodNum, school, date = new Date()) {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  const tzp = tz ? `&timezonestring=${encodeURIComponent(tz)}` : '';
  const schoolNum = school === 'hanafi' ? 1 : 0;
  const day = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  const url = `${ALADHAN}/${day}?latitude=${lat}&longitude=${lng}&method=${methodNum}&school=${schoolNum}${tzp}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res;
  try { res = await fetch(url, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
  if (!res.ok) throw new Error('aladhan http ' + res.status);
  const j = await res.json();
  const t = j.data.timings;
  return Object.fromEntries(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(name => {
    const time = t[name]?.match(/^\d{2}:\d{2}/)?.[0];
    if (!time) throw new Error('Invalid time from provider');
    return [name, time];
  }));
}

// Detect if the user is in Russia (by timezone) for the 'auto' source.
function isRussia() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return tz.startsWith('Europe/Mosc') || tz.startsWith('Europe/Kaliningrad') ||
      tz.startsWith('Asia/Yekaterinburg') || tz.startsWith('Asia/Novosibirsk') ||
      tz.startsWith('Asia/Krasnoyarsk') || tz.startsWith('Asia/Irkutsk') ||
      tz.startsWith('Asia/Vladivostok') || tz.startsWith('Asia/Omsk') ||
      tz.startsWith('Asia/Yakutsk') || tz.startsWith('Asia/Magadan') ||
      tz.startsWith('Europe/Samara') || tz.startsWith('Asia/Barnaul');
  } catch { return false; }
}

// Available time sources the user can pick explicitly.
// Each maps to a fetcher. «Авто» первой: это выбор по умолчанию, и список
// в настройках читается сверху вниз. Её method пуст — она сама решает, чем
// считать (planAuto); у остальных method — номер метода Aladhan.
export const TIME_SOURCES = [
  { id: 'auto', label_en: "Auto: your region’s muftiate", label_ru: 'Авто: ДУМ вашего региона', method: null },
  { id: 'mwl_intl', label_en: 'Muslim World League (Intl.)', label_ru: 'Лига исламского мира (межд.)', method: 3 },
  { id: 'russia', label_en: 'Caucasus (DUM KBR)', label_ru: 'Кавказ (ДУМ КБР)', method: 14 },
  { id: 'turkey', label_en: 'Turkey (Diyanet)', label_ru: 'Турция (Диянет)', method: 13 },
  { id: 'egypt', label_en: 'Egyptian Authority', label_ru: 'Египетская организация', method: 5 },
  { id: 'makkah', label_en: 'Umm al-Qura (Makkah)', label_ru: 'Умм аль-Кура (Мекка)', method: 4 },
  { id: 'karachi', label_en: 'Karachi', label_ru: 'Карачи', method: 1 },
  { id: 'isna', label_en: 'ISNA (N. America)', label_ru: 'ISNA (Сев. Америка)', method: 2 },
  { id: 'local', label_en: 'Offline (device calc)', label_ru: 'Офлайн (на устройстве)', method: null },
];

const asSchool = (value, fallback) => (value === 'hanafi' || value === 'shafi' ? value : fallback);

// «Авто»: чем считать время в этом месте на эту дату. Один выбор на все пути
// (с сетью, без сети, описание для настроек), чтобы они не разошлись.
//
//   table / previousYear — таблица управления места, этого или прошлого года;
//   fallback — таблицы на дату нет, считает запасной способ управления:
//              формула ДУМ КБР или метод Aladhan, мазхаб Асра из записи
//              управления, а если он не назван — настройка пользователя;
//   country  — управления нет (или запасной способ неизвестен этой версии
//              приложения): метод по стране, мазхаб — настройка пользователя.
//
// Результат: либо готовые times, либо aladhan (номер метода) с local (его
// двойник для расчёта без сети) и school.
function planAuto({ lat, lng, region, country, school }, date) {
  const where = { lat, lng, region, country };
  let authority = null;
  try {
    authority = resolveAuthority(where);
    if (authority) {
      const place = resolvePlace(authority, where);
      const info = officialTimesInfo(authority.id, where, date);
      if (info) {
        return { mode: info.approximate ? 'previousYear' : 'table', authority, place, year: info.year, times: info.times };
      }
      const fb = authority.fallback;
      if (fb?.kind === 'dumKbr') {
        return { mode: 'fallback', authority, place, year: null, times: computeDumKbr(lat, lng, date), method: { kind: 'dumKbr' } };
      }
      const number = Number(fb?.method);
      if (fb?.kind === 'aladhan' && Number.isInteger(number) && number >= 0) {
        const hanafiOrShafi = asSchool(fb.school, school);
        return { mode: 'fallback', authority, place, year: null, aladhan: number, local: localMethodFor(number),
          school: hanafiOrShafi, method: { kind: 'aladhan', method: number, school: asSchool(fb.school, null) } };
      }
    }
  } catch {
    // Данные управлений пришли с сервера: что бы в них ни было, время намаза
    // считается дальше по методу страны, а не остаётся ошибкой на экране.
    authority = null;
  }
  const { aladhan, local } = methodForCountry(country);
  return { mode: 'country', authority, place: null, year: null, aladhan, local, school,
    method: { kind: 'aladhan', method: aladhan, school: null } };
}

/**
 * Что сейчас стоит за источником «Авто» — для экрана настроек.
 *
 * @param {{lat?:number, lng?:number, region?:string, country?:string}} where место
 * @param {Date} [date] день, для которого спрашиваем
 * @returns {{
 *   mode: 'table'|'previousYear'|'fallback'|'country',
 *   year: number|null,
 *   authorityId: string|null, authorityName: string|null, authorityNameEn: string|null,
 *   placeName: string|null, source: string|null,
 *   method: null|{kind:'dumKbr'}|{kind:'aladhan', method:number, school:string|null},
 * }}
 *   table        — время из таблицы управления за этот год (year);
 *   previousYear — таблицы этого года ещё нет, взята та же дата прошлого (year);
 *   fallback     — таблицы на дату нет, считает запасной способ управления (method);
 *   country      — управления нет или у него нет годного запасного способа:
 *                  метод страны (method); authority* заполнены, если управление
 *                  определилось, иначе null.
 *   school в method — мазхаб, который назвало управление; null — решает настройка.
 */
export function describeAutoSource(where, date = new Date()) {
  const plan = planAuto({ ...where }, date);
  const a = plan.authority;
  return {
    mode: plan.mode,
    year: plan.year,
    authorityId: a ? a.id : null,
    authorityName: a ? a.name || a.id : null,
    authorityNameEn: a ? a.name_en || a.name || a.id : null,
    placeName: plan.place ? plan.place.name || plan.place.id : null,
    source: a ? a.source || null : null,
    method: plan.mode === 'table' || plan.mode === 'previousYear' ? null : plan.method,
  };
}

export function getPrayerTimes2({ lat, lng, region, country, sourceId = 'mwl_intl', school = 'shafi', tune = null, date = new Date(), onFallback }) {
  // Неизвестный id — по-прежнему «Лига исламского мира», а не первая строка списка.
  const src = TIME_SOURCES.find((s) => s.id === sourceId) || TIME_SOURCES.find((s) => s.id === 'mwl_intl');
  // ДУМ КБР: считаем на устройстве. Aladhan с его методом 14 «ДУМ РФ» здесь
  // не помощник: на 7 сентября 2026 он даёт Ишу 19:52 против официальных 20:16.
  if (sourceId === 'russia') {
    return Promise.resolve(applyTune(dumKbrTimes(lat, lng, region, country, date), tune));
  }
  if (sourceId === 'auto') {
    const plan = planAuto({ lat, lng, region, country, school }, date);
    if (plan.times) return Promise.resolve(applyTune(plan.times, tune));
    return fetchAladhan(lat, lng, plan.aladhan, plan.school, date)
      .then((t) => applyTune(t, tune))
      .catch(() => {
        onFallback?.();
        return computePrayerTimes(lat, lng, plan.local, plan.school, date, tune);
      });
  }
  if (src.method == null) {
    // local offline
    return Promise.resolve(localTimesForDate({ lat, lng, sourceId, school, tune, date }));
  }
  return fetchAladhan(lat, lng, src.method, school, date)
    .then((t) => applyTune(t, tune))
    .catch(() => {
      onFallback?.();
      return localTimesForDate({ lat, lng, sourceId, school, tune, date });
    });
}

// Локальные времена на произвольную дату — синхронно и без сети.
//
// getPrayerTimes2 считает только на сегодня и для части источников ходит
// в Aladhan. Планировщику уведомлений это не подходит: расписание ставится
// на несколько дней вперёд и должно работать в самолётном режиме.
// Поэтому здесь считается без сети: для «ДУМ КБР» — официальный график или
// формула dumCalc, для «Авто» — график управления, его формула либо локальный
// двойник метода, для остальных источников — локальный расчёт adhan, тот же,
// что служит запасным вариантом при отказе сети.
const LOCAL_METHOD = {
  mwl_intl: 'mwl', turkey: 'turkey', egypt: 'egypt', makkah: 'makkah',
  karachi: 'karachi', isna: 'isna', local: 'mwl',
};

export function localTimesForDate({ lat, lng, region, country, sourceId = 'mwl_intl', school = 'shafi', tune = null, date = new Date() }) {
  if (sourceId === 'russia') {
    return applyTune(dumKbrTimes(lat, lng, region, country, date), tune);
  }
  if (sourceId === 'auto') {
    const plan = planAuto({ lat, lng, region, country, school }, date);
    return plan.times ? applyTune(plan.times, tune) : computePrayerTimes(lat, lng, plan.local, plan.school, date, tune);
  }
  const methodId = LOCAL_METHOD[sourceId] || 'mwl';
  return computePrayerTimes(lat, lng, methodId, school, date, tune);
}
