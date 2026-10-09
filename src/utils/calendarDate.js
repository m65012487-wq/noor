export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function atTime(key, time) {
  if (!/^\d{2}:\d{2}$/.test(time || '')) return null;
  const [hour, minute] = time.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;
  const date = dateFromKey(key);
  date.setHours(hour, minute, 0, 0);
  return date;
}

// Минуты от полуночи для «ЧЧ:ММ»; null, если время не разобралось.
function minutesOfDay(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

// В какие сутки относительно строки дня наступает намаз: −1, 0 или +1.
//
// График записывает время по часам строки даты, но в высоких широтах ночь
// короткая, и сумерки почти не кончаются. ДУМ РТ в мае ставит Фаджр в строке
// даты D на 23:54 — по смыслу это вечер D−1, — а Иша у формулы dumCalc бывает
// после полуночи, то есть уже в D+1. Признак один: утренний намаз не может быть
// позже восхода, а вечерний — раньше магриба. Остальные времена остаются в D.
export function prayerDayShift(timings, name) {
  const at = minutesOfDay(timings?.[name]);
  if (at == null) return 0;
  if (name === 'Fajr') {
    const sunrise = minutesOfDay(timings.Sunrise);
    return sunrise != null && at > sunrise ? -1 : 0;
  }
  if (name === 'Isha') {
    const maghrib = minutesOfDay(timings.Maghrib);
    return maghrib != null && at < maghrib ? 1 : 0;
  }
  return 0;
}

// Момент намаза из строки дня `{ date, timings }`: Date с учётом сдвига суток
// или null, если время не разобралось. Событие, уведомление и окно будильника
// должны ставиться на него, а не на голую дату строки.
export function prayerMoment(day, name) {
  const time = day.timings?.[name];
  const shift = prayerDayShift(day.timings, name);
  if (!shift) return atTime(day.date, time);
  // Сутки сдвигаем в полдень: перевод часов не должен сбить дату.
  const date = dateFromKey(day.date);
  date.setDate(date.getDate() + shift);
  return atTime(localDateKey(date), time);
}
