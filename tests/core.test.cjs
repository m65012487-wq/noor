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
      if (id.startsWith('.')) {
        // Metro-only asset imports (images, fonts) aren't JS modules; stub
        // them so files that require() artwork can still be loaded for their
        // pure exports.
        if (/\.(png|jpg|jpeg|gif|webp|ttf|otf)$/i.test(id)) return { uri: id };
        return load(path.resolve(path.dirname(full), id + (path.extname(id) ? '' : '.js')));
      }
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
test('dismiss gestures distinguish deliberate exit from taps and vertical scrolling', () => {
  const { capturesDismiss, finishesDismiss } = load('src/tasbih/dismissGesture.js');
  assert.equal(capturesDismiss({ dx: 3, dy: 2, numberActiveTouches: 1 }), false);
  assert.equal(capturesDismiss({ dx: 22, dy: 40, numberActiveTouches: 1 }), false);
  assert.equal(capturesDismiss({ dx: 30, dy: 4, numberActiveTouches: 2 }), false);
  assert.equal(capturesDismiss({ dx: 30, dy: 4, numberActiveTouches: 1 }), true);
  assert.equal(finishesDismiss({ dx: 100, dy: 4, vx: 0.1, vy: 0 }), true);
  assert.equal(finishesDismiss({ dx: -120, dy: 0, vx: -1, vy: 0 }), false);
  assert.equal(finishesDismiss({ dx: 30, dy: 1, vx: 0.9, vy: 0 }), false);
  assert.equal(finishesDismiss({ dx: 45, dy: 1, vx: 0.9, vy: 0 }), true);
  assert.equal(capturesDismiss({ dx: 4, dy: 30, numberActiveTouches: 1 }, 'down'), true);
  assert.equal(finishesDismiss({ dx: 4, dy: 110, vx: 0, vy: 0.2 }, 'down'), true);
});
test('lighting boundaries preserve one shared environment configuration', () => {
  const { lightStateAt, LIGHT_STATES, ENVIRONMENT } = load('src/constants/environmentTheme.js');
  for (const [hour, expected] of [[0,'night'],[4,'dawn'],[7,'day'],[17,'sunset'],[20,'night']]) {
    assert.equal(lightStateAt(new Date(2026, 8, 14, hour)), expected);
    assert.equal(LIGHT_STATES[expected].bg.length, 2);
  }
  assert.equal(ENVIRONMENT.debug, false);
  assert.deepEqual(ENVIRONMENT.treeAnchor, { x: 0.5, y: 0.9 });
});
test('gate hint survives restoration and stage configuration can grow beyond eight entries', () => {
  assert.equal(model.restoreState({ ...model.initialState(), hasSeenGateHint: true }).hasSeenGateHint, true);
  const stages = Array.from({ length: 30 }, (_, i) => ({ requiredProgress: i * 100, minimumDays: i }));
  assert.equal(model.chooseStage(2900, 29, stages), 29);
  assert.equal(model.chooseStage(2900, 2, stages), 2);
});
test('olive artwork shares a transparent vector canvas', () => {
  const root = path.resolve(__dirname, '..');
  const olive = path.join(root, 'assets/garden/plants/olive');
  const files = fs.readdirSync(olive).filter(name => name.endsWith('.svg'));
  assert.equal(files.length, 5);
  const canvases = new Set(files.map(name => {
    const xml = fs.readFileSync(path.join(olive, name), 'utf8');
    assert.doesNotMatch(xml, /<(image|text)\b|(?:href|url)\s*=/i);
    return xml.match(/viewBox="([^"]+)"/)[1];
  }));
  assert.equal(canvases.size, 1);
});
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
  const tree = model.activeTree(state);
  assert.equal(state.activeDays, 1);
  assert.ok(tree.progress <= model.GROWTH.dailyCap + model.GROWTH.activeDayContribution + 0.00001);
  assert.equal(tree.stage, 1);
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
  assert.ok(model.activeTree(resumed).progress >= model.activeTree(state).progress);
  assert.equal(model.isResting(resumed, '2026-10-20'), false);
});
test('stage configuration can grow beyond the built-in eight entries', () => {
  const stages = [...model.STAGES, { requiredProgress: 10000, minimumDays: 90 }];
  assert.equal(model.chooseStage(20000, 100, stages), stages.length - 1);
});
test('v1 saves migrate into a single olive tree and reset the v2 garden fields', () => {
  const v1 = { version: 1, selectedDhikr: 'sequence', currentDhikrIndex: 0, currentDhikrCount: 5,
    totalDhikrCount: 40, perDhikrCounts: { subhanallah: 40 }, treeGrowthProgress: 500, treeStage: 'olive_stage_03',
    lastActiveDate: day, activeDays: 4, dailyDhikrCounts: { [day]: 40 }, hasSeenTasbihHint: true, hasSeenGateHint: false };
  const state = model.restoreState(v1);
  assert.equal(state.version, 2);
  assert.equal(state.trees.length, 1);
  const tree = model.activeTree(state);
  assert.equal(tree.species, 'olive');
  assert.equal(tree.progress, 500);
  assert.equal(tree.activeDays, 4);
  assert.equal(tree.stage, model.chooseStage(500, 4));
  assert.deepEqual(state.seeds, {});
  assert.deepEqual(state.pendingDrops, []);
  assert.equal(state.lastCircleDropDate, null);
  assert.equal(state.totalDhikrCount, 40);
});
test('a seed drops once the 7th distinct active day completes, tagged reason week', () => {
  let state = model.initialState();
  const rng = () => 0;
  const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'];
  for (const d of days) state = model.registerDhikr(state, d, { rng });
  assert.equal(state.activeDays, 7);
  assert.equal(state.pendingDrops.length, 1);
  assert.equal(state.pendingDrops[0].reason, 'week');
  assert.equal(Object.values(state.seeds).reduce((a, b) => a + b, 0), 1);
});
test('a seed drops with reason harvest exactly when the active tree first reaches the final stage', () => {
  const rng = () => 0;
  const near = { ...model.initialState(),
    trees: [{ id: 't1', species: 'olive', progress: model.STAGES[7].requiredProgress - 1, activeDays: model.STAGES[7].minimumDays, stage: 6, lastGrowDate: null, plantedOn: null, harvested: false }] };
  const state = model.registerDhikr(near, day, { rng });
  const tree = model.activeTree(state);
  assert.equal(tree.stage, 7);
  assert.equal(tree.harvested, true);
  assert.equal(state.pendingDrops.filter(d => d.reason === 'harvest').length, 1);
  const again = model.registerDhikr(state, '2026-09-14', { rng });
  assert.equal(again.pendingDrops.filter(d => d.reason === 'harvest').length, 1);
});
test('a full circle (multiples of 99) drops at most once per day, gated by probability', () => {
  const alwaysDrops = () => 0;
  let state = model.initialState();
  for (let i = 0; i < 99; i += 1) state = model.registerDhikr(state, day, { rng: alwaysDrops });
  assert.equal(state.pendingDrops.filter(d => d.reason === 'circle').length, 1);
  assert.equal(state.lastCircleDropDate, day);
  for (let i = 0; i < 99; i += 1) state = model.registerDhikr(state, day, { rng: alwaysDrops });
  assert.equal(state.pendingDrops.filter(d => d.reason === 'circle').length, 1);

  const neverDrops = () => 0.99;
  let quiet = model.initialState();
  for (let i = 0; i < 99; i += 1) quiet = model.registerDhikr(quiet, day, { rng: neverDrops });
  assert.equal(quiet.pendingDrops.filter(d => d.reason === 'circle').length, 0);
  assert.equal(quiet.lastCircleDropDate, null);
});
test('sidr stays out of the drop pool until three distinct species are owned', () => {
  const base = { ...model.initialState(), activeDays: 6 };
  const rngHigh = () => 0.999999;
  const onlyOlive = model.registerDhikr(base, '2026-09-20', { rng: rngHigh });
  assert.equal(onlyOlive.pendingDrops[0].reason, 'week');
  assert.notEqual(onlyOlive.pendingDrops[0].species, 'sidr');
  const threeSpecies = { ...base, trees: [
    { ...base.trees[0] },
    { id: 't2', species: 'fig', progress: 0, activeDays: 0, stage: 0, lastGrowDate: null, plantedOn: null, harvested: false },
    { id: 't3', species: 'pomegranate', progress: 0, activeDays: 0, stage: 0, lastGrowDate: null, plantedOn: null, harvested: false },
  ] };
  const withSidr = model.registerDhikr(threeSpecies, '2026-09-20', { rng: rngHigh });
  assert.equal(withSidr.pendingDrops[0].species, 'sidr');
});
test('plantSeed spends a seed and makes the new tree active; a missing seed is a no-op', () => {
  const state = { ...model.initialState(), seeds: { fig: 1 } };
  const planted = model.plantSeed(state, 'fig', day);
  assert.equal(planted.seeds.fig, undefined);
  assert.equal(planted.trees.length, 2);
  assert.equal(planted.activeTreeId, planted.trees[1].id);
  assert.equal(planted.trees[1].species, 'fig');
  assert.equal(planted.trees[1].stage, 0);
  assert.equal(model.plantSeed(state, 'sidr', day), state);
});
test('setActiveTree only switches to a known tree; ackDrop consumes pending drops in order', () => {
  const state = { ...model.initialState(), pendingDrops: [{ species: 'fig', reason: 'week' }, { species: 'olive', reason: 'circle' }] };
  assert.equal(model.setActiveTree(state, 'missing'), state);
  assert.equal(model.setActiveTree(state, 't1').activeTreeId, 't1');
  const afterFirst = model.ackDrop(state);
  assert.deepEqual(afterFirst.pendingDrops, [{ species: 'olive', reason: 'circle' }]);
  assert.deepEqual(model.ackDrop(model.ackDrop(afterFirst)).pendingDrops, []);
});
test('a tree stage never rolls back even if computed progress momentarily dips below its threshold', () => {
  const state = { ...model.initialState(),
    trees: [{ id: 't1', species: 'olive', progress: 10, activeDays: 1, stage: 5, lastGrowDate: null, plantedOn: null, harvested: false }] };
  const next = model.registerDhikr(state, day, { rng: () => 1 });
  assert.equal(model.activeTree(next).stage, 5);
});
test('free dhikr mode counts without a fixed phrase, respecting the circle limit', () => {
  let state = model.selectDhikr(model.initialState(), 'free');
  assert.equal(model.definition(state).id, 'free');
  assert.equal(model.definition(state).target, 33);
  for (let i = 0; i < 33; i++) state = model.registerDhikr(state, day);
  assert.equal(state.currentDhikrCount, 33);
  assert.equal(state.perDhikrCounts.free, 33);
  const after = model.registerDhikr(state, day);
  assert.equal(after.currentDhikrCount, 1);
  assert.equal(after.perDhikrCounts.free, 34);
});
test('custom dhikr: add, select, count, and removing the active one falls back to free', () => {
  let state = model.addCustomDhikr(model.initialState(), { text: '  Astagfirullah  ', arabic: '', translation: ' forgiveness ' });
  assert.equal(state.customDhikr.length, 1);
  const id = state.customDhikr[0].id;
  assert.equal(state.customDhikr[0].text, 'Astagfirullah');
  assert.equal(state.customDhikr[0].translation, 'forgiveness');
  state = model.selectDhikr(state, `custom:${id}`);
  assert.equal(state.selectedDhikr, `custom:${id}`);
  state = model.registerDhikr(state, day);
  assert.equal(state.perDhikrCounts[`custom:${id}`], 1);
  assert.equal(model.definition(state).ru, 'Astagfirullah');
  state = model.removeCustomDhikr(state, id);
  assert.equal(state.customDhikr.length, 0);
  assert.equal(state.selectedDhikr, 'free');
  assert.equal(state.currentDhikrCount, 0);
});
test('addCustomDhikr rejects blank text and enforces length limits; removing an unknown id is a no-op', () => {
  const state = model.initialState();
  assert.equal(model.addCustomDhikr(state, { text: '   ' }), state);
  const long = model.addCustomDhikr(state, { text: 'x'.repeat(200), arabic: 'y'.repeat(200), translation: 'z'.repeat(200) });
  assert.equal(long.customDhikr[0].text.length, 80);
  assert.equal(long.customDhikr[0].arabic.length, 120);
  assert.equal(long.customDhikr[0].translation.length, 120);
  assert.equal(model.removeCustomDhikr(state, 'missing'), state);
});
test('circleLimit off removes the target and lets the count grow past 33 without resetting', () => {
  let state = model.setCircleLimit(model.selectDhikr(model.initialState(), 'allahuakbar'), false);
  assert.equal(model.definition(state).target, null);
  for (let i = 0; i < 40; i++) state = model.registerDhikr(state, day);
  assert.equal(state.currentDhikrCount, 40);
  const withLimit = model.setCircleLimit(state, true);
  assert.equal(model.definition(withLimit).target, 33);
});
test('sequence mode always circles by 33 regardless of circleLimit', () => {
  let state = model.setCircleLimit(model.initialState(), false);
  for (let i = 0; i < 33; i++) state = model.registerDhikr(state, day);
  assert.equal(state.currentDhikrCount, 33);
  const next = model.registerDhikr(state, day);
  assert.equal(next.currentDhikrCount, 1);
  assert.equal(model.definition(next).id, 'alhamdulillah');
});
test('tapEvent classifies taps as tap, circle, or complete', () => {
  let state = model.initialState();
  for (let i = 0; i < 32; i++) state = model.registerDhikr(state, day);
  let prev = state;
  state = model.registerDhikr(state, day); // 33rd tap of subhanallah
  assert.equal(model.tapEvent(prev, state), 'circle');
  for (let i = 0; i < 32; i++) state = model.registerDhikr(state, day);
  prev = state;
  state = model.registerDhikr(state, day); // 33rd tap of alhamdulillah
  assert.equal(model.tapEvent(prev, state), 'circle');
  for (let i = 0; i < 32; i++) state = model.registerDhikr(state, day);
  prev = state;
  state = model.registerDhikr(state, day); // 33rd tap of allahuakbar completes the full sequence
  assert.equal(model.tapEvent(prev, state), 'complete');

  let single = model.selectDhikr(model.initialState(), 'allahuakbar');
  for (let i = 0; i < 32; i++) single = model.registerDhikr(single, day);
  const beforeSingle = single;
  single = model.registerDhikr(single, day);
  assert.equal(model.tapEvent(beforeSingle, single), 'circle');

  let free = model.setCircleLimit(model.selectDhikr(model.initialState(), 'free'), false);
  for (let i = 0; i < 32; i++) free = model.registerDhikr(free, day);
  const beforeCircle = free;
  free = model.registerDhikr(free, day);
  assert.equal(model.tapEvent(beforeCircle, free), 'circle');
  for (let i = 0; i < 65; i++) free = model.registerDhikr(free, day);
  const beforeComplete = free;
  free = model.registerDhikr(free, day);
  assert.equal(free.currentDhikrCount, 99);
  assert.equal(model.tapEvent(beforeComplete, free), 'complete');
});
test('restoreState validates circleLimit, customDhikr entries, and mode references', () => {
  const base = model.initialState();
  const raw = { ...base, circleLimit: 'yes', customDhikr: [
    { id: 'c1', text: '  Hi  ', arabic: '', translation: '' },
    { id: 'c1', text: 'duplicate id' },
    { id: '', text: 'missing id' },
    { id: 'c2', text: '   ' },
    null,
  ], selectedDhikr: 'custom:missing' };
  const state = model.restoreState(raw);
  assert.equal(state.circleLimit, true);
  assert.equal(state.customDhikr.length, 1);
  assert.equal(state.customDhikr[0].id, 'c1');
  assert.equal(state.customDhikr[0].text, 'Hi');
  assert.equal(state.selectedDhikr, 'sequence');

  const validCustomRaw = { ...base, customDhikr: [{ id: 'c9', text: 'Zikr' }], selectedDhikr: 'custom:c9', circleLimit: false };
  const restored = model.restoreState(validCustomRaw);
  assert.equal(restored.selectedDhikr, 'custom:c9');
  assert.equal(restored.circleLimit, false);
  assert.equal(model.definition(restored).target, null);

  assert.equal(model.restoreState({ ...base, selectedDhikr: 'free' }).selectedDhikr, 'free');
});
test('v1 saves migrate with v3 mode defaults (circleLimit on, no custom dhikr)', () => {
  const v1 = { version: 1, selectedDhikr: 'sequence', currentDhikrIndex: 0, currentDhikrCount: 0,
    totalDhikrCount: 0, perDhikrCounts: {}, treeGrowthProgress: 0, treeStage: 'olive_stage_01',
    lastActiveDate: null, activeDays: 0, dailyDhikrCounts: {}, hasSeenTasbihHint: false, hasSeenGateHint: false };
  const state = model.restoreState(v1);
  assert.equal(state.circleLimit, true);
  assert.deepEqual(state.customDhikr, []);
});
test('seasonAt maps the device month to a garden season', () => {
  assert.equal(model.seasonAt(new Date(2026, 2, 1)), 'spring');
  assert.equal(model.seasonAt(new Date(2026, 4, 31)), 'spring');
  assert.equal(model.seasonAt(new Date(2026, 5, 1)), 'summer');
  assert.equal(model.seasonAt(new Date(2026, 7, 31)), 'summer');
  assert.equal(model.seasonAt(new Date(2026, 8, 1)), 'autumn');
  assert.equal(model.seasonAt(new Date(2026, 10, 30)), 'autumn');
  assert.equal(model.seasonAt(new Date(2026, 11, 1)), 'winter');
  assert.equal(model.seasonAt(new Date(2026, 0, 15)), 'winter');
  assert.equal(model.seasonAt(new Date(2026, 1, 28)), 'winter');
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
