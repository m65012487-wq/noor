// Фаза луны.
//
// Точность здесь нужна не астрономическая, а бытовая: показать, растёт луна
// или убывает, и насколько. Средний синодический месяц даёт расхождение с
// истинными новолуниями до полусуток — на глаз это доли процента диска.

const SYNODIC = 29.530588853;
// Новолуние 6 января 2000, 18:14 UTC — общепринятая точка отсчёта.
const NEW_MOON_JD = 2451550.09766;

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * @param {Date} date
 * @returns {{phase:number, illumination:number, waxing:boolean, age:number}}
 *   phase — 0 новолуние, 0.5 полнолуние, дальше к новолунию;
 *   illumination — освещённая доля диска, 0..1;
 *   age — возраст луны в сутках.
 */
export function moonPhase(date = new Date()) {
  const age = ((julianDay(date) - NEW_MOON_JD) % SYNODIC + SYNODIC) % SYNODIC;
  const phase = age / SYNODIC;
  return {
    phase,
    illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2,
    waxing: phase < 0.5,
    age,
  };
}

/**
 * Контур освещённой части диска.
 *
 * Терминатор — не прямая, а половина эллипса: мы видим круглую границу
 * света и тени под углом. Полуось эллипса равна |1 − 2k| от радиуса, где
 * k — освещённая доля; в четверть она обращается в ноль, и граница
 * становится прямой.
 *
 * Направления дуг подобраны так: серп выгнут наружу, горб — внутрь.
 * Перепутанные флаги дают «наоборот» — растущую луну, похожую на убывающую.
 */
export function litPath(cx, cy, r, phase) {
  const k = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const waxing = phase < 0.5;
  const gibbous = k > 0.5;
  const rx = Math.max(0.01, r * Math.abs(1 - 2 * k));
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = gibbous === waxing ? 1 : 0;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} `
    + `A ${rx.toFixed(2)} ${r} 0 0 ${innerSweep} ${cx} ${cy - r} Z`;
}

// Название фазы. Восемь ступеней — привычное деление лунного месяца.
export function phaseName(phase, lang = 'ru') {
  const i = Math.floor(((phase % 1) + 1 / 16) * 8) % 8;
  const ru = ['Новолуние', 'Растущий серп', 'Первая четверть', 'Растущая луна',
    'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Убывающий серп'];
  const en = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return (lang === 'ru' ? ru : en)[i];
}
