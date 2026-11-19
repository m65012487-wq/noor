import { localDateKey } from './calendarDate';

// Ударный режим чтения и брони.
//
// Остаток хранится на дату последней выполненной цели. Прошедшие
// пропуски вычитаются при отображении, а при новой цели фиксируются.
export const FREEZE_MAX = 2;
export const FREEZE_EVERY = 7;

// Сколько суток серия ещё жива без чтения, с учётом броней.
export function aliveGap(freezes) {
  return 1 + Math.max(0, Math.min(FREEZE_MAX, Math.floor(freezes || 0)));
}

export function streakStatus({ streak, gap, freezes }) {
  const have = aliveGap(freezes) - 1;
  const missed = Number.isFinite(gap) ? Math.max(0, gap - 1) : 0;
  const used = Math.min(have, missed);
  return { streak: Number.isFinite(gap) && missed <= have ? streak : 0, freezes: have - used, used };
}

export function consecutiveGoalDays(history, day) {
  const date = new Date(day + 'T12:00:00');
  let count = 0;
  while (history[localDateKey(date)]) {
    count += 1;
    date.setDate(date.getDate() - 1);
  }
  return count;
}

// Цель выполнена впервые за сегодня. gap — сколько суток прошло с прошлого
// выполненного дня (null, если такого не было).
// Возвращает новую серию, остаток броней, сколько потрачено и заработано.
export function advanceStreak({ streak, gap, freezes, consecutiveDays }) {
  const status = streakStatus({ streak, gap, freezes });
  const earned = consecutiveDays >= FREEZE_EVERY && consecutiveDays % FREEZE_EVERY === 0
    && status.freezes < FREEZE_MAX ? 1 : 0;
  return { streak: status.streak + 1, freezes: status.freezes + earned, used: status.used, earned };
}
