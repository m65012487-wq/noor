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

// Пятница по исламскому счёту суток: от магриба четверга до магриба пятницы.
// В это время сура аль-Кахф уже читается, и праздничный вид включается вместе
// с ней. Пока графика нет (или он испорчен), считаем обычную календарную пятницу.
export function maghribOf(date, days = current) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const day = days.find(d => d && d.date === key);
  if (!day) return null;
  try { return prayerMoment(day, 'Maghrib'); } catch { return null; }
}

export function isFridayNow(now = new Date(), days = current) {
  const weekday = now.getDay();
  if (weekday !== 4 && weekday !== 5) return false;
  const maghrib = maghribOf(now, days);
  if (weekday === 5) return maghrib ? now < maghrib : true;
  return maghrib ? now >= maghrib : false;
}

// Дата-ключ пятницы, к которой относится момент (для учёта чтения Аль-Кахф):
// вечер четверга после магриба — это уже ночь той же пятницы.
export function fridayKey(now = new Date()) {
  const d = new Date(now);
  if (d.getDay() === 4) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
