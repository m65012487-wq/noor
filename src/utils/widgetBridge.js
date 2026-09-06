// Мост к виджету.
//
// Виджет ничего не вычисляет сам: время намаза зависит от метода расчёта,
// координат и ручных поправок, и дублировать эту логику на Swift значило бы
// завести второй источник правды, который однажды разойдётся с первым.
// Приложение кладёт готовый срез дня в общий контейнер, виджет его читает.
import { ExtensionStorage } from '@bacons/apple-targets';

// Идентификатор обязан входить в оба provisioning-профиля — приложения
// и расширения. Взят из профиля подписи.
const APP_GROUP = 'group.95233b59e7e45aab.1';
const KEY = 'prayerDay';

let storage = null;
function getStorage() {
  if (!storage) {
    try { storage = new ExtensionStorage(APP_GROUP); } catch { storage = null; }
  }
  return storage;
}

/**
 * Записать расписание дня и перерисовать виджет.
 *
 * @param {object}   options
 * @param {object}   options.timings  { Fajr: "04:12", Sunrise: ..., ... }
 * @param {string[]} options.order    порядок ключей в списке
 * @param {function} options.label    (key) => отображаемое имя
 * @param {string}   options.city     подпись места
 * @param {string}   [options.nextKey] ближайший намаз
 */
export function publishPrayerDay({ timings, order, label, city, nextKey }) {
  const store = getStorage();
  if (!store || !timings) return false;

  const times = order
    .filter((key) => typeof timings[key] === 'string')
    .map((key) => ({ key, name: label(key), time: timings[key] }));

  if (!times.length) return false;

  try {
    store.set(KEY, JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      city: city || '',
      times,
      nextKey: nextKey || null,
    }));
    ExtensionStorage.reloadWidget();
    return true;
  } catch {
    // Виджет — не критичная часть: сбой записи не должен ронять экран.
    return false;
  }
}
