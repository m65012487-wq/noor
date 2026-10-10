// Ударный режим чтения и брони.
//
// Правило без брони уже было мягким: серия живёт, пока с прошлого дня с
// выполненной целью прошло не больше двух суток, то есть один пропущенный день
// прощается бесплатно. Бронь прощает ещё по одному дню сверх этого. Расходуется
// она не заранее, а в момент, когда серия иначе оборвалась бы: человек вернулся
// и выполнил цель, а за дни без чтения платят бронями, сколько их не хватило.
//
// Заработать бронь можно только серией: каждые 7 дней подряд — одна, не больше
// двух сразу. Покупать, копить впрок и дарить их нельзя — это страховка за
// ровное чтение, а не валюта.
export const FREE_GAP = 2;
export const FREEZE_MAX = 2;
export const FREEZE_EVERY = 7;

// Сколько суток серия ещё жива без чтения, с учётом броней.
export function aliveGap(freezes) {
  return FREE_GAP + Math.max(0, Math.min(FREEZE_MAX, Math.floor(freezes || 0)));
}

// Цель выполнена впервые за сегодня. gap — сколько суток прошло с прошлого
// выполненного дня (null, если такого не было).
// Возвращает новую серию, остаток броней, сколько потрачено и заработано.
export function advanceStreak({ streak, gap, freezes }) {
  const have = Math.max(0, Math.min(FREEZE_MAX, Math.floor(freezes || 0)));
  let next;
  let left = have;
  let used = 0;
  if (gap == null) next = 1;
  else if (gap <= FREE_GAP) next = streak + 1;
  else if (gap - FREE_GAP <= have) {
    used = gap - FREE_GAP;
    left = have - used;
    next = streak + 1;
  } else next = 1;
  let earned = 0;
  if (next > 1 && next % FREEZE_EVERY === 0 && left < FREEZE_MAX) {
    left += 1;
    earned = 1;
  }
  return { streak: next, freezes: left, used, earned };
}
