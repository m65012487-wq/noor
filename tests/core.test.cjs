const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

// Exercise the real pure modules and storage/scheduling adapters, without a device.
function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    const full = path.resolve(__dirname, '..', file);
    if (cache.has(full)) return cache.get(full).exports;
    const mod = { exports: {} }; cache.set(full, mod);
    const result = babel.transformSync(fs.readFileSync(full, 'utf8'), {
      filename: full, babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const localRequire = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith('.')) return load(path.resolve(path.dirname(full), id + (path.extname(id) ? '' : '.js')));
      return require(id);
    };
    new Function('require', 'module', 'exports', result.code)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return load;
}
const load = loader();
const model = load('src/tasbih/model.js');
const dates = load('src/utils/calendarDate.js');
const day = '2026-09-13';
function taps(n, state = model.initialState(), key = day) {
  for (let i = 0; i < n; i++) state = model.registerDhikr(state, key);
  return state;
}

test('32 → 33 remains visible, then advances without losing a fast next tap', () => {
  const s32 = taps(32), s33 = taps(1, s32);
  assert.equal(s33.currentDhikrCount, 33);
  assert.equal(model.definition(s33).id, 'subhanallah');
  const advanced = model.advance(s33);
  assert.equal(advanced.currentDhikrCount, 0);
  assert.equal(model.definition(advanced).id, 'alhamdulillah');
  const s34 = taps(1, s33);
  assert.equal(s34.currentDhikrCount, 1);
  assert.equal(s34.totalDhikrCount, 34);
  assert.equal(s34.perDhikrCounts.subhanallah, 33);
  assert.equal(s34.perDhikrCounts.alhamdulillah, 1);
});
test('complete sequence wraps, single selection stays selected', () => {
  assert.equal(model.definition(model.advance(taps(99))).id, 'subhanallah');
  const single = model.selectDhikr(model.initialState(), 'allahuakbar');
  const state = taps(34, single);
  assert.equal(model.definition(state).id, 'allahuakbar');
  assert.equal(state.currentDhikrCount, 1);
});
test('10000 taps in a day cannot bypass consistency', () => {
  const state = taps(10000);
  assert.equal(state.activeDays, 1);
  assert.ok(state.treeGrowthProgress <= model.GROWTH.dailyCap + model.GROWTH.activeDayContribution + 0.00001);
  assert.equal(state.treeStage, 'olive_stage_02');
});
test('new dates count once, revisiting a date does not award another active day', () => {
  let state = taps(7);
  state = taps(2, state, '2026-09-14');
  state = taps(2, state, day);
  assert.equal(state.activeDays, 2);
  assert.equal(state.dailyDhikrCounts[day], 9);
});
test('absence does not erase growth; resting is a derived state', () => {
  const state = taps(99);
  assert.equal(model.isResting(state, '2026-10-20'), true);
  const resumed = taps(1, state, '2026-10-20');
  assert.ok(resumed.treeGrowthProgress >= state.treeGrowthProgress);
  assert.equal(model.isResting(resumed, '2026-10-20'), false);
});
test('missing stage art falls back; empty registry is safe', () => {
  const seed = { xml: '<svg />' };
  assert.equal(model.resolveStageAsset('olive_stage_05', { seed }), seed);
  assert.equal(model.resolveStageAsset('olive_stage_05', {}), null);
  const stages = [...model.STAGES, { id: 'extra', assetName: 'extra', requiredProgress: 10000, minimumDays: 90 }];
  assert.equal(model.chooseStage(20000, 100, stages).id, 'extra');
});
test('persist 17/33 and serialize rapid writes; storage failure is observable', async () => {
  let raw = null;
  const storage = { getItem: async () => raw, setItem: async (_, value) => { await new Promise(r => setTimeout(r, 1)); raw = value; } };
  const persistence = loader({ '@react-native-async-storage/async-storage': storage })('src/tasbih/persistence.js').createPersistence(storage);
  const state = taps(17);
  await Promise.all([persistence.save(taps(16)), persistence.save(state)]);
  assert.deepEqual(await persistence.load(), state);
  assert.equal((await persistence.load()).currentDhikrCount, 17);
  storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(persistence.save(state), /disk full/);
});
test('local date keys use calendar day, and reject malformed prayer times', () => {
  assert.equal(dates.localDateKey(new Date(2026, 8, 13, 0, 1)), day);
  assert.equal(dates.atTime(day, '25:10'), null);
  assert.equal(dates.atTime(day, '05:75'), null);
  assert.equal(dates.atTime(day, '05:10').getDate(), 13);
});
test('dated snapshots are shared; next Fajr uses tomorrow actual time', async () => {
  const store = new Map(); let calls = 0;
  const storage = { getItem: async k => store.get(k), setItem: async (k,v) => store.set(k,v) };
  const source = { getPrayerTimes2: async () => { calls++; return { Fajr: '05:10', Sunrise: '06:30', Dhuhr: '12:10', Asr: '15:30', Maghrib: '18:00', Isha: '20:00' }; } };
  const schedule = loader({ '@react-native-async-storage/async-storage': storage, './prayerSource': source })('src/utils/prayerSchedule.js');
  const options = { lat: 43, lng: 43, sourceId: 'local', school: 'shafi' };
  const result = await Promise.all([schedule.getPrayerDay(options, new Date(2026,8,13)), schedule.getPrayerDay(options, new Date(2026,8,13))]);
  assert.equal(calls, 1); assert.deepEqual(result[0], result[1]);
  const tomorrow = { ...result[0], date: '2026-09-14', timings: { ...result[0].timings, Fajr: '05:12' } };
  const events = schedule.prayerEvents([result[0], tomorrow], new Date(2026,8,13,22));
  assert.equal(events.next.time, '05:12'); assert.equal(events.next.date.getDate(), 14);
  assert.equal(events.afterNext.name, 'Dhuhr');
});
test('alarm plans future mornings, and waking cancels only that day', async () => {
  const stored = { fajrAlarmEnabled: true, fajrAlarmInterval: 5 };
  const scheduled = [];
  const notifications = { getAllScheduledNotificationsAsync: async () => scheduled,
    cancelScheduledNotificationAsync: async id => { const index = scheduled.findIndex(n => n.identifier === id); if(index >= 0) scheduled.splice(index,1); },
    scheduleNotificationAsync: async n => { scheduled.push({ ...n, identifier: String(scheduled.length) }); } };
  const alarm = loader({ 'expo-notifications': { ...notifications, SchedulableTriggerInputTypes: { DATE: 'date' } },
    './prayerNotifications': { ensurePermission: async () => true },
    './helpers': { loadJSON: async (k,f) => stored[k] ?? f, saveJSON: async(k,v) => { stored[k] = v; } },
  })('src/utils/fajrAlarm.js');
  const days = Array.from({ length: 3 }, (_, i) => { const date = new Date(); date.setDate(date.getDate()+i+1);
    return { date: dates.localDateKey(date), timings: { Fajr: '05:00', Sunrise: '06:00' } }; });
  assert.equal(await alarm.scheduleFajrDays(days, { title: 'Fajr', body: 'Wake' }), 12);
  assert.ok(scheduled.every(n => n.trigger.date > new Date()));
  await alarm.markAwake();
  assert.equal(scheduled.length, 12);
});
