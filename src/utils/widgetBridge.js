import { ExtensionStorage } from '@bacons/apple-targets';
import { loadJSON, todayKey, daysAgoKey } from './helpers';

const APP_GROUP = 'group.95233b59e7e45aab.1';
let storage = null;
function shared() {
  if (!storage) storage = new ExtensionStorage(APP_GROUP);
  return storage;
}

export function publishPrayerDay({ days, order, label, city }) {
  try {
    const snapshot = days.map(day => ({
      date: day.date, city, timezone: day.timezone,
      times: order.map(key => ({ key, name: label(key), time: day.timings[key] })),
      nextKey: null,
    }));
    shared().set('prayerWindow:v2', JSON.stringify(snapshot));
    ExtensionStorage.reloadWidget();
    return true;
  } catch { return false; }
}

// Ударный режим для виджета: счётчик дней, последний день с выполненной целью,
// прочитано сегодня и сама цель, плюс выполненные дни последней недели. Виджет
// сам решает по своим часам, горит ли огонёк, сгорел ли он и не последний ли
// сегодня шанс: снимок может пролежать в контейнере до следующего открытия.
export async function publishStreak() {
  try {
    const [count, lastGoalDay, progress, goal, history] = await Promise.all([
      loadJSON('streakCount', 0), loadJSON('lastGoalDay', null), loadJSON('readProgress', {}),
      loadJSON('dailyGoal', 5), loadJSON('goalHistory', {}),
    ]);
    const today = todayKey();
    const week = [];
    for (let i = 0; i < 8; i += 1) {
      const key = daysAgoKey(i);
      if (history[key]) week.push(key);
    }
    shared().set('streak:v1', JSON.stringify({
      count, lastGoalDay, today, read: progress[today] || 0, goal, history: week,
    }));
    ExtensionStorage.reloadWidget();
    return true;
  } catch { return false; }
}

// Цвета схемы и язык: виджет красится так же, как приложение, — градиент фона
// и цвет силуэта на нём, — и говорит на языке приложения.
export function publishTheme({ bg, accent, lang }) {
  try {
    shared().set('theme:v1', JSON.stringify({ top: bg[0], bottom: bg[1], accent, lang }));
    ExtensionStorage.reloadWidget();
    return true;
  } catch { return false; }
}
