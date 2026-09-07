// Расчёт времён намаза по методу ДУМ Кабардино-Балкарии.
//
// Метод восстановлен по официальным графикам ДУМ КБР (dumkbr.ru) за июнь,
// сентябрь и декабрь 2026 года — 91 день, три сезона. Проверка на этих же
// днях приведена в комментариях к каждому времени.
//
// Почему не библиотека adhan, которая уже есть в проекте: её модель — «угол
// плюс постоянный сдвиг», а у ДУМ угол ограничен по времени. В сентябре и
// декабре Фаджр стоит ровно за 90 минут до восхода независимо от того, что
// даёт угол, а в июне — за 106–109 минут, когда угол даёт больше. Ограничение
// снизу такой моделью не выражается, поэтому солнечная часть считается здесь.
//
// Прежняя реализация брала Фаджр 16° и Ишу 15° с постоянными сдвигами и в
// комментарии утверждала, что совпадает с графиком ДУМ КБР до минуты. Это
// было неправдой: на 7 сентября 2026 она давала Ишу 19:55 против официальных
// 20:16 — на 22 минуты раньше срока.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Юлианская дата полуночи UTC.
function julianDay(y, m, d) {
  let yy = y;
  let mm = m;
  if (mm <= 2) { yy -= 1; mm += 12; }
  const a = Math.floor(yy / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + b - 1524.5;
}

// Склонение солнца и уравнение времени (минуты) — алгоритм NOAA.
function solarPosition(jd) {
  const t = (jd - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c = Math.sin(m * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * t)
    + Math.sin(3 * m * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eot = 4 * DEG * (y * Math.sin(2 * l0 * RAD) - 2 * e * Math.sin(m * RAD)
    + 4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD)
    - 0.5 * y * y * Math.sin(4 * l0 * RAD) - 1.25 * e * e * Math.sin(2 * m * RAD));
  return { decl, eot };
}

// Полдень по солнцу, в минутах от местной полуночи.
function solarNoon(jd, lng, tzOffsetMin) {
  const { eot } = solarPosition(jd + 0.5);
  return 720 - 4 * lng - eot + tzOffsetMin;
}

// Полуинтервал между полуднем и моментом, когда солнце на заданной высоте.
// null — если такой высоты в этот день не бывает (полярное лето или зима).
function halfDay(jd, lat, alt) {
  const { decl } = solarPosition(jd + 0.5);
  const cosH = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * Math.sin(decl * RAD))
    / (Math.cos(lat * RAD) * Math.cos(decl * RAD));
  if (cosH > 1 || cosH < -1) return null;
  return Math.acos(cosH) * DEG * 4;
}

// Параметры метода. Каждое число — результат подгонки по 91 дню официального
// графика, а не выбор на глаз.
const DUM = {
  // Фаджр: угол 15°, но не позже чем за 90 минут до восхода.
  // Совпадение с графиком: 91 из 91 дня в пределах минуты.
  fajrAngle: 15,
  fajrMinBeforeSunrise: 90,
  // Зухр: солнечный полдень плюс запас. 91 из 91 в пределах минуты.
  dhuhrOffset: 10,
  // Аср: шафиитский счёт (тень равна предмету) плюс запас. Ханафитский счёт
  // мимо на три четверти часа — в графике ДУМ КБР он не используется.
  //
  // Коэффициент 0.99 вместо ровной единицы — подгонка, а не принцип: при
  // единице совпадение 53 дня из 91, при 0.99 — 62. Похоже, у ДУМ Аср считают
  // чуть иначе, и эта сотая впитывает разницу.
  asrShadow: 0.99,
  asrOffset: 10,
  // Магриб: закат плюс запас.
  maghribOffset: 2,
  // Иша: угол 15.25° с ограничением снизу и сверху — от 103 до 112 минут
  // после заката. Оба ограничения работают: зимой держится нижнее, в июне
  // верхнее, в сентябре расчёт переходит от одного к другому.
  ishaAngle: 15.25,
  ishaMinAfterSunset: 103,
  ishaMaxAfterSunset: 112,
};

/**
 * Времена намаза по методу ДУМ КБР.
 *
 * @param {number} lat  широта
 * @param {number} lng  долгота
 * @param {Date}   date дата (местная)
 * @returns {{Fajr:string,Sunrise:string,Dhuhr:string,Asr:string,Maghrib:string,Isha:string}}
 */
export function computeDumKbr(lat, lng, date = new Date()) {
  const jd = julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  // Смещение пояса берём у самой даты: так расчёт переживает перевод часов
  // и работает в любом городе без списка поясов.
  const tzOffsetMin = -date.getTimezoneOffset();
  const noon = solarNoon(jd, lng, tzOffsetMin);

  const hDay = halfDay(jd, lat, -0.833);
  // Полярный день или ночь: восхода нет, и угловые времена не определены.
  // Возвращаем прочерки, а не выдуманные числа.
  if (hDay == null) {
    return {
      Fajr: '--:--', Sunrise: '--:--', Dhuhr: fmt(noon),
      Asr: '--:--', Maghrib: '--:--', Isha: '--:--',
    };
  }
  const sunrise = noon - hDay;
  const sunset = noon + hDay;

  const hFajr = halfDay(jd, lat, -DUM.fajrAngle);
  const fajrByAngle = hFajr == null ? Infinity : noon - hFajr;
  const fajr = Math.min(fajrByAngle, sunrise - DUM.fajrMinBeforeSunrise);

  const { decl } = solarPosition(jd + 0.5);
  const asrAlt = Math.atan(1 / (DUM.asrShadow + Math.tan(Math.abs(lat - decl) * RAD))) * DEG;
  const hAsr = halfDay(jd, lat, asrAlt);
  const asr = hAsr == null ? sunset : noon + hAsr + DUM.asrOffset;

  const hIsha = halfDay(jd, lat, -DUM.ishaAngle);
  const ishaByAngle = hIsha == null ? Infinity : noon + hIsha;
  const isha = Math.min(
    Math.max(ishaByAngle, sunset + DUM.ishaMinAfterSunset),
    sunset + DUM.ishaMaxAfterSunset,
  );

  return {
    Fajr: fmt(fajr),
    Sunrise: fmt(sunrise),
    Dhuhr: fmt(noon + DUM.dhuhrOffset),
    Asr: fmt(asr),
    Maghrib: fmt(sunset + DUM.maghribOffset),
    Isha: fmt(isha),
  };
}

// Минуты от полуночи -> "ЧЧ:ММ". Сутки замыкаются: Иша в высоких широтах
// может уехать за полночь.
function fmt(minutes) {
  const m = Math.round(((minutes % 1440) + 1440) % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export const DUM_PARAMS = DUM;
