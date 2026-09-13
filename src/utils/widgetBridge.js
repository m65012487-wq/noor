import { ExtensionStorage } from '@bacons/apple-targets';

const APP_GROUP = 'group.95233b59e7e45aab.1';
let storage = null;
export function publishPrayerDay({ days, order, label, city }) {
  try {
    if (!storage) storage = new ExtensionStorage(APP_GROUP);
    const snapshot = days.map(day => ({
      date: day.date, city, timezone: day.timezone,
      times: order.map(key => ({ key, name: label(key), time: day.timings[key] })),
      nextKey: null,
    }));
    storage.set('prayerWindow:v2', JSON.stringify(snapshot));
    ExtensionStorage.reloadWidget();
    return true;
  } catch { return false; }
}
