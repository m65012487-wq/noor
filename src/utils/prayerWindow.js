import { prayerMoment } from './calendarDate';

// Окно «после намаза»: первые минуты после любого из пяти намазов. Время дня
// знает экран намаза, а счёту тасбиха оно нужно без своего расчёта и без
// сети, поэтому экран кладёт сюда последнее окно дней, а тасбих только
// спрашивает, не идёт ли сейчас такое окно. Пока дни не пришли, окна нет.
//
// Восход не считается: это не намаз, и азкары после него не принято.
const NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

let current = [];

export function setPrayerDays(days) {
  current = Array.isArray(days) ? days : [];
}

export function afterPrayerNow(now = new Date(), minutes = 30, days = current) {
  const span = minutes * 60000;
  // Окно спрашивают прямо при отрисовке экрана и на каждое нажатие, поэтому
  // испорченный день в графике не должен ронять тасбих: тогда окна просто нет.
  try {
    for (const day of days) {
      for (const name of NAMES) {
        const at = prayerMoment(day, name);
        if (at && now >= at && now - at <= span) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}
