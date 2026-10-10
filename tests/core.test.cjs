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
        if (/\.(png|jpg|jpeg|gif|webp|ttf|otf|m4a)$/i.test(id)) return { uri: id };
        // Data tables are plain JSON, as Metro bundles them.
        if (/\.json$/i.test(id)) return JSON.parse(fs.readFileSync(path.resolve(path.dirname(full), id), 'utf8'));
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
test('stage configuration can grow beyond eight entries', () => {
  const stages = Array.from({ length: 30 }, (_, i) => ({ requiredProgress: i * 100 }));
  assert.equal(model.chooseStage(2900, stages), 29);
  assert.equal(model.chooseStage(250, stages), 2);
});
test('tree silhouettes cover every species and stage and stay inside the canvas', () => {
  const { TREE_CANVAS, TREE_ART, TREE_BOUNDS } = load('src/tasbih/treeArt.js');
  assert.deepEqual(Object.keys(TREE_ART).sort(), model.SPECIES.map(s => s.id).sort());
  for (const species of Object.keys(TREE_ART)) {
    assert.equal(TREE_ART[species].length, model.STAGES.length);
    assert.equal(TREE_BOUNDS[species].length, model.STAGES.length);
    TREE_ART[species].forEach(source => assert.ok(source, species));
    TREE_BOUNDS[species].forEach((b, stage) => {
      assert.ok(b.x >= 0 && b.y >= 0 && b.width > 0 && b.height > 0, `${species} ${stage}`);
      assert.ok(b.x + b.width <= TREE_CANVAS.width + 0.5 && b.y + b.height <= TREE_CANVAS.height + 0.5, `${species} ${stage}`);
      // Комель стоит у корня: низ силуэта (холмик) — у точки корня.
      assert.ok(Math.abs(b.y + b.height - TREE_CANVAS.baseY) <= 10, `${species} ${stage}`);
    });
    const heights = TREE_BOUNDS[species].map(b => b.height);
    for (let i = 1; i < heights.length; i += 1) assert.ok(heights[i] >= heights[i - 1] - 0.5, `${species} grows at ${i}`);
  }
});
function taps(n, state = model.initialState(), key = day, options) {
  for (let i = 0; i < n; i++) state = model.registerDhikr(state, key, options);
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
test('every remembrance is one unit of growth, the first 33 of the day count double, no daily cap', () => {
  assert.deepEqual(model.GROWTH, { bonusTaps: 33, bonusMultiplier: 2 });
  assert.equal(model.growthForCount(0), 0);
  assert.equal(model.growthForCount(1), 2);
  assert.equal(model.growthForCount(33), 66);
  assert.equal(model.growthForCount(34), 67);
  assert.equal(model.growthForCount(10000), 10033);
  // Прирост на касание — разность: 2 за каждое из первых 33, затем по 1.
  let state = taps(33);
  assert.equal(model.activeTree(state).progress, 66);
  state = taps(1, state);
  assert.equal(model.activeTree(state).progress, 67);
  // Следующий день снова начинается с двойного счёта.
  state = taps(1, state, '2026-09-14');
  assert.equal(model.activeTree(state).progress, 69);
  // Потолка нет: 300 поминаний за день — 333 роста.
  assert.equal(model.activeTree(taps(300)).progress, 333);
});
test('10000 taps in a day give 10033 growth: the tree fruits once, the surplus is kept up to the cap', () => {
  const state = taps(10000, model.initialState(), day, { rng: () => 0 });
  const tree = model.activeTree(state);
  assert.equal(state.activeDays, 1);
  assert.equal(tree.progress, 10033);
  assert.equal(tree.stage, model.STAGES.length - 1);
  assert.equal(tree.harvested, true);
  assert.equal(state.reserve, model.RESERVE_CAP);
  // Один подарок за подъём до «Молодого дерева» и один — за плоды.
  assert.deepEqual(state.pendingDrops.map(d => d.reason).sort(), ['growth', 'harvest']);
});
test('a gift never repeats a species the player already owns, and stops once the collection is complete', () => {
  const rng = () => 0;
  let state = { ...model.initialState(), seeds: { fig: 1, pomegranate: 1, date_palm: 1, sidr: 1 }, activeDays: 6 };
  state = model.registerDhikr(state, day, { rng });
  assert.equal(state.activeDays, 7);
  assert.deepEqual(state.pendingDrops, []);
  const fresh = { ...model.initialState(), activeDays: 6 };
  const gifted = model.registerDhikr(fresh, day, { rng });
  assert.equal(gifted.pendingDrops.length, 1);
  assert.notEqual(gifted.pendingDrops[0].species, 'olive');
  assert.notEqual(gifted.pendingDrops[0].species, 'sidr');
});
test('stages are chosen by growth alone, with no day requirements', () => {
  assert.deepEqual(model.STAGES.map(s => s.requiredProgress), [0, 40, 160, 360, 640, 1000, 1450, 2000]);
  assert.ok(model.STAGES.every(s => !('minimumDays' in s)));
  assert.equal(model.chooseStage(0), 0);
  assert.equal(model.chooseStage(39), 0);
  assert.equal(model.chooseStage(40), 1);
  assert.equal(model.chooseStage(1999), 6);
  assert.equal(model.chooseStage(2000), 7);
  // Первый же день может вырастить дерево: нужные дни не копятся.
  const near = { ...model.initialState(),
    trees: [{ id: 't1', species: 'olive', progress: 158, activeDays: 0, stage: 1, lastGrowDate: null, plantedOn: null, harvested: false }] };
  const grown = model.activeTree(taps(1, near));
  assert.equal(grown.progress, 160);
  assert.equal(grown.stage, 2);
  assert.equal(taps(300).activeDays, 1);
  assert.equal(model.activeTree(taps(300)).stage, 2);
});
test('pace: 99 a day fruits in about 15 days, 33 a day in about a month, 300 a day in about a week', () => {
  const daysToFruit = perDay => {
    let state = model.initialState();
    for (let d = 1; d <= 60; d++) {
      state = taps(perDay, state, new Date(Date.UTC(2026, 9, d)).toISOString().slice(0, 10));
      if (model.activeTree(state).stage === model.STAGES.length - 1) return d;
    }
    return Infinity;
  };
  const d99 = daysToFruit(99), d33 = daysToFruit(33), d300 = daysToFruit(300);
  assert.ok(d99 >= 14 && d99 <= 17, `99/day: ${d99}`);
  assert.ok(d33 >= 29 && d33 <= 32, `33/day: ${d33}`);
  assert.ok(d300 >= 6 && d300 <= 8, `300/day: ${d300}`);
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
  const stages = [...model.STAGES, { requiredProgress: 10000 }];
  assert.equal(model.chooseStage(20000, stages), stages.length - 1);
});
test('v1 saves migrate into a single olive tree and reset the garden fields', () => {
  const v1 = { version: 1, selectedDhikr: 'sequence', currentDhikrIndex: 0, currentDhikrCount: 5,
    totalDhikrCount: 40, perDhikrCounts: { subhanallah: 40 }, treeGrowthProgress: 500, treeStage: 'olive_stage_03',
    lastActiveDate: day, activeDays: 4, dailyDhikrCounts: { [day]: 40 }, hasSeenTasbihHint: true };
  const state = model.restoreState(v1);
  assert.equal(state.version, 3);
  assert.equal(state.trees.length, 1);
  const tree = model.activeTree(state);
  assert.equal(tree.species, 'olive');
  assert.equal(tree.progress, 500);
  assert.equal(tree.activeDays, 4);
  assert.equal(tree.stage, model.chooseStage(500));
  assert.deepEqual(state.seeds, {});
  assert.deepEqual(state.pendingDrops, []);
  assert.equal(state.reserve, 0);
  assert.deepEqual(state.sequence, model.DEFAULT_SEQUENCE);
  assert.ok(!('lastCircleDropDate' in state));
  assert.equal(state.totalDhikrCount, 40);
});
test('a full circle of 99 drops no seed, and the 7th active day gifts only a species not owned yet', () => {
  const rng = () => 0;
  let state = model.initialState();
  for (let d = 1; d <= 7; d++) state = model.registerDhikr(state, `2026-09-0${d}`, { rng });
  assert.equal(state.activeDays, 7);
  assert.deepEqual(state.pendingDrops.map(d => d.reason), ['week']);
  const [gift] = state.pendingDrops;
  assert.notEqual(gift.species, 'olive');
  assert.equal(state.seeds[gift.species], 1);
  let circle = model.initialState();
  for (let i = 0; i < 99 * 3; i++) circle = model.registerDhikr(circle, day, { rng });
  assert.deepEqual(circle.pendingDrops, []);
  assert.ok(!('lastCircleDropDate' in circle));
});
test('a seed drops with reason harvest exactly when the active tree first reaches the final stage', () => {
  const rng = () => 0;
  const near = { ...model.initialState(),
    trees: [{ id: 't1', species: 'olive', progress: model.STAGES[7].requiredProgress - 1, activeDays: 3, stage: 6, lastGrowDate: null, plantedOn: null, harvested: false }] };
  const state = model.registerDhikr(near, day, { rng });
  const tree = model.activeTree(state);
  assert.equal(tree.stage, 7);
  assert.equal(tree.harvested, true);
  assert.equal(state.pendingDrops.length, 1);
  assert.equal(state.pendingDrops[0].reason, 'harvest');
  assert.equal(Object.values(state.seeds).reduce((a, b) => a + b, 0), 1);
  // Дальше дерево плодоносит, и новых зёрен нет — сколько бы ни считали.
  const again = taps(500, state, '2026-09-14');
  assert.equal(again.pendingDrops.length, 1);
  assert.equal(Object.values(again.seeds).reduce((a, b) => a + b, 0), 1);
});
test('a fruiting tree that was never marked harvested (migrated save) pays out its seed on the next tap, once', () => {
  const rng = () => 0;
  const old = { ...model.initialState(),
    trees: [{ id: 't1', species: 'olive', progress: 2500, activeDays: 40, stage: 7, lastGrowDate: null, plantedOn: null, harvested: false }] };
  const state = model.registerDhikr(old, day, { rng });
  assert.equal(state.pendingDrops.filter(d => d.reason === 'harvest').length, 1);
  assert.equal(model.activeTree(state).harvested, true);
  assert.equal(model.registerDhikr(state, day, { rng }).pendingDrops.length, 1);
});
test('sidr stays out of the drop pool until three distinct species are owned', () => {
  const rngHigh = () => 0.999999;
  const nearFruit = (id, species) => ({ id, species, progress: model.STAGES[7].requiredProgress - 1, activeDays: 5, stage: 6, lastGrowDate: null, plantedOn: null, harvested: false });
  const base = { ...model.initialState(), trees: [nearFruit('t1', 'olive')] };
  const onlyOlive = model.registerDhikr(base, '2026-09-20', { rng: rngHigh });
  assert.equal(onlyOlive.pendingDrops[0].reason, 'harvest');
  assert.notEqual(onlyOlive.pendingDrops[0].species, 'sidr');
  const threeSpecies = { ...base, trees: [
    nearFruit('t1', 'olive'),
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
const EXTRA_DHIKR = ['la_ilaha_illallah', 'astaghfirullah', 'subhanallahi_wa_bihamdihi',
  'subhanallahil_azim', 'la_hawla', 'salawat', 'allahumma_antas_salam', 'la_ilaha_wahdahu', 'hasbunallah'];
// Длинные азкары после намаза читаются один раз, а не по 33.
const SINGLE_DHIKR = ['allahumma_antas_salam', 'la_ilaha_wahdahu'];
test('DHIKR keeps the three classics first, then the extra remembrances, each complete and vocalized', () => {
  assert.deepEqual(model.DHIKR.map(d => d.id), ['subhanallah', 'alhamdulillah', 'allahuakbar', ...EXTRA_DHIKR]);
  assert.deepEqual(model.DEFAULT_SEQUENCE, [{ id: 'subhanallah', target: 33 }, { id: 'alhamdulillah', target: 33 }, { id: 'allahuakbar', target: 33 }]);
  assert.ok(!('SEQUENCE' in model) && !('SEQUENCE_DHIKR' in model));
  assert.equal(new Set(model.DHIKR.map(d => d.id)).size, model.DHIKR.length);
  for (const d of model.DHIKR) {
    for (const key of ['arabic', 'ru', 'en', 'translation_ru', 'translation_en']) {
      assert.equal(typeof d[key], 'string', `${d.id}.${key}`);
      assert.ok(d[key].trim().length > 0, `${d.id}.${key} is empty`);
    }
    assert.equal(d.target, SINGLE_DHIKR.includes(d.id) ? 1 : 33, d.id);
    // Только арабские буквы, пробелы и огласовки (фатха…сукун и кинжальный алиф).
    assert.match(d.arabic, /^[ء-يً-ْٰ ]+$/u, `${d.id} arabic has foreign characters`);
    assert.match(d.arabic, /[ً-ْ]/u, `${d.id} arabic has no vowel marks`);
    assert.equal(d.arabic, d.arabic.normalize('NFC'), `${d.id} arabic is not NFC-stable`);
  }
});
test('the sequence stays three circles of 33 over the first three remembrances only', () => {
  let state = taps(99);
  assert.deepEqual(state.perDhikrCounts, { subhanallah: 33, alhamdulillah: 33, allahuakbar: 33 });
  state = taps(1, state);
  assert.equal(model.definition(state).id, 'subhanallah');
  assert.equal(state.currentDhikrIndex, 0);
  // Несколько полных кругов: индекс не выходит за 0..2, лишние поминания не попадают в счёт.
  state = taps(99 * 3 - 1, state);
  assert.equal(state.totalDhikrCount, 99 * 4);
  assert.ok(state.currentDhikrIndex >= 0 && state.currentDhikrIndex <= 2);
  assert.deepEqual(Object.keys(state.perDhikrCounts).sort(), ['alhamdulillah', 'allahuakbar', 'subhanallah']);
  assert.deepEqual(Object.values(state.perDhikrCounts), [132, 132, 132]);
  // Конец третьего круга — единственный 'complete', дальше снова первое поминание.
  let s = taps(98);
  const before = s;
  s = model.registerDhikr(s, day);
  assert.equal(model.tapEvent(before, s), 'complete');
  assert.equal(model.definition(model.advance(s)).id, 'subhanallah');
});
test('each extra remembrance can be selected and counts a circle of 33 without joining the sequence', () => {
  for (const id of EXTRA_DHIKR) {
    let state = model.selectDhikr(taps(10), id);
    assert.equal(state.selectedDhikr, id);
    assert.equal(state.currentDhikrCount, 0);
    assert.equal(state.currentDhikrIndex, 0);
    assert.equal(model.definition(state).id, id);
    assert.equal(model.definition(state).target, 33);
    for (let i = 0; i < 32; i++) state = model.registerDhikr(state, day);
    const before = state;
    state = model.registerDhikr(state, day);
    assert.equal(state.currentDhikrCount, 33, id);
    assert.equal(model.tapEvent(before, state), 'circle', id);
    // Следующее нажатие начинает новый круг того же поминания, а не следующего по списку.
    state = model.registerDhikr(state, day);
    assert.equal(state.currentDhikrCount, 1, id);
    assert.equal(state.currentDhikrIndex, 0, id);
    assert.equal(model.definition(state).id, id);
    assert.equal(state.perDhikrCounts[id], 34, id);
    // С выключенным ограничением цели нет.
    assert.equal(model.definition(model.setCircleLimit(state, false)).target, null, id);
  }
  assert.equal(model.selectDhikr(model.initialState(), 'no_such_dhikr').selectedDhikr, 'sequence');
});
test('restoreState accepts the extra remembrance ids and still rejects unknown ones', () => {
  const base = model.initialState();
  for (const id of EXTRA_DHIKR) {
    const restored = model.restoreState({ ...base, selectedDhikr: id, currentDhikrCount: 12 });
    assert.equal(restored.selectedDhikr, id);
    assert.equal(restored.currentDhikrCount, 12);
    assert.equal(model.definition(restored).id, id);
    // Цель 33: сохранённый счёт выше неё обрезается.
    assert.equal(model.restoreState({ ...base, selectedDhikr: id, currentDhikrCount: 500 }).currentDhikrCount, 33);
  }
  assert.equal(model.restoreState({ ...base, selectedDhikr: 'no_such_dhikr' }).selectedDhikr, 'sequence');
  // Индекс последовательности остаётся в пределах трёх, сколько бы ни было поминаний в списке.
  assert.equal(model.restoreState({ ...base, currentDhikrIndex: 9 }).currentDhikrIndex, 0);
  assert.equal(model.definition(model.restoreState({ ...base, currentDhikrIndex: 7 })).id, 'alhamdulillah');
});
test('v1 saves migrate with v3 mode defaults (circleLimit on, no custom dhikr)', () => {
  const v1 = { version: 1, selectedDhikr: 'sequence', currentDhikrIndex: 0, currentDhikrCount: 0,
    totalDhikrCount: 0, perDhikrCounts: {}, treeGrowthProgress: 0, treeStage: 'olive_stage_01',
    lastActiveDate: null, activeDays: 0, dailyDhikrCounts: {}, hasSeenTasbihHint: false };
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
test('growthRatio reports progress toward the next stage, by growth alone', () => {
  const tree = (stage, progress, activeDays = 0) => ({ stage, progress, activeDays });
  // Stage 0 → 1 needs 40, stage 2 → 3 goes from 160 to 360.
  assert.equal(model.growthRatio(tree(0, 0)), 0);
  assert.equal(model.growthRatio(tree(0, 20)), 0.5);
  assert.equal(model.growthRatio(tree(2, 260)), 0.5);
  // Дни не влияют: ни нехватка, ни избыток.
  assert.equal(model.growthRatio(tree(2, 260, 0)), model.growthRatio(tree(2, 260, 99)));
  // Out-of-range values are clamped to 0..1.
  assert.equal(model.growthRatio(tree(1, 0)), 0);
  assert.equal(model.growthRatio(tree(1, 99999)), 1);
  // The last stage is always full; an unknown stage is empty rather than a crash.
  assert.equal(model.growthRatio(tree(model.STAGES.length - 1, 0)), 1);
  assert.equal(model.growthRatio(tree(99, 0)), 0);
  // A real tree after the first tap of the day: 2 of 40.
  assert.ok(Math.abs(model.growthRatio(model.activeTree(taps(1))) - 2 / 40) < 1e-9);
  // Custom stage tables are honoured.
  const stages = [{ requiredProgress: 0 }, { requiredProgress: 100 }];
  assert.equal(model.growthRatio(tree(0, 25), stages), 0.25);
});

const CLASSIC = [{ id: 'subhanallah', target: 33 }, { id: 'alhamdulillah', target: 33 }, { id: 'allahuakbar', target: 34 }];
function eventsOf(count, state) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const prev = state;
    state = model.registerDhikr(state, day);
    events.push(model.tapEvent(prev, state));
  }
  return { state, events };
}
test('a 33 · 33 · 34 sequence goes around the circle and completes on its last step', () => {
  const start = model.setSequence(model.initialState(), CLASSIC);
  assert.deepEqual(start.sequence, CLASSIC);
  assert.deepEqual(model.sequenceSteps(start).map(d => [d.id, d.target]), [['subhanallah', 33], ['alhamdulillah', 33], ['allahuakbar', 34]]);
  const { state, events } = eventsOf(100, start);
  assert.deepEqual(events.map((e, i) => [i + 1, e]).filter(([, e]) => e !== 'tap'), [[33, 'circle'], [66, 'circle'], [100, 'complete']]);
  assert.deepEqual(state.perDhikrCounts, { subhanallah: 33, alhamdulillah: 33, allahuakbar: 34 });
  assert.equal(model.definition(state).id, 'allahuakbar');
  assert.equal(state.currentDhikrCount, 34);
  // Следующее касание начинает круг заново.
  const again = model.registerDhikr(state, day);
  assert.equal(model.definition(again).id, 'subhanallah');
  assert.equal(again.currentDhikrCount, 1);
  assert.equal(again.currentDhikrIndex, 0);
  // Второй круг — те же события на тех же местах.
  const second = eventsOf(99, again);
  assert.deepEqual(second.events.map((e, i) => [i + 2, e]).filter(([, e]) => e !== 'tap'), [[33, 'circle'], [66, 'circle'], [100, 'complete']]);
  assert.equal(second.state.perDhikrCounts.allahuakbar, 68);
});
test('a one-step sequence completes on every circle; steps with target 1 advance on the next tap', () => {
  const single = model.setSequence(model.initialState(), [{ id: 'la_hawla', target: 3 }]);
  const { state, events } = eventsOf(7, single);
  assert.deepEqual(events, ['tap', 'tap', 'complete', 'tap', 'tap', 'complete', 'tap']);
  assert.equal(model.definition(state).id, 'la_hawla');
  assert.equal(state.currentDhikrCount, 1);
  assert.equal(state.currentDhikrIndex, 0);
  assert.equal(state.perDhikrCounts.la_hawla, 7);
  const ones = model.setSequence(model.initialState(), [{ id: 'subhanallah', target: 1 }, { id: 'alhamdulillah', target: 1 }]);
  const run = eventsOf(3, ones);
  assert.deepEqual(run.events, ['circle', 'complete', 'circle']);
  assert.deepEqual(run.state.perDhikrCounts, { subhanallah: 2, alhamdulillah: 1 });
});
test('sequence steps resolve built-in and custom remembrances; unresolved steps are skipped', () => {
  let state = model.addCustomDhikr(model.initialState(), { text: 'Mine', arabic: 'ص', translation: 'Blessings' });
  const cid = `custom:${state.customDhikr[0].id}`;
  state = model.setSequence(state, [{ id: cid, target: 10 }, { id: 'astaghfirullah', target: 100 }]);
  const [mine, istighfar] = model.sequenceSteps(state);
  assert.equal(mine.id, cid);
  assert.equal(mine.ru, 'Mine');
  assert.equal(mine.en, 'Mine');
  assert.equal(mine.arabic, 'ص');
  assert.equal(mine.translation_ru, 'Blessings');
  assert.equal(mine.target, 10);
  assert.equal(istighfar.id, 'astaghfirullah');
  assert.ok(istighfar.arabic.length > 0 && istighfar.translation_ru.length > 0);
  assert.equal(istighfar.target, 100);
  assert.equal(model.definition(state).id, cid);
  // Счёт копится по id поминания шага, у своего — `custom:<id>`.
  state = taps(11, state);
  assert.equal(state.perDhikrCounts[cid], 10);
  assert.equal(state.perDhikrCounts.astaghfirullah, 1);
  assert.equal(model.definition(state).id, 'astaghfirullah');

  const broken = { ...model.initialState(), sequence: [{ id: 'custom:gone', target: 5 }, { id: 'subhanallah', target: 7 }] };
  assert.deepEqual(model.sequenceSteps(broken).map(d => [d.id, d.target]), [['subhanallah', 7]]);
  const none = { ...model.initialState(), sequence: [{ id: 'custom:gone', target: 5 }] };
  assert.deepEqual(model.sequenceSteps(none).map(d => [d.id, d.target]), [['subhanallah', 33], ['alhamdulillah', 33], ['allahuakbar', 33]]);
  const missing = { ...model.initialState(), sequence: undefined };
  assert.deepEqual(model.sequenceSteps(missing).map(d => d.id), ['subhanallah', 'alhamdulillah', 'allahuakbar']);
  // Индекс — по модулю числа шагов.
  assert.equal(model.definition({ ...broken, currentDhikrIndex: 4 }).id, 'subhanallah');
});
test('setSequence cleans its input and restarts the counter only when the steps change', () => {
  const state = taps(40);
  assert.equal(state.currentDhikrIndex, 1);
  assert.equal(state.currentDhikrCount, 7);
  // Тот же состав — тот же state, счёт не трогается.
  assert.equal(model.setSequence(state, model.DEFAULT_SEQUENCE), state);
  assert.equal(model.setSequence(state, [...model.DEFAULT_SEQUENCE, { id: 'zzz', target: 3 }, null]), state);

  const junk = [null, 'str', { id: 'nope', target: 5 }, { id: 'subhanallah', target: 0 }, { id: 'astaghfirullah', target: 12.6 },
    { id: 'la_hawla', target: 5000 }, { id: 'salawat', target: 'x' }, { id: 'hasbunallah' }, { id: 'allahuakbar', target: -Infinity }];
  const input = junk.slice();
  const cleaned = model.setSequence(state, junk);
  assert.deepEqual(cleaned.sequence, [
    { id: 'subhanallah', target: 1 }, { id: 'astaghfirullah', target: 13 }, { id: 'la_hawla', target: 999 },
    { id: 'salawat', target: 33 }, { id: 'hasbunallah', target: 33 }, { id: 'allahuakbar', target: 1 },
  ]);
  assert.deepEqual(junk, input);
  assert.equal(cleaned.currentDhikrIndex, 0);
  assert.equal(cleaned.currentDhikrCount, 0);
  assert.equal(cleaned.totalDhikrCount, 40);
  assert.equal(cleaned.selectedDhikr, 'sequence');

  // Не больше двенадцати шагов; неизвестные поминания места не занимают.
  const many = Array.from({ length: 20 }, (_, i) => (i % 2 ? { id: 'nope', target: 1 } : { id: 'salawat', target: i + 1 }));
  assert.equal(model.setSequence(state, many).sequence.length, 10);
  const long = Array.from({ length: 20 }, () => ({ id: 'salawat', target: 5 }));
  assert.equal(model.SEQUENCE_MAX_STEPS, 12);
  assert.equal(model.setSequence(state, long).sequence.length, 12);
  // Пустой или негодный ввод — по умолчанию.
  const custom = model.setSequence(state, [{ id: 'salawat', target: 5 }]);
  for (const bad of [[], 'x', null, undefined, [{ id: 'zzz', target: 3 }]]) {
    const back = model.setSequence(custom, bad);
    assert.deepEqual(back.sequence, model.DEFAULT_SEQUENCE);
    assert.equal(back.currentDhikrCount, 0);
  }
  assert.equal(model.setSequence(state, []), state);
  // Результат не делит объекты ни с входом, ни с DEFAULT_SEQUENCE.
  const copy = model.setSequence(state, [{ id: 'salawat', target: 5 }, ...model.DEFAULT_SEQUENCE]);
  assert.notEqual(copy.sequence[1], model.DEFAULT_SEQUENCE[0]);
  assert.notEqual(model.initialState().sequence[0], model.DEFAULT_SEQUENCE[0]);

  // Вне режима последовательности счёт текущего поминания остаётся.
  const free = taps(5, model.selectDhikr(model.initialState(), 'free'));
  const edited = model.setSequence(free, CLASSIC);
  assert.deepEqual(edited.sequence, CLASSIC);
  assert.equal(edited.selectedDhikr, 'free');
  assert.equal(edited.currentDhikrCount, 5);
});
test('removing a custom remembrance drops its steps from the sequence', () => {
  let state = model.addCustomDhikr(model.initialState(), { text: 'Mine' });
  const id = state.customDhikr[0].id;
  const cid = `custom:${id}`;
  state = model.setSequence(state, [{ id: 'subhanallah', target: 33 }, { id: cid, target: 5 }, { id: 'allahuakbar', target: 34 }, { id: cid, target: 9 }]);
  state = taps(36, state);
  assert.equal(state.currentDhikrIndex, 1);
  const removed = model.removeCustomDhikr(state, id);
  assert.deepEqual(removed.sequence, [{ id: 'subhanallah', target: 33 }, { id: 'allahuakbar', target: 34 }]);
  assert.deepEqual(removed.customDhikr, []);
  assert.equal(removed.selectedDhikr, 'sequence');
  assert.equal(removed.currentDhikrIndex, 0);
  assert.equal(removed.currentDhikrCount, 0);

  // Единственный шаг — возвращается последовательность по умолчанию.
  let solo = model.addCustomDhikr(model.initialState(), { text: 'Mine' });
  const soloId = solo.customDhikr[0].id;
  solo = taps(3, model.setSequence(solo, [{ id: `custom:${soloId}`, target: 5 }]));
  assert.equal(solo.currentDhikrCount, 3);
  const only = model.removeCustomDhikr(solo, soloId);
  assert.deepEqual(only.sequence, model.DEFAULT_SEQUENCE);
  assert.equal(only.currentDhikrCount, 0);

  // Поминания нет в последовательности — шаги и счёт не меняются.
  const plain = taps(40, model.addCustomDhikr(model.initialState(), { text: 'Other' }));
  const kept = model.removeCustomDhikr(plain, plain.customDhikr[0].id);
  assert.deepEqual(kept.sequence, model.DEFAULT_SEQUENCE);
  assert.equal(kept.currentDhikrIndex, 1);
  assert.equal(kept.currentDhikrCount, 7);

  // Выбрано другое поминание: шаги чистятся, текущий счёт остаётся.
  let single = model.addCustomDhikr(model.initialState(), { text: 'Mine' });
  const sid = single.customDhikr[0].id;
  single = taps(5, model.selectDhikr(model.setSequence(single, [{ id: 'subhanallah', target: 3 }, { id: `custom:${sid}`, target: 4 }]), 'astaghfirullah'));
  const after = model.removeCustomDhikr(single, sid);
  assert.deepEqual(after.sequence, [{ id: 'subhanallah', target: 3 }]);
  assert.equal(after.selectedDhikr, 'astaghfirullah');
  assert.equal(after.currentDhikrCount, 5);
});
test('restoreState cleans the sequence and keeps the index inside its steps', () => {
  const base = model.initialState();
  const withoutSequence = { ...base };
  delete withoutSequence.sequence;
  assert.deepEqual(model.restoreState(withoutSequence).sequence, model.DEFAULT_SEQUENCE);
  for (const junk of ['x', 5, {}, [], [{ id: 'zzz', target: 3 }], null]) {
    assert.deepEqual(model.restoreState({ ...base, sequence: junk }).sequence, model.DEFAULT_SEQUENCE);
  }
  // Свои поминания проверяются по сохранённому списку.
  const raw = { ...base, customDhikr: [{ id: 'c1', text: 'Mine' }], currentDhikrIndex: 5, currentDhikrCount: 3,
    sequence: [{ id: 'custom:c1', target: 7 }, { id: 'custom:c2', target: 7 }, { id: 'subhanallah', target: 2000 }] };
  const state = model.restoreState(raw);
  assert.deepEqual(state.sequence, [{ id: 'custom:c1', target: 7 }, { id: 'subhanallah', target: 999 }]);
  assert.equal(state.currentDhikrIndex, 1);
  assert.equal(state.currentDhikrCount, 3);
  assert.equal(model.definition(state).id, 'subhanallah');
  // Сохранённый счёт обрезается по цели своего шага.
  assert.equal(model.restoreState({ ...raw, currentDhikrIndex: 0, currentDhikrCount: 500 }).currentDhikrCount, 7);
  // Нормальная последовательность проходит как есть.
  assert.deepEqual(model.restoreState({ ...base, sequence: CLASSIC }).sequence, CLASSIC);
});

const fruitingTree = (id = 't1', species = 'olive') => ({ id, species, progress: 2500, activeDays: 40, stage: 7, lastGrowDate: null, plantedOn: null, harvested: true });
test('growth of a fruiting tree is kept in the reserve up to the cap, then goes to the next planted seed', () => {
  assert.equal(model.RESERVE_CAP, model.STAGES[5].requiredProgress);
  assert.equal(model.RESERVE_CAP, 1000);
  assert.equal(model.initialState().reserve, 0);
  assert.equal(taps(50).reserve, 0);
  const fruiting = { ...model.initialState(), seeds: { fig: 2 }, trees: [fruitingTree()] };
  let state = taps(10, fruiting);
  assert.equal(state.reserve, 20);
  assert.equal(model.activeTree(state).stage, 7);
  assert.equal(state.pendingDrops.length, 0);
  state = taps(2000, state);
  assert.equal(state.reserve, model.RESERVE_CAP);

  const planted = model.plantSeed(state, 'fig', day);
  const tree = model.activeTree(planted);
  assert.equal(tree.species, 'fig');
  assert.equal(tree.progress, 1000);
  assert.equal(tree.stage, 5);
  assert.equal(tree.harvested, false);
  assert.equal(tree.activeDays, 0);
  assert.equal(planted.reserve, 0);
  assert.equal(planted.seeds.fig, 1);
  // Запас отдан один раз: следующее дерево начинает с нуля.
  const second = model.activeTree(model.plantSeed(planted, 'fig', day));
  assert.equal(second.progress, 0);
  assert.equal(second.stage, 0);
  // Небольшой запас даёт ту стадию, которую заслуживает.
  assert.equal(model.activeTree(model.plantSeed({ ...fruiting, reserve: 20 }, 'fig', day)).stage, 0);
  assert.equal(model.activeTree(model.plantSeed({ ...fruiting, reserve: 40 }, 'fig', day)).stage, 1);
  // Посаженное дерево растёт дальше и обычным порядком, запас больше не копится.
  const grown = taps(1, planted, '2026-09-14');
  assert.equal(model.activeTree(grown).progress, 1002);
  assert.equal(grown.reserve, 0);
});
test('reserve only grows while the active tree is fruiting; a younger active tree grows itself', () => {
  const young = { id: 't2', species: 'fig', progress: 0, activeDays: 0, stage: 0, lastGrowDate: null, plantedOn: null, harvested: false };
  const state = { ...model.initialState(), trees: [fruitingTree(), young], activeTreeId: 't2' };
  const next = taps(5, state);
  assert.equal(next.reserve, 0);
  assert.equal(next.trees.find(t => t.id === 't2').progress, 10);
  assert.equal(next.trees.find(t => t.id === 't1').progress, 2500);
});
test('v2 saves migrate to v3: default sequence, empty reserve, trees catch up to the new thresholds, old drops stay', () => {
  const tree = (id, species, progress, stage, harvested = false) => ({ id, species, progress, activeDays: 7, stage, lastGrowDate: day, plantedOn: null, harvested });
  const v2 = { version: 2, selectedDhikr: 'allahuakbar', currentDhikrIndex: 2, currentDhikrCount: 12, totalDhikrCount: 500,
    perDhikrCounts: { subhanallah: 400 }, dailyDhikrCounts: { [day]: 20 }, lastActiveDate: day, activeDays: 5, hasSeenTasbihHint: true,
    trees: [tree('t1', 'olive', 700, 3), tree('t2', 'fig', 10, 1), tree('t3', 'sidr', 5300, 6)], activeTreeId: 't1',
    seeds: { fig: 2 }, lastCircleDropDate: '2026-09-10', reserve: 500,
    pendingDrops: [{ species: 'fig', reason: 'week' }, { species: 'olive', reason: 'circle' }],
    circleLimit: false, customDhikr: [{ id: 'c1', text: 'Mine' }] };
  const state = model.restoreState(v2);
  assert.equal(state.version, 3);
  assert.deepEqual(state.sequence, model.DEFAULT_SEQUENCE);
  assert.equal(state.reserve, 0);
  assert.ok(!('lastCircleDropDate' in state));
  assert.deepEqual(state.trees.map(t => [t.id, t.stage, t.progress]), [['t1', 4, 700], ['t2', 1, 10], ['t3', 7, 5300]]);
  assert.equal(state.activeTreeId, 't1');
  assert.deepEqual(state.pendingDrops, [{ species: 'fig', reason: 'week' }, { species: 'olive', reason: 'circle' }]);
  assert.deepEqual(state.seeds, { fig: 2 });
  assert.equal(state.selectedDhikr, 'allahuakbar');
  assert.equal(state.currentDhikrIndex, 2);
  assert.equal(state.currentDhikrCount, 12);
  assert.equal(state.circleLimit, false);
  assert.equal(state.customDhikr.length, 1);
  assert.equal(state.totalDhikrCount, 500);
  assert.equal(state.activeDays, 5);
  // Дерево, дошедшее до плодов только по новым порогам, зерно ещё не отдавало: оно выдаётся на касании.
  const fruited = model.restoreState({ ...v2, activeTreeId: 't3' });
  assert.equal(model.activeTree(fruited).harvested, false);
  const paid = model.registerDhikr(fruited, '2026-09-14', { rng: () => 0 });
  assert.deepEqual(paid.pendingDrops.map(d => d.reason), ['week', 'circle', 'harvest']);

  // Сохранение v3 стадии не подтягивает, а запас чистит.
  const v3 = model.restoreState({ ...model.initialState(), trees: [tree('t1', 'olive', 700, 3)] });
  assert.equal(model.activeTree(v3).stage, 3);
  const reserveOf = reserve => model.restoreState({ ...model.initialState(), reserve }).reserve;
  assert.equal(reserveOf(12.5), 12.5);
  assert.equal(reserveOf(5000), model.RESERVE_CAP);
  for (const bad of [-3, 'x', NaN, Infinity, null, undefined]) assert.equal(reserveOf(bad), 0);
  assert.deepEqual(model.restoreState({ version: 4 }), model.initialState());
  assert.deepEqual(model.restoreState(JSON.parse(JSON.stringify(state))), state);
});

// ---- Курс «Чтение по слогам» ----
const course = load('src/constants/alphabetCourse.js');
const alphabetStore = new Map();
const alphabet = loader({
  './helpers': {
    loadJSON: async (key, fallback) => (alphabetStore.has(key) ? JSON.parse(alphabetStore.get(key)) : fallback),
    saveJSON: async (key, value) => { alphabetStore.set(key, JSON.stringify(value)); },
  },
})('src/utils/alphabetEngine.js');
// Прогресс: вступление, все буквы и проверки уроков до upTo (не включая его).
function progressBefore(upTo, extra = {}) {
  const p = { intro: true, letters: {}, quiz: {} };
  for (const lesson of course.LESSONS.slice(0, upTo)) {
    for (const l of lesson.letters) p.letters[l.id] = true;
    p.quiz[lesson.index] = 1;
  }
  return { ...p, ...extra };
}

test('alphabet course data: 28 letters, 7 lessons cover each letter once, every item has a recording', () => {
  const { ALPHABET, LESSONS, INTRO, audioFor, letterName } = course;
  assert.equal(ALPHABET.length, 28);
  assert.deepEqual(ALPHABET.map(l => l.id), Array.from({ length: 28 }, (_, i) => i + 1));
  assert.deepEqual(LESSONS.map(l => l.letters.length), [4, 4, 4, 4, 6, 4, 2]);
  assert.deepEqual(LESSONS.map(l => l.index), [0, 1, 2, 3, 4, 5, 6]);
  const covered = LESSONS.flatMap(l => l.letters.map(x => x.id));
  assert.deepEqual([...covered].sort((a, b) => a - b), ALPHABET.map(l => l.id));
  assert.equal(INTRO.length, 13);
  for (const lang of ['ru', 'en']) {
    const names = ALPHABET.map(l => letterName(l, lang));
    assert.equal(new Set(names).size, 28, `names unique in ${lang}`);
  }
  for (const letter of ALPHABET) {
    assert.ok(letter.sound_ru && letter.sound_en, `sound ${letter.id}`);
    assert.ok(Number.isInteger(letter.order) && letter.order >= 1 && letter.order <= 28, `order ${letter.id}`);
    assert.equal(!letter.tip_ru, !letter.tip_en, `tip ${letter.id}`);
    assert.equal(letter.items[0].kind, 'letter');
    assert.equal(letter.items[0].ar, letter.ar);
    assert.deepEqual(letter.items.slice(1, 4).map(i => i.kind), ['vowel', 'vowel', 'vowel']);
    for (const item of letter.items) {
      assert.ok(['letter', 'vowel', 'syllable', 'word'].includes(item.kind));
      assert.ok(audioFor(item.key), `no recording for ${item.key}`);
      assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'assets', 'alphabet', `${item.key}.m4a`)), `no file ${item.key}`);
    }
  }
  // Место в алфавите, соединение и твёрдость сверены с классическим алфавитом.
  assert.deepEqual(ALPHABET.map(l => l.order), [1, 10, 11, 24, 3, 25, 28, 2, 22, 23, 27, 26, 20, 21, 13, 12, 4, 14, 16, 5, 7, 6, 19, 18, 8, 15, 9, 17]);
  assert.deepEqual(ALPHABET.filter(l => !l.joinsNext).map(l => l.ar).sort(), ['ا', 'د', 'ذ', 'ر', 'ز', 'و'].sort());
  assert.deepEqual(ALPHABET.filter(l => l.heavy).map(l => l.ar).sort(), ['خ', 'ص', 'ض', 'ط', 'ظ', 'غ', 'ق'].sort());
  assert.equal(audioFor(null), null);
  assert.equal(audioFor('no-such-key'), null);
  for (const step of INTRO) {
    assert.ok(step.text_ru || step.points, 'step has text or points');
    assert.equal(!step.text_ru, !step.text_en, 'text in both languages');
    assert.equal(!step.title_ru, !step.title_en, 'title in both languages');
    assert.ok(step.button_ru && step.button_en);
    for (const p of step.points || []) assert.ok(p.ru && p.en);
    for (const m of step.marks || []) assert.ok(m.name_ru && m.name_en && m.where_ru && m.where_en && m.sound && m.sound_en);
    // Синтезатор речи во вступлении не звучит: у каждой арабской карточки и
    // строки таблицы огласовок есть запись диктора, и файл лежит в бандле.
    if (step.ar) assert.ok(step.audio && audioFor(step.audio), `intro card without recording: ${step.ar}`);
    for (const m of step.marks || []) assert.ok(m.audio && audioFor(m.audio), `mark without recording: ${m.ar}`);
  }
  for (const key of ['intro-baba', 'intro-babi', 'intro-bubi']) {
    assert.ok(audioFor(key), `no recording for ${key}`);
    assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'assets', 'alphabet', `${key}.m4a`)), `no file ${key}`);
  }
});

test('arabic text: fitted size has a floor, wraps instead of shrinking, mixed runs are found', () => {
  const { fitArabicSize, splitArabicRuns, isMixedArabic } = load('src/utils/arabicText.js');
  const zikr = { base: { fontSize: 34, lineHeight: 64 }, min: 24, maxLines: 2, maxHeight: 96 };
  // Помещается — обычный кегль; неизвестная рамка — тоже.
  assert.deepEqual(fitArabicSize({ ...zikr, total: 300, boxW: 342 }), { fontSize: 34, lineHeight: 64, lines: 1 });
  assert.deepEqual(fitArabicSize({ ...zikr, total: 342, boxW: 342 }), { fontSize: 34, lineHeight: 64, lines: 1 });
  assert.deepEqual(fitArabicSize({ ...zikr, total: 900, boxW: 0 }), { fontSize: 34, lineHeight: 64, lines: 1 });
  // Чуть длиннее рамки — ужимается в одну строку, межстрочный вместе с кеглем.
  assert.deepEqual(fitArabicSize({ ...zikr, total: 400, boxW: 342 }), { fontSize: 27, lineHeight: 51, lines: 1 });
  // Перенёсся, хотя сумма строк без пробела на переносе не больше рамки, —
  // всё равно ужимается, а не идёт в две строки полным кеглем.
  assert.deepEqual(fitArabicSize({ ...zikr, total: 320, boxW: 327, wrapped: true }), { fontSize: 32, lineHeight: 60, lines: 1 });
  assert.deepEqual(fitArabicSize({ ...zikr, total: 320, boxW: 327 }), { fontSize: 34, lineHeight: 64, lines: 1 });
  // В одну строку только мельче 24 — две строки, но не полным кеглем: высота.
  assert.deepEqual(fitArabicSize({ ...zikr, total: 520, boxW: 342 }), { fontSize: 25, lineHeight: 47, lines: 2 });
  assert.deepEqual(fitArabicSize({ ...zikr, maxHeight: undefined, total: 520, boxW: 342 }), { fontSize: 34, lineHeight: 64, lines: 2 });
  // Очень длинный — нижний кегль и последняя разрешённая строка, не точки.
  assert.deepEqual(fitArabicSize({ ...zikr, total: 2000, boxW: 342 }), { fontSize: 24, lineHeight: 45, lines: 2 });
  // Карточка урока: одна строка, не мельче 40.
  const card = { base: { fontSize: 64, lineHeight: 120 }, min: 40 };
  assert.deepEqual(fitArabicSize({ ...card, total: 300, boxW: 279 }), { fontSize: 57, lineHeight: 107, lines: 1 });
  assert.deepEqual(fitArabicSize({ ...card, total: 600, boxW: 279 }), { fontSize: 40, lineHeight: 75, lines: 1 });

  assert.equal(isMixedArabic('Алиф · ا'), true);
  assert.equal(isMixedArabic('Lesson 1 · Ba ب'), true);
  assert.equal(isMixedArabic('بَبَ'), false);
  assert.equal(isMixedArabic('Урок 1'), false);
  assert.equal(isMixedArabic(5), false);
  assert.deepEqual(splitArabicRuns('Алиф · ا'), [{ text: 'Алиф · ', arabic: false }, { text: 'ا', arabic: true }]);
  assert.deepEqual(splitArabicRuns('С огласовкой (اَ اِ اُ) читается'), [
    { text: 'С огласовкой (', arabic: false }, { text: 'اَ اِ اُ', arabic: true }, { text: ') читается', arabic: false },
  ]);
});

test('alphabet course: opening rules follow intro, letter order and passed quizzes', () => {
  const { isIntroDone, isLetterOpen, isQuizOpen, lettersDone, totalStars, nextStep } = alphabet;
  const fresh = { intro: false, letters: {}, quiz: {} };
  assert.equal(isIntroDone(fresh), false);
  assert.equal(isIntroDone(undefined), false);
  assert.equal(isLetterOpen(fresh, 0, 0), false); // без вступления закрыто всё
  const afterIntro = { ...fresh, intro: true };
  assert.equal(isIntroDone(afterIntro), true);
  assert.equal(isLetterOpen(afterIntro, 0, 0), true);
  assert.equal(isLetterOpen(afterIntro, 0, 1), false);
  assert.equal(isLetterOpen(afterIntro, 1, 0), false);
  const first = { ...afterIntro, letters: { 1: true } };
  assert.equal(isLetterOpen(first, 0, 1), true);
  assert.equal(isLetterOpen(first, 0, 2), false);
  assert.equal(isQuizOpen(first, 0), false);
  // Проверка открывается, когда пройдены все буквы урока (id 1..4).
  const all = { ...afterIntro, letters: { 1: true, 2: true, 3: true, 4: true } };
  assert.equal(isQuizOpen(all, 0), true);
  assert.equal(isQuizOpen(all, 1), false);
  // Первая буква урока 1 ждёт проверку урока 0, сданную хотя бы на звезду.
  assert.equal(isLetterOpen(all, 1, 0), false);
  assert.equal(isLetterOpen({ ...all, quiz: { 0: 0 } }, 1, 0), false);
  assert.equal(nextStep({ ...all, quiz: { 0: 0 } }).type, 'quiz');
  assert.equal(isLetterOpen({ ...all, quiz: { 0: 1 } }, 1, 0), true);
  assert.equal(isLetterOpen({ ...all, quiz: { 0: 1 } }, 1, 1), false);
  // Несуществующие позиции закрыты.
  assert.equal(isLetterOpen(all, 0, 9), false);
  assert.equal(isLetterOpen(all, 9, 0), false);
  assert.equal(lettersDone(all), 4);
  assert.equal(lettersDone(fresh), 0);
  assert.equal(totalStars({ ...fresh, quiz: { 0: 3, 1: 2, 2: 0 } }), 5);
  assert.equal(totalStars(fresh), 0);
  // Звёзды по точности.
  assert.deepEqual([[8, 8], [7, 8], [6, 8], [4, 8], [3, 8], [0, 0]].map(([c, t]) => alphabet.starsFor(c, t)), [3, 2, 2, 1, 0, 0]);
});

test('alphabet course: nextStep walks intro, letters, quiz, then done', () => {
  const { nextStep } = alphabet;
  const { LESSONS } = course;
  assert.deepEqual(nextStep({ intro: false, letters: {}, quiz: {} }), { type: 'intro' });
  assert.deepEqual(nextStep(undefined), { type: 'intro' });
  assert.deepEqual(nextStep({ intro: true, letters: {}, quiz: {} }), { type: 'letter', lessonIndex: 0, letterId: LESSONS[0].letters[0].id });
  assert.deepEqual(nextStep({ intro: true, letters: { 1: true }, quiz: {} }), { type: 'letter', lessonIndex: 0, letterId: LESSONS[0].letters[1].id });
  assert.deepEqual(nextStep(progressBefore(0, { letters: { 1: true, 2: true, 3: true, 4: true } })), { type: 'quiz', lessonIndex: 0 });
  assert.deepEqual(nextStep(progressBefore(1)), { type: 'letter', lessonIndex: 1, letterId: LESSONS[1].letters[0].id });
  assert.deepEqual(nextStep(progressBefore(7)), { type: 'done' });
});

test('alphabet course: progress persists, keeps the best quiz result and survives damaged storage', async () => {
  alphabetStore.clear();
  assert.deepEqual(await alphabet.getAlphabetProgress(), { intro: false, letters: {}, quiz: {} });
  await alphabet.completeIntro();
  await alphabet.completeLetter(1);
  await alphabet.completeQuiz(0, 2);
  await alphabet.completeQuiz(0, 1); // слабее — не затирает
  await alphabet.completeQuiz(1, 0);
  let p = await alphabet.getAlphabetProgress();
  assert.equal(p.intro, true);
  assert.deepEqual(p.letters, { 1: true });
  assert.deepEqual(p.quiz, { 0: 2, 1: 0 });
  await alphabet.completeQuiz(0, 3);
  p = await alphabet.getAlphabetProgress();
  assert.equal(p.quiz[0], 3);
  assert.ok(alphabetStore.has('alphabetProgress'));
  alphabetStore.set('alphabetProgress', JSON.stringify('мусор'));
  assert.deepEqual(await alphabet.getAlphabetProgress(), { intro: false, letters: {}, quiz: {} });
});

test('alphabet quiz: 8 exercises with the correct answer among 4 unique options, in every lesson', () => {
  const { LESSONS, letterName } = course;
  const letterOf = item => Number(item.key.split('-')[0]);
  for (const lesson of LESSONS) {
    for (let run = 0; run < 25; run++) {
      const quiz = alphabet.buildQuiz(lesson.index);
      assert.equal(quiz.length, 8);
      const count = type => quiz.filter(e => e.type === type).length;
      assert.equal(count('listen_choose'), 5);
      assert.equal(count('name_choose'), 2);
      assert.equal(count('match_pairs'), 1);
      const learnedIds = new Set(LESSONS.slice(0, lesson.index + 1).flatMap(l => l.letters.map(x => x.id)));
      const lessonIds = new Set(lesson.letters.map(l => l.id));

      const listen = quiz.filter(e => e.type === 'listen_choose');
      for (const e of listen) {
        assert.ok(e.correct.key && e.correct.kind !== 'letter');
        assert.equal(e.options.length, 4);
        assert.equal(new Set(e.options.map(o => o.ar)).size, 4, 'ar unique');
        assert.ok(e.options.some(o => o.key === e.correct.key), 'correct among options');
        assert.equal(e.options.filter(o => o.ar === e.correct.ar).length, 1);
        for (const o of e.options) {
          assert.equal(o.kind, e.correct.kind, 'same kind');
          assert.ok(learnedIds.has(letterOf(o)), 'only learned letters');
        }
      }
      assert.equal(new Set(listen.map(e => e.correct.ar)).size, 5, 'correct answers differ');
      const fromLesson = listen.filter(e => lessonIds.has(letterOf(e.correct))).length;
      assert.equal(fromLesson, lesson.index === 0 ? 5 : 4, 'one review item after lesson 1');
      assert.ok(listen.filter(e => e.correct.kind === 'word').length >= 2, 'words dominate');

      const named = quiz.filter(e => e.type === 'name_choose');
      for (const e of named) {
        assert.equal(e.options.length, 4);
        assert.ok(e.options.some(o => o.id === e.correct.id));
        assert.equal(new Set(e.options.map(o => o.id)).size, 4);
        for (const lang of ['ru', 'en']) assert.equal(new Set(e.options.map(o => letterName(o, lang))).size, 4);
        assert.ok(e.options.every(o => learnedIds.has(o.id)));
      }
      assert.equal(new Set(named.map(e => e.correct.id)).size, 2);

      const match = quiz.find(e => e.type === 'match_pairs');
      assert.equal(match.items.length, 4);
      assert.equal(new Set(match.items.map(l => l.id)).size, 4);
      assert.ok(match.items.every(l => learnedIds.has(l.id)));
      // Буквы урока идут первыми: пары из прежних уроков только при нехватке.
      assert.equal(match.items.filter(l => lessonIds.has(l.id)).length, Math.min(4, lesson.letters.length));
    }
  }
  // Урок 6 состоит из двух букв: пары добираются до четырёх из прежних уроков.
  const last = alphabet.buildQuiz(6).find(e => e.type === 'match_pairs');
  assert.equal(last.items.length, 4);
  assert.equal(last.items.filter(l => l.id >= 27).length, 2);
});

// Официальный график ДУМ КБР (assets/prayer-tables/ru-kbr-2026.json) привязан
// к поясу +03:00, поэтому эти тесты задают пояс сами. Прежний пояс
// возвращается присвоением его имени: на Windows delete process.env.TZ
// действующий пояс процесса не восстанавливает.
async function inZone(zone, fn) {
  const before = Intl.DateTimeFormat().resolvedOptions().timeZone;
  process.env.TZ = zone;
  try { return await fn(); } finally { process.env.TZ = before; }
}
// adhan в node не загружается (его cjs-сборка помечена как ES-модуль), а для
// источника «ДУМ КБР» он и не нужен.
const withoutAdhan = (extra = {}) => loader({ './prayerCalc': { computePrayerTimes: () => null }, ...extra });
const NALCHIK = { lat: 43.4981, lng: 43.6189 };
const KBR_OCT8 = { Fajr: '04:41', Sunrise: '06:11', Dhuhr: '12:03', Asr: '15:08', Maghrib: '17:37', Isha: '19:17' };

test('the official KBR timetable covers the republic and its dates only', () => inZone('Europe/Moscow', () => {
  const { officialTimes } = load('src/utils/officialTables.js');
  const oct8 = new Date(2026, 9, 8, 12);
  // Сверено с kbrdum.ru/8-grafik-namazov на 8 октября 2026.
  assert.deepEqual(officialTimes('ru-kbr', NALCHIK, oct8), KBR_OCT8);
  // График один на всю республику: Баксан и Терскол получают ту же строку.
  assert.equal(officialTimes('ru-kbr', { lat: 43.68, lng: 43.53 }, oct8).Asr, '15:08');
  assert.equal(officialTimes('ru-kbr', { lat: 43.255, lng: 42.51 }, oct8).Asr, '15:08');
  // Известный регион решает сам, как бы его ни назвал геокодер.
  assert.equal(officialTimes('ru-kbr', { ...NALCHIK, region: 'Кабардино-Балкарская Республика' }, oct8).Asr, '15:08');
  assert.equal(officialTimes('ru-kbr', { lat: 43.255, lng: 42.51, region: 'Kabardino-Balkariya' }, oct8).Asr, '15:08');
  // Пятигорск ближе к Нальчику, чем Терскол, а Назрань ещё внутри круга в
  // 100 км, но у обоих свои управления.
  assert.equal(officialTimes('ru-kbr', { lat: 43.2257, lng: 44.7645, region: 'Ingushetia' }, oct8), null);
  assert.equal(officialTimes('ru-kbr', { lat: 44.0486, lng: 43.0594, region: 'Ставропольский край' }, oct8), null);
  // Без региона — круг 100 км: Москва вне его.
  assert.equal(officialTimes('ru-kbr', { lat: 55.7558, lng: 37.6173 }, oct8), null);
  // Пустые координаты не превращаются во время Нальчика.
  assert.equal(officialTimes('ru-kbr', { lat: NaN, lng: NaN }, oct8), null);
  assert.equal(officialTimes('ru-kbr', {}, oct8), null);
  // Вне дат таблицы и для чужого графика таблицы нет.
  assert.equal(officialTimes('ru-kbr', NALCHIK, new Date(2026, 8, 30, 12)), null);
  assert.equal(officialTimes('ru-kbr', NALCHIK, new Date(2027, 0, 1, 12)), null);
  assert.equal(officialTimes('ru-tatarstan', { lat: 55.79, lng: 49.12 }, oct8), null);
}));
test('the KBR timetable is used only where the device clock is at +03:00', async () => {
  const pick = () => load('src/utils/officialTables.js').officialTimes('ru-kbr', NALCHIK, new Date(2026, 9, 8, 12));
  // В другом поясе строка таблицы стала бы чужим временем: Аср на час раньше.
  assert.equal(await inZone('Asia/Baku', pick), null);
  assert.equal(await inZone('UTC', pick), null);
  // Тот же пояс под другим именем подходит.
  assert.equal((await inZone('Europe/Istanbul', pick)).Asr, '15:08');
});
test('the DUM KBR source reads the timetable, and tune applies on top', () => inZone('Europe/Moscow', async () => {
  const { getPrayerTimes2, localTimesForDate } = withoutAdhan()('src/utils/prayerSource.js');
  const { computeDumKbr } = load('src/utils/dumCalc.js');
  const oct8 = new Date(2026, 9, 8, 12);
  const opts = { ...NALCHIK, region: 'Кабардино-Балкарская Республика', sourceId: 'russia', date: oct8 };
  assert.deepEqual(await getPrayerTimes2(opts), KBR_OCT8);
  assert.equal((await getPrayerTimes2({ ...opts, tune: { Asr: 2 } })).Asr, '15:10');
  assert.equal(localTimesForDate(opts).Asr, '15:08');
  // За пределами таблицы — по датам или по региону — считает формула.
  const jan1 = new Date(2027, 0, 1, 12);
  assert.deepEqual(await getPrayerTimes2({ ...opts, date: jan1 }), computeDumKbr(NALCHIK.lat, NALCHIK.lng, jan1));
  assert.deepEqual(await getPrayerTimes2({ ...opts, region: 'Ingushetia' }), computeDumKbr(NALCHIK.lat, NALCHIK.lng, oct8));
}));
test('a day cached before the timetable is recomputed from it', () => inZone('Europe/Moscow', async () => {
  const store = new Map();
  const storage = { getItem: async (k) => store.get(k), setItem: async (k, v) => store.set(k, v) };
  const schedule = withoutAdhan({ '@react-native-async-storage/async-storage': storage })('src/utils/prayerSchedule.js');
  const options = { ...NALCHIK, region: 'Кабардино-Балкарская Республика', sourceId: 'russia', school: 'shafi' };
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Так выглядел ключ дня до таблицы: без региона и версии графиков. Под ним
  // время по формуле — Аср 15:11, Иша 19:18.
  const before = JSON.stringify([NALCHIK.lat, NALCHIK.lng, 'russia', 'shafi', {}, zone]);
  store.set('prayerDay:v2:' + before + ':2026-10-08',
    JSON.stringify({ date: '2026-10-08', timings: { ...KBR_OCT8, Asr: '15:11', Isha: '19:18' } }));
  const day = await schedule.getPrayerDay(options, new Date(2026, 9, 8, 12));
  assert.deepEqual(day.timings, KBR_OCT8);
  // Ключи других источников график не трогает: их сохранённые дни живут дальше.
  assert.equal(schedule.scheduleIdentity({ ...options, sourceId: 'mwl_intl' }),
    JSON.stringify([NALCHIK.lat, NALCHIK.lng, 'mwl_intl', 'shafi', {}, zone]));
}));
test('the cache key of the DUM KBR source carries the region and the timetable version', () => inZone('Europe/Moscow', () => {
  const { tablesVersion } = load('src/utils/officialTables.js');
  const schedule = withoutAdhan()('src/utils/prayerSchedule.js');
  const base = { ...NALCHIK, sourceId: 'russia', school: 'shafi' };
  const key = schedule.scheduleIdentity({ ...base, region: 'Кабардино-Балкарская Республика' });
  assert.ok(key.includes(tablesVersion()));
  assert.notEqual(key, schedule.scheduleIdentity({ ...base, region: 'Ingushetia' }));
  assert.notEqual(key, schedule.scheduleIdentity(base));
  // Исправленная в таблице цифра меняет версию, а с ней и ключи дней.
  const table = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/prayer-tables/ru-kbr-2026.json'), 'utf8'));
  table.days[10] = table.days[10].replace('15:04', '15:05');
  const edited = loader({ '../../assets/prayer-tables/ru-kbr-2026.json': table })('src/utils/officialTables.js');
  assert.notEqual(edited.tablesVersion(), tablesVersion());
}));
test('the time zone is taken at noon of the calendar day, so the answer does not depend on the hour', () => inZone('Europe/Helsinki', () => {
  const pick = (d) => load('src/utils/officialTables.js').officialTimes('ru-kbr', NALCHIK, d);
  // Хельсинки летом +03:00, с 25 октября 2026 — +02:00.
  assert.ok(pick(new Date(2026, 9, 24, 12)));
  // В день перевода часов решает полдень, а не час, на который пришёлся запрос.
  assert.equal(pick(new Date(2026, 9, 25, 0, 30)), null);
  assert.equal(pick(new Date(2026, 9, 25, 12)), null);
}));
test('every row of the KBR timetable is plausible, so a transcription slip is caught', () => inZone('Europe/Moscow', () => {
  const table = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/prayer-tables/ru-kbr-2026.json'), 'utf8'));
  const { computeDumKbr } = load('src/utils/dumCalc.js');
  const minutes = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const names = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const [y, mo, d] = table.start.split('-').map(Number);
  // 1 октября – 31 декабря: пропущенная строка сдвинула бы все следующие даты.
  assert.equal(table.days.length, 92);
  let prev = null;
  table.days.forEach((row, i) => {
    const date = new Date(y, mo - 1, d + i, 12);
    const times = row.split(' ').map(minutes);
    assert.equal(times.length, 6, row);
    // Порядок внутри дня.
    times.slice(1).forEach((t, k) => assert.ok(t > times[k], `${row}: ${names[k + 1]}`));
    // Свойства самого графика в октябре–декабре: Фаджр ровно за 90 минут до
    // восхода, Иша через 100 минут после Магриба (3 декабря — 101, так в
    // графике). Ловят описки в четырёх колонках из шести.
    assert.equal(times[1] - times[0], 90, `day ${i}: sunrise - fajr`);
    const dec3 = date.getMonth() === 11 && date.getDate() === 3;
    assert.equal(times[5] - times[4], dec3 ? 101 : 100, `day ${i}: isha - maghrib`);
    // Соседние дни отличаются не больше чем на три минуты.
    if (prev) times.forEach((t, k) => assert.ok(Math.abs(t - prev[k]) <= 3, `day ${i}: ${names[k]}`));
    // И не дальше трёх минут от формулы ДУМ КБР: опечатка в часах или
    // десятках минут уводит дальше.
    const calc = computeDumKbr(table.place.lat, table.place.lng, date);
    names.forEach((n, k) => assert.ok(Math.abs(times[k] - minutes(calc[n])) <= 3, `day ${i}: ${n} ${row} vs ${calc[n]}`));
    prev = times;
  });
}));

// Графики высоких широт переносят намаз через полночь: ДУМ РТ в мае пишет
// Фаджр в строке даты D как 23:54 (по смыслу это вечер D−1), а Иша у формулы
// dumCalc и у северных графиков бывает уже после полуночи. Событие, уведомление
// и окно будильника должны стоять на настоящем моменте, а не на дате строки.
const nightRow = (date, timings) => ({ date, timings: { Fajr: '02:14', Sunrise: '03:52', Dhuhr: '11:41',
  Asr: '16:03', Maghrib: '19:20', Isha: '23:21', ...timings } });
const KAZAN_MAY = [
  nightRow('2026-05-04', { Fajr: '01:12', Sunrise: '03:52', Isha: '23:21' }),
  nightRow('2026-05-05', { Fajr: '23:54', Sunrise: '03:49', Dhuhr: '11:41', Asr: '16:04', Maghrib: '19:22', Isha: '23:57' }),
  nightRow('2026-05-06', { Fajr: '01:49', Sunrise: '03:47', Asr: '16:05', Maghrib: '19:24', Isha: '23:12' }),
];
const scheduleOnly = () => loader({ '@react-native-async-storage/async-storage': {}, './prayerSource': {} })('src/utils/prayerSchedule.js');
const stamp = (d) => `${dates.localDateKey(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

test('prayerMoment moves a pre-midnight Fajr to the evening before and a post-midnight Isha to the next day', () => inZone('Europe/Moscow', () => {
  const { prayerMoment, prayerDayShift } = load('src/utils/calendarDate.js');
  const [, may5] = KAZAN_MAY;
  assert.equal(stamp(prayerMoment(may5, 'Fajr')), '2026-05-04 23:54');
  // Остальные времена строки остаются на её дате.
  assert.equal(stamp(prayerMoment(may5, 'Sunrise')), '2026-05-05 03:49');
  assert.equal(stamp(prayerMoment(may5, 'Isha')), '2026-05-05 23:57');
  // Иша 00:20 при магрибе 22:40 уходит на следующие сутки, через границу месяца и года тоже.
  const north = (date) => ({ date, timings: { Fajr: '01:10', Sunrise: '03:32', Dhuhr: '12:02', Asr: '16:41', Maghrib: '22:40', Isha: '00:20' } });
  assert.equal(stamp(prayerMoment(north('2026-06-20'), 'Isha')), '2026-06-21 00:20');
  assert.equal(stamp(prayerMoment(north('2026-06-30'), 'Isha')), '2026-07-01 00:20');
  assert.equal(stamp(prayerMoment(north('2026-12-31'), 'Isha')), '2027-01-01 00:20');
  assert.equal(stamp(prayerMoment({ ...may5, date: '2026-06-01' }, 'Fajr')), '2026-05-31 23:54');
  // Обычный день не трогаем, и равенство — не признак переноса.
  const plain = { date: '2026-10-08', timings: { Fajr: '04:41', Sunrise: '06:11', Dhuhr: '12:03', Asr: '15:08', Maghrib: '17:37', Isha: '19:17' } };
  for (const name of Object.keys(plain.timings)) assert.equal(prayerDayShift(plain.timings, name), 0, name);
  assert.equal(prayerDayShift({ Fajr: '03:48', Sunrise: '03:48' }, 'Fajr'), 0);
  assert.equal(prayerDayShift({ Maghrib: '22:40', Isha: '22:40' }, 'Isha'), 0);
  // Без соседнего времени судить нечем, а кривое время — не момент.
  assert.equal(prayerDayShift({ Fajr: '23:54' }, 'Fajr'), 0);
  assert.equal(prayerMoment({ date: '2026-05-05', timings: { Fajr: '--:--', Sunrise: '03:49' } }, 'Fajr'), null);
  assert.equal(prayerMoment({ date: '2026-05-05', timings: { Fajr: '23:54', Sunrise: '--:--' } }, 'Fajr').getDate(), 5);
}));
test('prayerMoment counts calendar days, so a daylight-saving change does not move the hour', () => inZone('Europe/Berlin', () => {
  const { prayerMoment } = load('src/utils/calendarDate.js');
  // 29 марта 2026 в Берлине часы переведены вперёд: от 28-го 23:54 до 29-го 23:54 всего 23 часа.
  const moment = prayerMoment({ date: '2026-03-29', timings: { Fajr: '23:54', Sunrise: '06:40' } }, 'Fajr');
  assert.equal(stamp(moment), '2026-03-28 23:54');
  const isha = prayerMoment({ date: '2026-03-28', timings: { Maghrib: '22:40', Isha: '00:20' } }, 'Isha');
  assert.equal(stamp(isha), '2026-03-29 00:20');
}));
test('events follow the real order across midnight: the Fajr of May 5 comes on the evening of May 4', () => inZone('Europe/Moscow', () => {
  const { prayerEvents, prayerMoment } = scheduleOnly();
  assert.equal(typeof prayerMoment, 'function');
  // Обходим расписание событие за событием через публичный prayerEvents.
  const walked = [];
  for (let now = new Date(2026, 4, 3, 12); walked.length < 14;) {
    const { next } = prayerEvents(KAZAN_MAY, now);
    if (!next) break;
    walked.push(`${next.name} ${stamp(next.date)}`);
    now = new Date(next.date.getTime() + 1000);
  }
  assert.deepEqual(walked, [
    'Fajr 2026-05-04 01:12', 'Dhuhr 2026-05-04 11:41', 'Asr 2026-05-04 16:03', 'Maghrib 2026-05-04 19:20', 'Isha 2026-05-04 23:21',
    // Фаджр строки 5 мая — вечером 4-го, между Ишой и зухром.
    'Fajr 2026-05-04 23:54', 'Dhuhr 2026-05-05 11:41', 'Asr 2026-05-05 16:04', 'Maghrib 2026-05-05 19:22', 'Isha 2026-05-05 23:57',
    'Fajr 2026-05-06 01:49', 'Dhuhr 2026-05-06 11:41', 'Asr 2026-05-06 16:05', 'Maghrib 2026-05-06 19:24',
  ]);
  // Вечером 4 мая ближайший — Иша, за ней Фаджр, а не зухр следующего дня.
  const evening = prayerEvents(KAZAN_MAY, new Date(2026, 4, 4, 22, 0));
  assert.equal(evening.next.name, 'Isha');
  assert.equal(evening.afterNext.name, 'Fajr');
  assert.equal(stamp(evening.afterNext.date), '2026-05-04 23:54');
  // Кольцо считает от Иши (23:21) к Фаджру (23:54): 9 минут из 33.
  const night = prayerEvents(KAZAN_MAY, new Date(2026, 4, 4, 23, 30));
  assert.equal(night.next.name, 'Fajr');
  assert.equal(night.afterNext.name, 'Dhuhr');
  assert.ok(Math.abs(night.progress - 9 / 33) < 1e-9);
}));
test('an Isha after midnight stays ahead of the evening instead of dropping into the past', () => inZone('Europe/Moscow', () => {
  const { prayerEvents } = scheduleOnly();
  const north = (date, extra) => nightRow(date, { Fajr: '01:10', Sunrise: '03:32', Dhuhr: '12:02', Asr: '16:41', Maghrib: '22:40', Isha: '00:20', ...extra });
  // Иша второго дня отличается на минуты: иначе перенос и «такая же строка завтра» неразличимы.
  const days = [north('2026-06-20'), north('2026-06-21', { Fajr: '01:12', Maghrib: '22:39', Isha: '00:26' })];
  const events = prayerEvents(days, new Date(2026, 5, 20, 23, 0));
  assert.equal(events.next.name, 'Isha');
  assert.equal(stamp(events.next.date), '2026-06-21 00:20');
  assert.equal(events.afterNext.name, 'Fajr');
  assert.equal(stamp(events.afterNext.date), '2026-06-21 01:12');
}));
test('the Fajr alarm window starts on the evening before, and waking before midnight silences it after midnight', () => inZone('Europe/Moscow', async () => {
  const stored = { fajrAlarmEnabled: true, fajrAlarmInterval: 5 };
  const scheduled = []; let id = 0;
  const notifications = { getAllScheduledNotificationsAsync: async () => scheduled,
    cancelScheduledNotificationAsync: async (ident) => { const i = scheduled.findIndex(n => n.identifier === ident); if (i >= 0) scheduled.splice(i, 1); },
    scheduleNotificationAsync: async (n) => { scheduled.push({ ...n, identifier: String(id++) }); } };
  const alarm = loader({ 'expo-notifications': { ...notifications, SchedulableTriggerInputTypes: { DATE: 'date' } },
    './prayerNotifications': { ensurePermission: async () => true },
    './helpers': { loadJSON: async (k, f) => stored[k] ?? f, saveJSON: async (k, v) => { stored[k] = v; } },
  })('src/utils/fajrAlarm.js');
  // Часы приложения подменяем: окно и отметка зависят только от Date.now().
  const realNow = Date.now;
  const clock = (y, m, d, h, min) => { Date.now = () => new Date(y, m - 1, d, h, min).getTime(); };
  try {
    const days = [
      { date: '2030-05-05', timings: { Fajr: '23:54', Sunrise: '03:48' } },
      { date: '2030-05-06', timings: { Fajr: '01:49', Sunrise: '03:47' } },
      { date: '2030-05-07', timings: { Fajr: '01:45', Sunrise: '03:45' } },
    ];
    clock(2030, 5, 4, 22, 0);
    assert.equal(await alarm.scheduleFajrDays(days, { title: 'Fajr', body: 'Wake' }), 12);
    // Окно строки 5 мая открывается вечером 4-го, и цепочка звонков идёт от 23:54.
    const first = scheduled.filter(n => n.content.data.day === '2030-05-05').map(n => stamp(n.trigger.date));
    assert.deepEqual(first, ['2030-05-04 23:54', '2030-05-04 23:59', '2030-05-05 00:04', '2030-05-05 00:09']);
    assert.deepEqual(stored.fajrAlarmWindows.map(w => w.date), ['2030-05-05', '2030-05-06', '2030-05-07']);
    // До 23:54 баннера нет, с 23:55 он есть.
    assert.equal(await alarm.isInAlarmWindow(), false);
    clock(2030, 5, 4, 23, 55);
    assert.equal(await alarm.isInAlarmWindow(), true);
    // «Проснулся» до полуночи гасит звонки именно этого окна и не возвращается после неё.
    await alarm.markAwake();
    assert.equal(stored.fajrAwakeDate, '2030-05-05');
    assert.equal(scheduled.length, 8);
    assert.ok(scheduled.every(n => n.content.data.day !== '2030-05-05'));
    clock(2030, 5, 5, 0, 30);
    assert.equal(await alarm.isInAlarmWindow(), false);
    // Пересчёт расписания не ставит отмеченное окно заново.
    clock(2030, 5, 4, 23, 56);
    assert.equal(await alarm.scheduleFajrDays(days, { title: 'Fajr', body: 'Wake' }), 8);
    // Обычное утреннее окно по-прежнему гасится отметкой в своё время.
    clock(2030, 5, 6, 2, 0);
    assert.equal(await alarm.isInAlarmWindow(), true);
    await alarm.markAwake();
    assert.equal(stored.fajrAwakeDate, '2030-05-06');
    assert.equal(await alarm.isInAlarmWindow(), false);
  } finally { Date.now = realNow; }
}));
test('prayer reminders for a pre-midnight Fajr and a post-midnight Isha land on the neighbouring days', async () => {
  const planned = [];
  const reminders = loader({ 'expo-notifications': {
    getPermissionsAsync: async () => ({ granted: true }),
    getAllScheduledNotificationsAsync: async () => [],
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async (n) => { planned.push(n); },
    SchedulableTriggerInputTypes: { DATE: 'date' } } })('src/utils/prayerNotifications.js');
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const plus = (n) => { const d = new Date(midnight); d.setDate(d.getDate() + n); return dates.localDateKey(d); };
  const normal = { Fajr: '04:30', Sunrise: '06:00', Dhuhr: '12:00', Asr: '15:00', Maghrib: '19:00', Isha: '20:30' };
  // Дни выбраны так, что оба переноса попадают в будущее при любом часе запуска:
  // Фаджр строки «послезавтра» стоит завтра в 23:54, Иша строки «завтра» — послезавтра в 00:20.
  const timesForDate = (date) => {
    const key = dates.localDateKey(date);
    if (key === plus(2)) return { ...normal, Fajr: '23:54', Sunrise: '03:48' };
    if (key === plus(1)) return { ...normal, Maghrib: '22:40', Isha: '00:20' };
    return normal;
  };
  const on = Object.fromEntries(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => [p, { enabled: true, minutesBefore: 0 }]));
  await reminders.schedulePrayerReminders({ timesForDate, reminders: on, label: p => p, body: () => '', days: 5 });
  const fires = (prayer) => planned.filter(n => n.content.data.prayer === prayer).map(n => stamp(n.trigger.date));
  assert.ok(fires('Fajr').includes(`${plus(1)} 23:54`), 'Fajr of the day after tomorrow rings tomorrow evening');
  assert.ok(!fires('Fajr').includes(`${plus(2)} 23:54`));
  assert.ok(fires('Isha').includes(`${plus(2)} 00:20`), 'Isha of tomorrow rings after midnight');
  assert.ok(!fires('Isha').includes(`${plus(1)} 00:20`));
});

// ---------- Источник «Авто», реестр графиков и сервер noor-times ----------
// Данные подставные, сети нет: fetch и AsyncStorage подменяются. Каждый тест
// берёт свой loader, потому что реестр графиков — состояние модуля.
const pad2 = (n) => String(n).padStart(2, '0');
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
// Строка i таблицы: Фаджр и Зухр кодируют номер строки, Аср и Иша — метку
// таблицы, так что по одному ответу видно, из какой таблицы и какой строки он.
const rowOf = (i, tag) => `04:${pad2(i % 60)} 06:30 12:${pad2(Math.floor(i / 60))} 15:${pad2(Math.floor(tag / 60))} 17:30 19:${pad2(tag % 60)}`;
const timesOf = (i, tag) => Object.fromEntries(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((n, k) => [n, rowOf(i, tag).split(' ')[k]]));
const dayOfYear = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000);
const fakePlace = (id, lat, lng, extra = {}) => ({ id, name: 'Place ' + id, lat, lng, radiusKm: 50, tables: [], ...extra });
const fakeAuthority = (id, extra = {}) => ({ id, name: 'Auth ' + id, name_en: 'Auth en ' + id, country: 'XX', regions: [],
  utcOffset: 180, fallback: { kind: 'dumKbr' }, source: 'https://example.test/' + id, places: [], ...extra });
const fakeIndex = (authorities) => ({ v: 1, generated: '2030-01-01T00:00:00Z', authorities });
const fakeTable = (authority, place, year, tag, { start = `${year}-01-01`, count = isLeap(year) ? 366 : 365, utcOffset = 180 } = {}) => ({
  authority, title: 'test', source: 'test', utcOffset, start,
  place: { id: place.id, name: place.name, regions: [], lat: place.lat, lng: place.lng, radiusKm: place.radiusKm },
  days: Array.from({ length: count }, (_, i) => rowOf(i, tag)),
});
const noon = (y, m, d) => new Date(y, m - 1, d, 12);

test('resolveAuthority: region first, then the circle, then the country; a country-wide muftiate yields to a regional one', () => {
  const L = loader();
  const tables = L('src/utils/officialTables.js');
  tables.installIndex(fakeIndex([
    fakeAuthority('ru-tat', { country: 'RU', regions: ['tatar', 'татар'], places: [fakePlace('kazan', 55.79, 49.12, { radiusKm: 80 }), fakePlace('chelny', 55.74, 52.4, { radiusKm: 60 })] }),
    fakeAuthority('ru-dag', { country: 'RU', regions: ['dagest', 'дагест'], places: [fakePlace('mkala', 42.98, 47.5, { radiusKm: 70 })] }),
    fakeAuthority('sg-muis', { country: 'SG', places: [fakePlace('sg', 1.35, 103.82, { radiusKm: 30 })] }),
    fakeAuthority('ru-all', { country: 'RU', places: [fakePlace('moscow', 55.75, 37.62, { radiusKm: 40 })] }),
  ]));
  const id = (where) => tables.resolveAuthority(where)?.id ?? null;
  // Регион решает, в каком бы регистре и на каком языке он ни был.
  assert.equal(id({ region: 'Республика Татарстан' }), 'ru-tat');
  assert.equal(id({ region: 'DAGESTAN' }), 'ru-dag');
  // Известный регион сильнее круга: точка в круге Дагестана, но регион чужой.
  assert.equal(id({ lat: 42.98, lng: 47.5, region: 'Ingushetia' }), null);
  // Без региона — круг любого пункта; пустые координаты ничего не покрывают.
  assert.equal(id({ lat: 55.8, lng: 49.1 }), 'ru-tat');
  assert.equal(id({ lat: 55.75, lng: 52.35 }), 'ru-tat');
  assert.equal(id({ lat: 10, lng: 10 }), null);
  assert.equal(id({ lat: NaN, lng: NaN }), null);
  assert.equal(id({}), null);
  assert.equal(id(undefined), null);
  // Управление на всю страну (regions пуст) подходит стране места, регион ему не нужен.
  assert.equal(id({ country: 'SG' }), 'sg-muis');
  assert.equal(id({ country: 'sg', region: 'Central Singapore' }), 'sg-muis');
  // Страна известна и чужая: круг не спрашивается, Джохор-Бару — не Сингапур.
  assert.equal(id({ country: 'MY', lat: 1.36, lng: 103.8 }), null);
  // Региональное управление выигрывает у страновое, а где региона нет — страновое.
  assert.equal(id({ region: 'Tatarstan', country: 'RU' }), 'ru-tat');
  assert.equal(id({ region: 'Ingushetia', country: 'RU' }), 'ru-all');
  // Встроенный снимок работает без установок.
  const fresh = loader()('src/utils/officialTables.js');
  assert.equal(fresh.resolveAuthority({ ...NALCHIK }).id, 'ru-kbr');
  assert.equal(fresh.resolveAuthority({ region: 'Kabardino-Balkariya' }).id, 'ru-kbr');
  assert.equal(fresh.resolveAuthority({ lat: 55.7558, lng: 37.6173 }), null);
  assert.equal(fresh.resolveAuthority({ country: 'RU' }), null);
});
test('a muftiate with two places gives the table of the nearest one, and never borrows a far one', () => inZone('Europe/Moscow', () => {
  const tables = loader()('src/utils/officialTables.js');
  const kazan = fakePlace('kazan', 55.79, 49.12, { radiusKm: 80 });
  const chelny = fakePlace('chelny', 55.74, 52.4, { radiusKm: 60 });
  tables.installIndex(fakeIndex([fakeAuthority('ru-tat', { country: 'RU', regions: ['tatar', 'татар'], places: [kazan, chelny] })]));
  tables.installTables([fakeTable('ru-tat', kazan, 2026, 1), fakeTable('ru-tat', chelny, 2026, 2)]);
  const date = noon(2026, 6, 10);
  const isha = (where) => tables.officialTimes('ru-tat', where, date)?.Isha;
  assert.equal(isha({ lat: 55.79, lng: 49.12, region: 'Республика Татарстан' }), '19:01');
  assert.equal(isha({ lat: 55.74, lng: 52.4, region: 'Республика Татарстан' }), '19:02');
  // Посередине, но ближе к Челнам (≈55 км против ≈150).
  assert.equal(isha({ lat: 55.77, lng: 51.5, region: 'Tatarstan' }), '19:02');
  // Регион известен — радиус не нужен, пункт берётся ближайший, пусть и далеко.
  assert.equal(isha({ lat: 55.0, lng: 50.5, region: 'Tatarstan' }), '19:01');
  // Региона нет — работает круг: в круге Казани, и вне обоих кругов.
  assert.equal(isha({ lat: 55.9, lng: 49.9 }), '19:01');
  assert.equal(isha({ lat: 55.77, lng: 51.0 }), undefined);
  // Таблицы ближайшего пункта нет — чужую не берём, считает запасной способ.
  const lonely = loader()('src/utils/officialTables.js');
  lonely.installIndex(fakeIndex([fakeAuthority('ru-tat', { country: 'RU', regions: ['tatar', 'татар'], places: [kazan, chelny] })]));
  lonely.installTables([fakeTable('ru-tat', kazan, 2026, 1)]);
  assert.equal(lonely.officialTimes('ru-tat', { lat: 55.74, lng: 52.4, region: 'Tatarstan' }, date), null);
}));
test('a country-wide muftiate gives a place table only within its radius; a regional one has no radius limit', () => inZone('Europe/Moscow', () => {
  const tables = loader()('src/utils/officialTables.js');
  const almaty = fakePlace('almaty', 43.24, 76.89, { radiusKm: 60 });
  const astana = fakePlace('astana', 51.17, 71.43, { radiusKm: 60 });
  const kbr = fakePlace('kbr2', 43.5, 43.6, { radiusKm: 20 });
  tables.installIndex(fakeIndex([
    fakeAuthority('kz-dumk', { country: 'KZ', utcOffset: 300, places: [almaty, astana] }),
    fakeAuthority('ru-far', { country: 'RU', regions: ['kabard'], places: [kbr] }),
  ]));
  tables.installTables([
    fakeTable('kz-dumk', almaty, 2026, 11, { utcOffset: 180 }), fakeTable('kz-dumk', astana, 2026, 12, { utcOffset: 180 }),
    fakeTable('ru-far', kbr, 2026, 13),
  ]);
  const date = noon(2026, 6, 10);
  const kz = (where) => tables.officialTimes('kz-dumk', { country: 'KZ', ...where }, date)?.Isha;
  // Пункт 2: управление выбрано по стране — ближайший пункт, если место в его радиусе.
  assert.equal(kz({ lat: 43.3, lng: 76.9 }), '19:11');
  assert.equal(kz({ lat: 51.0, lng: 71.5, region: 'Akmola' }), '19:12');
  // 300+ км от любого города: управление определено, а таблицы нет — работает его метод.
  assert.equal(tables.resolveAuthority({ country: 'KZ', lat: 47, lng: 60 })?.id, 'kz-dumk');
  assert.equal(tables.resolvePlace(tables.resolveAuthority({ country: 'KZ', lat: 47, lng: 60 }), { country: 'KZ', lat: 47, lng: 60 }), null);
  assert.equal(kz({ lat: 47, lng: 60 }), undefined);
  // Радиус проверяется у ближайшего пункта, а без координат проверить нечем.
  assert.equal(kz({ lat: 43.24, lng: 78.0 }), undefined);
  assert.equal(kz({}), undefined);
  // Пункт 1: выбрано по региону — ближайший пункт без радиуса, Терскол в 94 км от Нальчика.
  const far = (where) => tables.officialTimes('ru-far', where, date)?.Isha;
  assert.equal(far({ lat: 43.255, lng: 42.51, region: 'Kabardino-Balkariya' }), '19:13');
  // Пункт 3: ни региона, ни страны — круг, и тот же Терскол вне круга в 20 км.
  assert.equal(far({ lat: 43.255, lng: 42.51 }), undefined);
  assert.equal(far({ lat: 43.5, lng: 43.62 }), '19:13');
  // Пояс не зашит: таблица Казахстана на +03:00 в поясе +05:00 не применяется.
  return inZone('Asia/Almaty', () => assert.equal(kz({ lat: 43.3, lng: 76.9 }), undefined));
}));
test('a timetable of the previous year stands in for a missing one: same date, 29 February takes the 28th, approximate is flagged', () => inZone('Europe/Moscow', () => {
  const tables = loader()('src/utils/officialTables.js');
  const place = fakePlace('a1', 55, 49);
  tables.installIndex(fakeIndex([fakeAuthority('xx-a', { regions: ['xx'], places: [place] })]));
  const where = { lat: 55, lng: 49, region: 'xx' };
  tables.installTables([fakeTable('xx-a', place, 2026, 5)]);
  const info = (y, m, d) => tables.officialTimesInfo('xx-a', where, noon(y, m, d));
  // Свой год — точно.
  assert.deepEqual(info(2026, 3, 5), { times: timesOf(dayOfYear(2026, 3, 5), 5), year: 2026, approximate: false });
  // Таблицы 2027 нет — та же дата 2026-го, с пометкой.
  assert.deepEqual(info(2027, 3, 5), { times: timesOf(dayOfYear(2026, 3, 5), 5), year: 2026, approximate: true });
  assert.deepEqual(tables.officialTimes('xx-a', where, noon(2027, 3, 5)), timesOf(dayOfYear(2026, 3, 5), 5));
  // Два года назад уже нет.
  assert.equal(info(2028, 3, 5), null);
  // 29 февраля 2028: таблицы 2028 нет, берётся 28 февраля 2027.
  tables.installTables([fakeTable('xx-a', place, 2027, 6)]);
  assert.deepEqual(info(2028, 2, 29), { times: timesOf(dayOfYear(2027, 2, 28), 6), year: 2027, approximate: true });
  assert.deepEqual(info(2028, 3, 1), { times: timesOf(dayOfYear(2027, 3, 1), 6), year: 2027, approximate: true });
  // Появилась своя таблица високосного года — 29 февраля точное.
  tables.installTables([fakeTable('xx-a', place, 2028, 7)]);
  assert.deepEqual(info(2028, 2, 29), { times: timesOf(59, 7), year: 2028, approximate: false });
  // Таблица года есть, но дату не накрывает (как встроенная КБР: октябрь–декабрь) — выручает прошлогодняя.
  const partial = fakeTable('xx-a', place, 2029, 8, { start: '2029-10-01', count: 92 });
  tables.installTables([partial]);
  assert.deepEqual(info(2029, 10, 8), { times: timesOf(7, 8), year: 2029, approximate: false });
  assert.deepEqual(info(2029, 9, 30), { times: timesOf(dayOfYear(2028, 9, 30), 7), year: 2028, approximate: true });
  // Пояс устройства другой — таблица, в том числе прошлогодняя, не применяется.
  return inZone('Asia/Baku', () => assert.equal(info(2027, 3, 5), null));
}));
test('a damaged row or table from the server never reaches the screen', () => inZone('Europe/Moscow', () => {
  const tables = loader()('src/utils/officialTables.js');
  const place = fakePlace('a1', 55, 49);
  tables.installIndex(fakeIndex([fakeAuthority('xx-a', { regions: ['xx'], places: [place] })]));
  const table = fakeTable('xx-a', place, 2026, 5);
  table.days[10] = '04:10 06:30 12:00';
  table.days[11] = '04:11 06:30 12:00 15:00 17:30 --:--';
  assert.equal(tables.installTables([table, null, {}, { authority: 'xx-a' }, { ...table, days: 'x' }, { ...table, start: 'soon' }]), 1);
  const at = (d) => tables.officialTimes('xx-a', { region: 'xx', lat: 55, lng: 49 }, noon(2026, 1, d));
  assert.equal(at(1)?.Fajr, '04:00');
  assert.equal(at(11), null);
  assert.equal(at(12), null);
  // Кривой индекс и чужая версия формата не принимаются.
  assert.equal(tables.installIndex({ v: 2, authorities: [] }), false);
  assert.equal(tables.installIndex({ v: 1 }), false);
  assert.equal(tables.installIndex(null), false);
  assert.equal(tables.installIndex(fakeIndex([null, { name: 'no id' }, fakeAuthority('xx-b')])), true);
  assert.equal(tables.resolveAuthority({ region: 'xx' }), null);
  assert.ok(tables.resolveAuthority({ country: 'XX' }));
}));
test('installTables replaces the built-in table, changes the version and wakes subscribers once', () => inZone('Europe/Moscow', () => {
  const tables = loader()('src/utils/officialTables.js');
  const kbr = { id: 'kbr', name: 'КБР', lat: 43.4981, lng: 43.6189, radiusKm: 100 };
  const before = tables.tablesVersion();
  assert.equal(tables.tablesVersion(), before);
  let woke = 0;
  const unsubscribe = tables.subscribeTables(() => { woke += 1; });
  assert.deepEqual(tables.officialTimes('ru-kbr', NALCHIK, noon(2026, 10, 8)), KBR_OCT8);
  assert.equal(tables.officialTimes('ru-kbr', NALCHIK, noon(2026, 5, 8)), null);
  // Серверная таблица на весь 2026 год заменяет встроенную с октября.
  const full = fakeTable('ru-kbr', kbr, 2026, 9);
  assert.equal(tables.installTables([full]), 1);
  assert.notEqual(tables.tablesVersion(), before);
  assert.equal(woke, 1);
  assert.deepEqual(tables.officialTimes('ru-kbr', NALCHIK, noon(2026, 10, 8)), timesOf(dayOfYear(2026, 10, 8), 9));
  assert.deepEqual(tables.officialTimes('ru-kbr', NALCHIK, noon(2026, 5, 8)), timesOf(dayOfYear(2026, 5, 8), 9));
  // То же самое второй раз версии не меняет и никого не будит.
  const after = tables.tablesVersion();
  tables.installTables([full]);
  assert.equal(tables.tablesVersion(), after);
  assert.equal(woke, 1);
  // Исправленная цифра — новая версия.
  const fixed = fakeTable('ru-kbr', kbr, 2026, 9);
  fixed.days[0] = fixed.days[0].replace('04:00', '04:01');
  tables.installTables([fixed]);
  assert.notEqual(tables.tablesVersion(), after);
  assert.equal(woke, 2);
  // Свойства управления, меняющие результат, тоже входят в версию; названия — нет.
  const index = fakeIndex([fakeAuthority('xx-a', { regions: ['xx'], places: [fakePlace('p', 1, 1)] })]);
  tables.installIndex(index);
  const withIndex = tables.tablesVersion();
  assert.equal(woke, 3);
  tables.installIndex(fakeIndex([fakeAuthority('xx-a', { name: 'Другое имя', regions: ['xx'], places: [fakePlace('p', 1, 1)] })]));
  assert.equal(tables.tablesVersion(), withIndex);
  tables.installIndex(fakeIndex([fakeAuthority('xx-a', { regions: ['xx'], fallback: { kind: 'aladhan', method: 14 }, places: [fakePlace('p', 1, 1)] })]));
  assert.notEqual(tables.tablesVersion(), withIndex);
  unsubscribe();
  tables.installTables([fakeTable('ru-kbr', kbr, 2027, 3)]);
  assert.equal(woke, 4);
  // Версия не зависит от порядка установки.
  const a = loader()('src/utils/officialTables.js');
  const b = loader()('src/utils/officialTables.js');
  a.installTables([fakeTable('ru-kbr', kbr, 2027, 3), full]);
  b.installTables([full, fakeTable('ru-kbr', kbr, 2027, 3)]);
  assert.equal(a.tablesVersion(), b.tablesVersion());
}));
test('every built-in timetable is described in the built-in index and reachable', async () => {
  const dir = path.resolve(__dirname, '../assets/prayer-tables');
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  assert.equal(index.v, 1);
  const zones = { 180: 'Europe/Moscow' };
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
    const table = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const authority = index.authorities.find((a) => a.id === table.authority);
    assert.ok(authority, `${file}: authority ${table.authority} is missing in index.json`);
    const place = authority.places.find((p) => p.id === table.place.id);
    assert.ok(place, `${file}: place ${table.place.id} is missing in index.json`);
    for (const key of ['lat', 'lng', 'radiusKm']) assert.equal(place[key], table.place[key], `${file}: ${key}`);
    assert.deepEqual(authority.regions, table.place.regions, `${file}: regions`);
    assert.equal(authority.utcOffset, table.utcOffset, `${file}: utcOffset`);
    // Строка require на месте: таблица действительно достаётся по первой дате.
    assert.ok(zones[table.utcOffset], `${file}: no test zone for offset ${table.utcOffset}`);
    const [y, m, d] = table.start.split('-').map(Number);
    const times = await inZone(zones[table.utcOffset], () => loader()('src/utils/officialTables.js')
      .officialTimes(authority.id, { lat: place.lat, lng: place.lng }, new Date(y, m - 1, d, 12)));
    assert.deepEqual(times, Object.fromEntries(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
      .map((n, k) => [n, table.days[0].split(' ')[k]])), `${file}: not reachable through officialTimes`);
  }
});

// Мир для «Авто»: вместо расчёта adhan — заглушка, которая запоминает вызовы.
const LOCAL_TIMES = { Fajr: '01:01', Sunrise: '02:02', Dhuhr: '03:03', Asr: '04:04', Maghrib: '05:05', Isha: '06:06' };
function autoWorld() {
  const calls = [];
  const L = loader({ './prayerCalc': { computePrayerTimes: (...args) => { calls.push(args); return LOCAL_TIMES; } } });
  return { L, calls, source: L('src/utils/prayerSource.js'), tables: L('src/utils/officialTables.js') };
}
const ALADHAN_TIMES = { Fajr: '10:00', Sunrise: '11:00', Dhuhr: '12:00', Asr: '13:00', Maghrib: '14:00', Isha: '15:00' };
async function withFetch(fake, fn) {
  const before = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await fn(); } finally { globalThis.fetch = before; }
}
const aladhanOnline = (urls) => async (url) => {
  urls.push(url);
  return { ok: true, status: 200, json: async () => ({ data: { timings: ALADHAN_TIMES } }) };
};
const offline = (urls) => async (url) => { urls.push(url); throw new TypeError('Network request failed'); };
const A1 = fakePlace('a1', 55, 49);
const HERE = { lat: 55, lng: 49, region: 'xx-region', country: 'XX' };

test('the Auto source reads the timetable of the region muftiate, tune on top, without touching the network', () => inZone('Europe/Moscow', async () => {
  const { source, tables } = autoWorld();
  tables.installIndex(fakeIndex([fakeAuthority('xx-a', { regions: ['xx-region'], fallback: { kind: 'aladhan', method: 14, school: 'hanafi' }, places: [A1] })]));
  tables.installTables([fakeTable('xx-a', A1, 2026, 7)]);
  const urls = [];
  await withFetch(offline(urls), async () => {
    const date = noon(2026, 6, 10);
    const expected = timesOf(dayOfYear(2026, 6, 10), 7);
    assert.deepEqual(await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', date }), expected);
    assert.equal((await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', date, tune: { Asr: 2 } })).Asr, '15:02');
    assert.deepEqual(source.localTimesForDate({ ...HERE, sourceId: 'auto', date }), expected);
    // Прошлогодняя таблица в следующем году — тоже без сети.
    assert.deepEqual(await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', date: noon(2027, 6, 10) }), timesOf(dayOfYear(2026, 6, 10), 7));
  });
  assert.deepEqual(urls, []);
}));
test('the Auto source falls back to the DUM KBR formula when the muftiate says so and there is no table for the date', () => inZone('Europe/Moscow', async () => {
  const { source, tables, L } = autoWorld();
  const { computeDumKbr } = L('src/utils/dumCalc.js');
  tables.installIndex(fakeIndex([fakeAuthority('xx-b', { regions: ['xx-region'], fallback: { kind: 'dumKbr' }, places: [A1] })]));
  tables.installTables([fakeTable('xx-b', A1, 2026, 7)]);
  const urls = [];
  await withFetch(offline(urls), async () => {
    const date = noon(2029, 6, 10);
    assert.deepEqual(await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', date }), computeDumKbr(55, 49, date));
    assert.deepEqual(source.localTimesForDate({ ...HERE, sourceId: 'auto', date }), computeDumKbr(55, 49, date));
    // Пока таблица на дату есть, формула не нужна.
    assert.equal((await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', date: noon(2026, 6, 10) })).Isha, '19:07');
  });
  assert.deepEqual(urls, []);
}));
test('the Auto source falls back to the Aladhan method of the muftiate, with its Asr school, and to a local method offline', () => inZone('Europe/Moscow', async () => {
  const { source, tables, calls } = autoWorld();
  tables.installIndex(fakeIndex([
    fakeAuthority('xx-c', { regions: ['xx-region'], fallback: { kind: 'aladhan', method: 14, school: 'hanafi' }, places: [A1] }),
    fakeAuthority('xx-d', { country: 'XX', regions: ['yy-region'], fallback: { kind: 'aladhan', method: 13 }, places: [A1] }),
  ]));
  const date = noon(2026, 6, 10);
  const urls = [];
  // Сеть есть: метод и мазхаб из записи управления, а не из настройки.
  await withFetch(aladhanOnline(urls), async () => {
    assert.deepEqual(await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', school: 'shafi', date }), ALADHAN_TIMES);
    assert.match(urls[0], /method=14&school=1/);
    // Управление мазхаб не назвало — решает настройка пользователя.
    const there = { ...HERE, region: 'yy-region' };
    await source.getPrayerTimes2({ ...there, sourceId: 'auto', school: 'hanafi', date });
    await source.getPrayerTimes2({ ...there, sourceId: 'auto', school: 'shafi', date });
    assert.match(urls[1], /method=13&school=1/);
    assert.match(urls[2], /method=13&school=0/);
    assert.equal((await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', date, tune: { Fajr: 5 } })).Fajr, '10:05');
  });
  // Сети нет: локальный двойник метода 14 (ISNA), мазхаб управления, onFallback и tune внутри расчёта.
  let told = 0;
  await withFetch(offline([]), async () => {
    const tune = { Isha: 3 };
    const got = await source.getPrayerTimes2({ ...HERE, sourceId: 'auto', school: 'shafi', date, tune, onFallback: () => { told += 1; } });
    assert.deepEqual(got, LOCAL_TIMES);
    assert.equal(told, 1);
    assert.deepEqual(calls.at(-1), [55, 49, 'isna', 'hanafi', date, tune]);
  });
  // Синхронный путь без сети использует тот же двойник.
  calls.length = 0;
  assert.deepEqual(source.localTimesForDate({ ...HERE, sourceId: 'auto', school: 'shafi', date }), LOCAL_TIMES);
  assert.deepEqual(calls[0].slice(0, 4), [55, 49, 'isna', 'hanafi']);
}));
test('the Auto source uses the method of the country when the place has no muftiate; unknown countries get the League', () => inZone('Europe/Moscow', async () => {
  const { source, calls } = autoWorld();
  const date = noon(2026, 6, 10);
  const run = async (country, school = 'shafi') => {
    const urls = [];
    await withFetch(aladhanOnline(urls), () => source.getPrayerTimes2({ lat: 41, lng: 29, country, sourceId: 'auto', school, date }));
    return urls[0];
  };
  assert.match(await run('TR'), /method=13&school=0/);
  assert.match(await run('tr', 'hanafi'), /method=13&school=1/);
  assert.match(await run('MY'), /method=17&/);
  assert.match(await run('GB'), /method=15&/);
  assert.match(await run('ZZ'), /method=3&/);
  assert.match(await run(undefined), /method=3&/);
  // Без сети — ближайший локальный метод и onFallback.
  let told = 0;
  await withFetch(offline([]), async () => {
    for (const [country, local] of [['TR', 'turkey'], ['SA', 'makkah'], ['RU', 'isna'], ['ZZ', 'mwl'], [undefined, 'mwl']]) {
      const got = await source.getPrayerTimes2({ lat: 41, lng: 29, country, sourceId: 'auto', school: 'hanafi', date, onFallback: () => { told += 1; } });
      assert.deepEqual(got, LOCAL_TIMES);
      assert.deepEqual(calls.at(-1).slice(0, 4), [41, 29, local, 'hanafi'], String(country));
    }
  });
  assert.equal(told, 5);
  // Управление с неизвестным запасным способом (сервер новее приложения) — метод страны.
  const world = autoWorld();
  world.tables.installIndex(fakeIndex([fakeAuthority('xx-e', { country: 'TR', regions: ['xx-region'], fallback: { kind: 'astrolabe' }, places: [A1] })]));
  const urls = [];
  await withFetch(aladhanOnline(urls), () => world.source.getPrayerTimes2({ ...HERE, country: 'TR', sourceId: 'auto', date }));
  assert.match(urls[0], /method=13&/);
}));
test('the country method table is complete: every number has a local twin from the calc methods', () => {
  const { COUNTRY_METHODS, LOCAL_FOR_ALADHAN, methodForCountry, DEFAULT_ALADHAN_METHOD } = load('src/constants/countryMethods.js');
  const { CALC_METHODS } = load('src/constants/calcMethods.js');
  const wanted = { RU: 14, TR: 13, MY: 17, ID: 20, SG: 11, FR: 12, US: 2, CA: 2, SA: 4, EG: 5, AE: 16, KW: 9, QA: 10, JO: 23, TN: 18,
    DZ: 19, MA: 21, PT: 22, PK: 1, IN: 1, BD: 1, IR: 7, KZ: 14, UZ: 3, AZ: 13, DE: 13, NL: 3, BE: 3, GB: 15 };
  assert.deepEqual(COUNTRY_METHODS, wanted);
  const ids = new Set(CALC_METHODS.map((m) => m.id));
  for (const number of new Set(Object.values(wanted))) assert.ok(ids.has(LOCAL_FOR_ALADHAN[number]), `method ${number}`);
  for (const local of Object.values(LOCAL_FOR_ALADHAN)) assert.ok(ids.has(local), local);
  assert.equal(DEFAULT_ALADHAN_METHOD, 3);
  assert.deepEqual(methodForCountry('kz'), { aladhan: 14, local: 'isna' });
  assert.deepEqual(methodForCountry('XX'), { aladhan: 3, local: 'mwl' });
  assert.deepEqual(methodForCountry(), { aladhan: 3, local: 'mwl' });
});
test('the Auto source is the first and the only one in use; an unknown id still means the League, not Auto', async () => {
  const { source, calls } = autoWorld();
  const first = source.TIME_SOURCES[0];
  assert.deepEqual(first, { id: 'auto', label_en: 'Auto: your region’s muftiate', label_ru: 'Авто: ДУМ вашего региона', method: null });
  assert.equal(source.TIME_SOURCES.filter((s) => s.id === 'auto').length, 1);
  const urls = [];
  await withFetch(aladhanOnline(urls), () => source.getPrayerTimes2({ lat: 41, lng: 29, country: 'TR', sourceId: 'retired-source' }));
  assert.match(urls[0], /method=3&/);
  assert.equal(calls.length, 0);
  const settings = fs.readFileSync(path.resolve(__dirname, '../src/utils/AppSettingsContext.js'), 'utf8');
  assert.match(settings, /\[timeSourceId, setTimeSourceId\] = useState\('auto'\)/);
  // Источник не выбирается: сохранённый timeSourceId больше не читается, всегда «Авто».
  assert.equal(settings.includes("loadJSON('timeSourceId'"), false);
});
test('the DUM KBR source reads the KBR timetables installed from the server, including next year', () => inZone('Europe/Moscow', async () => {
  const { source, tables } = autoWorld();
  const kbr = { id: 'kbr', name: 'КБР', lat: 43.4981, lng: 43.6189, radiusKm: 100 };
  tables.installTables([fakeTable('ru-kbr', kbr, 2027, 4)]);
  const feb1 = noon(2027, 2, 1);
  const expected = timesOf(dayOfYear(2027, 2, 1), 4);
  const opts = { ...NALCHIK, region: 'Кабардино-Балкарская Республика', sourceId: 'russia', date: feb1 };
  assert.deepEqual(await source.getPrayerTimes2(opts), expected);
  assert.deepEqual(await source.getPrayerTimes2({ ...opts, region: undefined }), expected);
  assert.deepEqual(source.localTimesForDate(opts), expected);
  // Встроенная таблица 2026 по-прежнему на месте.
  assert.deepEqual(await source.getPrayerTimes2({ ...opts, date: noon(2026, 10, 8) }), KBR_OCT8);
}));
test('describeAutoSource tells the settings screen which muftiate is used and where the times come from', () => inZone('Europe/Moscow', () => {
  const { source, tables } = autoWorld();
  tables.installIndex(fakeIndex([
    fakeAuthority('xx-a', { regions: ['xx-region'], fallback: { kind: 'aladhan', method: 14, school: 'hanafi' }, places: [A1] }),
    fakeAuthority('xx-b', { regions: ['yy-region'], fallback: { kind: 'dumKbr' }, places: [A1] }),
  ]));
  tables.installTables([fakeTable('xx-a', A1, 2026, 7)]);
  const base = { authorityId: 'xx-a', authorityName: 'Auth xx-a', authorityNameEn: 'Auth en xx-a', placeName: 'Place a1', source: 'https://example.test/xx-a' };
  assert.deepEqual(source.describeAutoSource(HERE, noon(2026, 6, 10)), { ...base, mode: 'table', year: 2026, method: null });
  assert.deepEqual(source.describeAutoSource(HERE, noon(2027, 6, 10)), { ...base, mode: 'previousYear', year: 2026, method: null });
  assert.deepEqual(source.describeAutoSource(HERE, noon(2029, 6, 10)),
    { ...base, mode: 'fallback', year: null, method: { kind: 'aladhan', method: 14, school: 'hanafi' } });
  assert.deepEqual(source.describeAutoSource({ ...HERE, region: 'yy-region' }, noon(2026, 6, 10)),
    { mode: 'fallback', year: null, authorityId: 'xx-b', authorityName: 'Auth xx-b', authorityNameEn: 'Auth en xx-b', placeName: 'Place a1',
      source: 'https://example.test/xx-b', method: { kind: 'dumKbr' } });
  assert.deepEqual(source.describeAutoSource({ lat: 41, lng: 29, country: 'TR' }, noon(2026, 6, 10)),
    { mode: 'country', year: null, authorityId: null, authorityName: null, authorityNameEn: null, placeName: null, source: null,
      method: { kind: 'aladhan', method: 13, school: null } });
  assert.equal(source.describeAutoSource(undefined).mode, 'country');
}));
test('the cache key of the Auto source carries region, country and the timetable version; other sources keep their key', () => inZone('Europe/Moscow', () => {
  const L = withoutAdhan({ '@react-native-async-storage/async-storage': {} });
  const schedule = L('src/utils/prayerSchedule.js');
  const tables = L('src/utils/officialTables.js');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = { lat: 55, lng: 49, school: 'shafi', tune: {}, region: 'Tatarstan', country: 'RU' };
  const key = schedule.scheduleIdentity({ ...base, sourceId: 'auto' });
  assert.deepEqual(JSON.parse(key), [55, 49, 'auto', 'shafi', {}, zone, 'Tatarstan', 'RU', tables.tablesVersion()]);
  assert.notEqual(key, schedule.scheduleIdentity({ ...base, sourceId: 'auto', region: 'Dagestan' }));
  assert.notEqual(key, schedule.scheduleIdentity({ ...base, sourceId: 'auto', country: 'KZ' }));
  assert.notEqual(key, schedule.scheduleIdentity({ ...base, sourceId: 'auto', country: undefined }));
  // «ДУМ КБР» ключится так же, с регионом, страной и версией.
  assert.deepEqual(JSON.parse(schedule.scheduleIdentity({ ...base, sourceId: 'russia' })).slice(6), ['Tatarstan', 'RU', tables.tablesVersion()]);
  // Новая таблица — новый ключ у «Авто», а у остальных источников ключ прежний, байт в байт.
  const plain = JSON.stringify([55, 49, 'mwl_intl', 'shafi', {}, zone]);
  assert.equal(schedule.scheduleIdentity({ ...base, sourceId: 'mwl_intl' }), plain);
  tables.installTables([fakeTable('xx-a', fakePlace('p', 55, 49), 2026, 1)]);
  assert.notEqual(schedule.scheduleIdentity({ ...base, sourceId: 'auto' }), key);
  assert.equal(schedule.scheduleIdentity({ ...base, sourceId: 'mwl_intl' }), plain);
  assert.equal(schedule.scheduleIdentity({ ...base, sourceId: 'local' }), JSON.stringify([55, 49, 'local', 'shafi', {}, zone]));
}));

// ---------- Синхронизация с сервером ----------
const SERVER_URL = 'https://m65012487-wq.github.io/noor-times/v1/';
const memoryStorage = () => {
  const map = new Map();
  return { map, getItem: async (k) => (map.has(k) ? map.get(k) : null), setItem: async (k, v) => { map.set(k, v); },
    removeItem: async (k) => { map.delete(k); } };
};
// Сервер noor-times в памяти: файлы по путям, ETag и 304 на условный запрос.
function fakeServer() {
  const place = { id: 'a1', name: 'Place a1', lat: 55, lng: 49, radiusKm: 50 };
  const far = { id: 'a2', name: 'Place a2', lat: 56.5, lng: 52, radiusKm: 50 };
  const files = {};
  const log = [];
  const entry = (p, year) => ({ year, path: `xx-a/${p.id}/${year}.json`, start: `${year}-01-01`, days: 365, hash: `${p.id}-${year}-v1` });
  const server = {
    place, far, files, log,
    publish(path, body, etag) { files[path] = { body, etag }; },
    // Индекс собирается из того, что опубликовано: пункт a1 — на 2025–2028, a2 — на 2026.
    index(over = {}) {
      const a1 = { ...fakePlace('a1', 55, 49), tables: [2025, 2026, 2027, 2028].map((y) => entry(place, y)) };
      const a2 = { ...fakePlace('a2', 56.5, 52), tables: [entry(far, 2026)] };
      return fakeIndex([fakeAuthority('xx-a', { regions: ['xx-region'], places: [a1, a2], ...over })]);
    },
    fetch: async (url, init = {}) => {
      const p = url.slice(SERVER_URL.length);
      log.push({ path: p, headers: init.headers || {} });
      const res = (status, text = '', etag = null) => ({ status, ok: status < 400, headers: { get: (k) => (k.toLowerCase() === 'etag' ? etag : null) }, text: async () => text });
      const file = files[p];
      if (!file) return res(404);
      if (file.etag && init.headers?.['If-None-Match'] === file.etag) return res(304, '', file.etag);
      return res(200, JSON.stringify(file.body), file.etag);
    },
  };
  server.publish('index.json', server.index(), '"e1"');
  for (const year of [2025, 2026, 2027, 2028]) server.publish(`xx-a/a1/${year}.json`, fakeTable('xx-a', place, year, year - 2000));
  server.publish('xx-a/a2/2026.json', fakeTable('xx-a', far, 2026, 40));
  return server;
}
const syncWorld = (storage) => {
  const L = loader({ '@react-native-async-storage/async-storage': storage });
  return { L, server: L('src/utils/timesServer.js'), tables: L('src/utils/officialTables.js') };
};
const NOW = new Date(2026, 5, 1, 12).getTime();
const HOUR = 3600 * 1000;

test('sync downloads the index and the tables of the nearest place for the previous, this and next year, stores and installs them', () => inZone('Europe/Moscow', async () => {
  const storage = memoryStorage();
  const { server, tables } = syncWorld(storage);
  const world = fakeServer();
  let woke = 0;
  tables.subscribeTables(() => { woke += 1; });
  const ok = await withFetch(world.fetch, () => server.syncOfficialTables(HERE, { now: NOW }));
  assert.equal(ok, true);
  // Пункт a1, годы 2025–2027: без 2028 (дальше Y+1) и без чужого пункта a2.
  assert.deepEqual(world.log.map((r) => r.path), ['index.json', 'xx-a/a1/2025.json', 'xx-a/a1/2026.json', 'xx-a/a1/2027.json']);
  assert.equal(world.log[0].headers['If-None-Match'], undefined);
  assert.deepEqual(tables.officialTimes('xx-a', HERE, noon(2026, 6, 10)), timesOf(dayOfYear(2026, 6, 10), 26));
  assert.deepEqual(tables.officialTimes('xx-a', HERE, noon(2027, 6, 10)), timesOf(dayOfYear(2027, 6, 10), 27));
  // Индекс и таблицы встали одним коммитом: экран пересчитается один раз.
  assert.equal(woke, 1);
  // В хранилище — только свои ключи с общим префиксом.
  const keys = [...storage.map.keys()];
  assert.ok(keys.length > 0 && keys.every((k) => k.startsWith('officialTables:v1:')), keys.join());
  for (const k of ['index', 'etag', 'syncedAt', 'manifest', 'table:xx-a/a1/2026']) assert.ok(keys.includes('officialTables:v1:' + k), k);
  assert.equal(JSON.parse(storage.map.get('officialTables:v1:etag')), '"e1"');
}));
test('sync asks the server at most every 12 hours unless forced; an unchanged index (304) downloads nothing', () => inZone('Europe/Moscow', async () => {
  const { server } = syncWorld(memoryStorage());
  const world = fakeServer();
  await withFetch(world.fetch, async () => {
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW }), true);
    const calls = world.log.length;
    // Час спустя спрашивать нечего.
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW + HOUR }), true);
    assert.equal(world.log.length, calls);
    // force сверяется сразу: условный запрос с сохранённым ETag, 304, таблиц не качает.
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW + HOUR, force: true }), true);
    assert.equal(world.log.length, calls + 1);
    assert.deepEqual(world.log.at(-1), { path: 'index.json', headers: { 'If-None-Match': '"e1"' } });
    // Через 13 часов предел снят и без force.
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW + 13 * HOUR }), true);
    assert.equal(world.log.length, calls + 2);
    assert.equal(world.log.at(-1).headers['If-None-Match'], '"e1"');
    // Предел отсчитывается от последней удачной сверки, а 304 — тоже удача.
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW + 14 * HOUR }), true);
    assert.equal(world.log.length, calls + 2);
  });
}));
test('sync downloads only the tables whose hash changed', () => inZone('Europe/Moscow', async () => {
  const storage = memoryStorage();
  const { server, tables } = syncWorld(storage);
  const world = fakeServer();
  await withFetch(world.fetch, async () => {
    await server.syncOfficialTables(HERE, { now: NOW });
    const before = tables.tablesVersion();
    const calls = world.log.length;
    // Сервер поправил таблицу 2026: другой файл, другой hash в индексе, другой ETag.
    world.publish('xx-a/a1/2026.json', fakeTable('xx-a', world.place, 2026, 99));
    const index = world.index();
    index.authorities[0].places[0].tables[1].hash = 'a1-2026-v2';
    world.publish('index.json', index, '"e2"');
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW + 13 * HOUR }), true);
    assert.deepEqual(world.log.slice(calls).map((r) => r.path), ['index.json', 'xx-a/a1/2026.json']);
    assert.equal(world.log[calls].headers['If-None-Match'], '"e1"');
    assert.deepEqual(tables.officialTimes('xx-a', HERE, noon(2026, 6, 10)), timesOf(dayOfYear(2026, 6, 10), 99));
    assert.notEqual(tables.tablesVersion(), before);
    assert.equal(JSON.parse(storage.map.get('officialTables:v1:etag')), '"e2"');
  });
}));
test('moving to another place downloads its tables at once, even inside the 12 hours', () => inZone('Europe/Moscow', async () => {
  const storage = memoryStorage();
  const { server, tables } = syncWorld(storage);
  const world = fakeServer();
  const there = { lat: 56.5, lng: 52, region: 'xx-region', country: 'XX' };
  await withFetch(world.fetch, async () => {
    await server.syncOfficialTables(HERE, { now: NOW });
    assert.equal(tables.officialTimes('xx-a', there, noon(2026, 6, 10)), null);
    const calls = world.log.length;
    assert.equal(await server.syncOfficialTables(there, { now: NOW + HOUR }), true);
    assert.deepEqual(world.log.slice(calls).map((r) => r.path), ['index.json', 'xx-a/a2/2026.json']);
    assert.deepEqual(tables.officialTimes('xx-a', there, noon(2026, 6, 10)), timesOf(dayOfYear(2026, 6, 10), 40));
    // Таблицы прежнего пункта убраны из хранилища и манифеста: вне текущего пункта они не нужны.
    const keys = [...storage.map.keys()];
    assert.ok(!keys.some((k) => k.includes('xx-a/a1/')), keys.join());
    assert.deepEqual(Object.keys(JSON.parse(storage.map.get('officialTables:v1:manifest'))), ['xx-a/a2/2026']);
    // Вернулись — прежний пункт качается заново, а a2 уходит.
    const after = world.log.length;
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW + 2 * HOUR }), true);
    assert.deepEqual(world.log.slice(after).map((r) => r.path),
      ['index.json', 'xx-a/a1/2025.json', 'xx-a/a1/2026.json', 'xx-a/a1/2027.json']);
    assert.deepEqual(Object.keys(JSON.parse(storage.map.get('officialTables:v1:manifest'))).sort(),
      ['xx-a/a1/2025', 'xx-a/a1/2026', 'xx-a/a1/2027']);
  });
}));
test('sync swallows network trouble and answers false; the built-in timetable keeps working and the next try is not blocked', () => inZone('Europe/Moscow', async () => {
  const { server, tables } = syncWorld(memoryStorage());
  const world = fakeServer();
  const down = [];
  // Сети нет.
  assert.equal(await withFetch(offline(down), () => server.syncOfficialTables(HERE, { now: NOW })), false);
  assert.equal(down.length, 1);
  // Сервер отвечает ошибкой, мусором, чужой версией формата или молчит.
  const broken = (res) => async () => res;
  assert.equal(await withFetch(broken({ status: 500, ok: false, headers: { get: () => null }, text: async () => '' }), () => server.syncOfficialTables(HERE, { now: NOW })), false);
  assert.equal(await withFetch(broken({ status: 200, ok: true, headers: { get: () => null }, text: async () => '<html>' }), () => server.syncOfficialTables(HERE, { now: NOW })), false);
  assert.equal(await withFetch(broken({ status: 200, ok: true, headers: { get: () => null }, text: async () => '{"v":2,"authorities":[]}' }), () => server.syncOfficialTables(HERE, { now: NOW })), false);
  assert.equal(await withFetch(() => new Promise(() => {}), () => server.syncOfficialTables(HERE, { now: NOW, timeoutMs: 20 })), false);
  // Встроенный график цел.
  assert.deepEqual(tables.officialTimes('ru-kbr', NALCHIK, noon(2026, 10, 8)), KBR_OCT8);
  // Неудача не взвела предел в 12 часов: как только сеть вернулась, сверка проходит.
  assert.equal(await withFetch(world.fetch, () => server.syncOfficialTables(HERE, { now: NOW + 1000 })), true);
  assert.ok(tables.officialTimes('xx-a', HERE, noon(2026, 6, 10)));
  // Таблица упала посреди сверки: что скачалось — осталось, но ETag не сохранён и сверка повторится.
  const storage = memoryStorage();
  const half = syncWorld(storage);
  const world2 = fakeServer();
  let served = 0;
  const flaky = async (url, init) => { if (url.endsWith('2026.json') && served++ === 0) throw new TypeError('lost'); return world2.fetch(url, init); };
  assert.equal(await withFetch(flaky, () => half.server.syncOfficialTables(HERE, { now: NOW })), false);
  assert.ok(half.tables.officialTimes('xx-a', HERE, noon(2025, 6, 10)));
  assert.equal(storage.map.has('officialTables:v1:etag'), false);
  // Сбой на таблице: час сервер не трогаем (при выходе на передний план index.json не гоняем зря)…
  const calls = world2.log.length;
  assert.equal(await withFetch(world2.fetch, () => half.server.syncOfficialTables(HERE, { now: NOW + 1000 })), false);
  assert.equal(world2.log.length, calls);
  // …если не потребовать force, а через час пробуем снова и догружаем.
  assert.equal(await withFetch(world2.fetch, () => half.server.syncOfficialTables(HERE, { now: NOW + 2 * HOUR })), true);
  assert.ok(half.tables.officialTimes('xx-a', HERE, noon(2026, 6, 10)));
  const again = syncWorld(memoryStorage());
  const flaky2 = async (url, init) => { if (url.endsWith('2026.json')) throw new TypeError('lost'); return world2.fetch(url, init); };
  await withFetch(flaky2, () => again.server.syncOfficialTables(HERE, { now: NOW }));
  assert.equal(await withFetch(world2.fetch, () => again.server.syncOfficialTables(HERE, { now: NOW + 1000, force: true })), true);
}));
test('sync refuses a table that is not the one the index promised, and a place with no muftiate costs only the index', () => inZone('Europe/Moscow', async () => {
  const { server, tables } = syncWorld(memoryStorage());
  const world = fakeServer();
  // По пути a1/2026 лежит таблица другого пункта: не ставится, сверка не удалась.
  world.publish('xx-a/a1/2026.json', fakeTable('xx-a', world.far, 2026, 50));
  assert.equal(await withFetch(world.fetch, () => server.syncOfficialTables(HERE, { now: NOW })), false);
  // Чужая таблица не заняла место 2026-го: июньский день берётся из честной 2025-го, с пометкой.
  const info = tables.officialTimesInfo('xx-a', HERE, noon(2026, 6, 10));
  assert.deepEqual([info.year, info.approximate], [2025, true]);
  // Место вне всех управлений: индекс скачан, таблиц нет, сверка удалась.
  const quiet = syncWorld(memoryStorage());
  const world2 = fakeServer();
  assert.equal(await withFetch(world2.fetch, () => quiet.server.syncOfficialTables({ lat: 0, lng: 0, country: 'ZZ' }, { now: NOW })), true);
  assert.deepEqual(world2.log.map((r) => r.path), ['index.json']);
  assert.equal(quiet.tables.resolveAuthority({ region: 'xx-region' })?.id, 'xx-a');
}));
test('after a restart the stored index and tables come back without the network, and the limit survives too', () => inZone('Europe/Moscow', async () => {
  const storage = memoryStorage();
  const world = fakeServer();
  const first = syncWorld(storage);
  await withFetch(world.fetch, () => first.server.syncOfficialTables(HERE, { now: NOW }));
  // «Перезапуск»: свежие модули, то же хранилище, сети нет.
  const second = syncWorld(storage);
  assert.equal(second.tables.officialTimes('xx-a', HERE, noon(2026, 6, 10)), null);
  const version = second.tables.tablesVersion();
  await second.server.loadStoredTables();
  assert.deepEqual(second.tables.officialTimes('xx-a', HERE, noon(2026, 6, 10)), timesOf(dayOfYear(2026, 6, 10), 26));
  assert.notEqual(second.tables.tablesVersion(), version);
  assert.equal(second.tables.tablesVersion(), first.tables.tablesVersion());
  const urls = [];
  assert.equal(await withFetch(offline(urls), () => second.server.syncOfficialTables(HERE, { now: NOW + HOUR })), true);
  assert.deepEqual(urls, []);
  // Повторная загрузка ничего не делает, а испорченное хранилище не страшно.
  assert.equal(second.server.loadStoredTables(), second.server.loadStoredTables());
  storage.map.set('officialTables:v1:index', '{broken');
  storage.map.set('officialTables:v1:table:xx-a/a1/2026', 'nope');
  const third = syncWorld(storage);
  await third.server.loadStoredTables();
  assert.equal(third.tables.officialTimes('xx-a', HERE, noon(2026, 6, 10)), null);
  assert.deepEqual(third.tables.officialTimes('ru-kbr', NALCHIK, noon(2026, 10, 8)), KBR_OCT8);
}));

test('the widget snapshot carries the day shift of every time, so a night Fajr and Isha land on the right day', () => {
  const written = new Map();
  class ExtensionStorage {
    set(key, value) { written.set(key, value); }
    static reloadWidget() {}
  }
  const bridge = loader({ '@bacons/apple-targets': { ExtensionStorage }, './helpers': {} })('src/utils/widgetBridge.js');
  const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const [, may5] = KAZAN_MAY;
  const plain = { date: '2026-10-08', timings: { Fajr: '04:41', Sunrise: '06:11', Dhuhr: '12:03', Asr: '15:08', Maghrib: '17:37', Isha: '19:17' } };
  const north = { date: '2026-06-20', timings: { Fajr: '01:10', Sunrise: '03:32', Dhuhr: '12:02', Asr: '16:41', Maghrib: '22:40', Isha: '00:20' } };
  assert.equal(bridge.publishPrayerDay({ days: [may5, plain, north], order, label: key => key, city: 'Kazan' }), true);
  const [fajrDay, plainDay, northDay] = JSON.parse(written.get('prayerWindow:v2'));
  const shifts = day => Object.fromEntries(day.times.map(item => [item.key, item.shift]));
  assert.deepEqual(shifts(fajrDay), { Fajr: -1, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 });
  assert.deepEqual(shifts(plainDay), { Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 });
  assert.deepEqual(shifts(northDay), { Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 1 });
  // Время остаётся записью строки: сдвиг лежит рядом, а не вшит в часы.
  assert.equal(fajrDay.times[0].time, '23:54');
});

// ---------- Правки после проверки ----------
// Часы приложения целиком: и Date.now(), и new Date() без аргументов.
async function atFakeNow(ms, fn) {
  const Real = Date;
  class Fake extends Real {
    constructor(...args) { if (args.length) super(...args); else super(ms); }
    static now() { return ms; }
  }
  globalThis.Date = Fake;
  try { return await fn(); } finally { globalThis.Date = Real; }
}

test('reminders rebuilt after midnight still keep the Isha written in yesterday row', () => inZone('Europe/Moscow', async () => {
  const planned = [];
  const reminders = loader({ 'expo-notifications': {
    getPermissionsAsync: async () => ({ granted: true }),
    getAllScheduledNotificationsAsync: async () => [],
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async (n) => { planned.push(n); },
    SchedulableTriggerInputTypes: { DATE: 'date' } } })('src/utils/prayerNotifications.js');
  const normal = { Fajr: '04:30', Sunrise: '06:00', Dhuhr: '12:00', Asr: '15:00', Maghrib: '19:00', Isha: '20:30' };
  // 10 июня 00:10, а Иша строки 9 июня — 00:20 этой же ночью.
  const timesForDate = (date) => (dates.localDateKey(date) === '2026-06-09'
    ? { ...normal, Maghrib: '22:40', Isha: '00:20' } : normal);
  const on = Object.fromEntries(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => [p, { enabled: true, minutesBefore: 0 }]));
  const now = new Date(2026, 5, 10, 0, 10).getTime();
  await atFakeNow(now, () => reminders.schedulePrayerReminders({ timesForDate, reminders: on, label: p => p, body: () => '', days: 3 }));
  const isha = planned.filter(n => n.content.data.prayer === 'Isha').map(n => stamp(n.trigger.date));
  assert.ok(isha.includes('2026-06-10 00:20'), isha.join());
  // Прошедшее по вчерашней строке (Фаджр, зухр…) не ставится.
  assert.ok(planned.every(n => n.trigger.date.getTime() > now));
}));
test('a crooked index from the server is cleaned or refused and never breaks the Auto source', () => inZone('Europe/Moscow', async () => {
  const good = () => fakeAuthority('xx-good', { country: 'TR', regions: ['xx-region'], places: [A1] });
  const variants = {
    'regions as a string': fakeAuthority('xx-bad', { regions: 'xx-bad', places: [A1] }),
    'regions with a number': fakeAuthority('xx-bad', { regions: ['xx-bad', 5], places: [A1] }),
    'null place': fakeAuthority('xx-bad', { regions: ['xx-bad'], places: [null, A1] }),
    'only a null place': fakeAuthority('xx-bad', { regions: ['xx-bad'], places: [null] }),
    'places as a string': fakeAuthority('xx-bad', { regions: ['xx-bad'], places: 'abc' }),
    'place without radius': fakeAuthority('xx-bad', { regions: ['xx-bad'], places: [{ ...A1, radiusKm: undefined }] }),
    'tables not an array': fakeAuthority('xx-bad', { regions: ['xx-bad'], places: [{ ...A1, tables: 'x' }] }),
    'fallback as a string': fakeAuthority('xx-bad', { regions: ['xx-bad'], fallback: 'dumKbr', places: [A1] }),
  };
  const byCountry = new Set(['regions as a string', 'regions with a number', 'places as a string', 'fallback as a string']);
  for (const [name, bad] of Object.entries(variants)) {
    const { source, tables, calls } = autoWorld();
    tables.installIndex(fakeIndex([good()]));
    const before = tables.tablesVersion();
    // Принимается весь индекс, негодная запись отбрасывается или чистится.
    assert.equal(tables.installIndex(fakeIndex([good(), bad])), true, name);
    assert.doesNotThrow(() => tables.tablesVersion(), name);
    assert.equal(tables.resolveAuthority({ region: 'xx-region' })?.id, 'xx-good', name);
    assert.doesNotThrow(() => tables.resolveAuthority({ region: 'xx-bad', lat: 55, lng: 49 }), name);
    assert.doesNotThrow(() => tables.officialTimes('xx-bad', { region: 'xx-bad', lat: 55, lng: 49 }, noon(2026, 6, 10)), name);
    // «Авто» в месте кривой записи считает дальше, а не падает. Запись, которой
    // верить нельзя, не управляет местом: считает метод страны.
    await withFetch(offline([]), async () => {
      const got = await source.getPrayerTimes2({ lat: 55, lng: 49, region: 'xx-bad', country: 'TR', sourceId: 'auto', date: noon(2026, 6, 10) });
      assert.equal(Object.keys(got).length, 6, name);
      if (byCountry.has(name)) {
        assert.deepEqual(got, LOCAL_TIMES, name);
        assert.equal(calls.at(-1)[2], 'turkey', name);
      }
    });
    assert.doesNotThrow(() => source.describeAutoSource({ lat: 55, lng: 49, region: 'xx-bad', country: 'TR' }), name);
    assert.equal(typeof before, 'string');
  }
  // Индекс, негодный целиком, состояния не меняет.
  const tables = loader()('src/utils/officialTables.js');
  tables.installIndex(fakeIndex([good()]));
  const version = tables.tablesVersion();
  assert.equal(tables.installIndex({ v: 1, authorities: 'x' }), false);
  assert.equal(tables.installIndex({ v: 1, authorities: { 0: good() } }), false);
  assert.equal(tables.tablesVersion(), version);
  assert.equal(tables.resolveAuthority({ region: 'xx-region' })?.id, 'xx-good');
  // Кривое место правится на месте: у чистого пункта остаётся нормальный список таблиц.
  tables.installIndex(fakeIndex([fakeAuthority('xx-bad', { regions: ['xx-bad'], places: [null, { ...A1, tables: undefined }] })]));
  assert.deepEqual(tables.resolvePlace(tables.resolveAuthority({ region: 'xx-bad' }), { region: 'xx-bad' }).tables, []);
}));
test('sync is not locked by a clock set back, and checks a downloaded table against the index entry', () => inZone('Europe/Moscow', async () => {
  const { server, tables } = syncWorld(memoryStorage());
  const world = fakeServer();
  await withFetch(world.fetch, async () => {
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW }), true);
    const calls = world.log.length;
    // Часы ушли на пять часов назад: сверка не заперта до «будущей» отметки.
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW - 5 * HOUR }), true);
    assert.equal(world.log.length, calls + 1);
    // Индекс обещает 2026 из 300 строк, а в файле 365: не та таблица.
    const index = world.index();
    index.authorities[0].places[0].tables[1].days = 300;
    index.authorities[0].places[0].tables[1].hash = 'a1-2026-v3';
    world.publish('index.json', index, '"e3"');
    assert.equal(await server.syncOfficialTables(HERE, { now: NOW + 13 * HOUR }), false);
    assert.equal(tables.officialTimesInfo('xx-a', HERE, noon(2026, 6, 10)).year, 2026);
    assert.equal(tables.officialTimesInfo('xx-a', HERE, noon(2026, 6, 10)).times.Isha, '19:26');
    // Начало тоже должно совпасть с записью.
    const other = syncWorld(memoryStorage());
    const bad = world.index();
    bad.authorities[0].places[0].tables[1].start = '2026-02-01';
    world.publish('index.json', bad, '"e4"');
    assert.equal(await other.server.syncOfficialTables(HERE, { now: NOW }), false);
    assert.equal(other.tables.officialTimesInfo('xx-a', HERE, noon(2026, 6, 10)).approximate, true);
  });
}));

// ---------- Брони серии, пятничное зерно, роща, окно после намаза ----------
test('streak: a free missed day, then shields for further missed days; 7 days in a row earn a shield', () => {
  const { advanceStreak, aliveGap, FREEZE_MAX } = load('src/utils/streakFreeze.js');
  assert.deepEqual(advanceStreak({ streak: 0, gap: null, freezes: 0 }), { streak: 1, freezes: 0, used: 0, earned: 0 });
  // вчера и позавчера — по правилу прежнему, без брони
  assert.equal(advanceStreak({ streak: 4, gap: 1, freezes: 0 }).streak, 5);
  assert.deepEqual(advanceStreak({ streak: 4, gap: 2, freezes: 0 }), { streak: 5, freezes: 0, used: 0, earned: 0 });
  // три дня без чтения: без брони серия сгорает, с бронью — тратится одна
  assert.equal(advanceStreak({ streak: 4, gap: 3, freezes: 0 }).streak, 1);
  assert.deepEqual(advanceStreak({ streak: 4, gap: 3, freezes: 1 }), { streak: 5, freezes: 0, used: 1, earned: 0 });
  // четыре дня: одной брони мало, двух хватает; серия не сгорает наполовину
  assert.equal(advanceStreak({ streak: 4, gap: 4, freezes: 1 }).streak, 1);
  assert.equal(advanceStreak({ streak: 4, gap: 4, freezes: 1 }).freezes, 1);
  assert.deepEqual(advanceStreak({ streak: 4, gap: 4, freezes: 2 }), { streak: 5, freezes: 0, used: 2, earned: 0 });
  // седьмой день подряд дарит бронь, но не больше двух
  assert.deepEqual(advanceStreak({ streak: 6, gap: 1, freezes: 0 }), { streak: 7, freezes: 1, used: 0, earned: 1 });
  assert.equal(advanceStreak({ streak: 13, gap: 1, freezes: FREEZE_MAX }).freezes, FREEZE_MAX);
  assert.equal(advanceStreak({ streak: 13, gap: 1, freezes: FREEZE_MAX }).earned, 0);
  // жизнь серии без чтения — столько же, сколько считает виджет
  assert.equal(aliveGap(0), 2);
  assert.equal(aliveGap(2), 4);
  assert.equal(aliveGap(99), 4);
  // мусор вместо числа броней не ломает расчёт
  assert.equal(advanceStreak({ streak: 3, gap: 1, freezes: NaN }).freezes, 0);
});

test('Friday: the first completed sequence of the day drops one seed, even after every species is owned', () => {
  const friday = '2026-10-09';
  assert.equal(new Date(2026, 9, 9).getDay(), 5);
  const rng = () => 0;
  let state = model.initialState();
  for (let i = 0; i < 99; i++) state = model.registerDhikr(state, friday, { rng });
  assert.deepEqual(state.pendingDrops.map(d => d.reason), ['friday']);
  assert.equal(state.lastFridayGift, friday);
  // второй круг в ту же пятницу зерна не даёт
  for (let i = 0; i < 99; i++) state = model.registerDhikr(state, friday, { rng });
  assert.equal(state.pendingDrops.filter(d => d.reason === 'friday').length, 1);
  // не пятница — зерна нет
  let other = model.initialState();
  for (let i = 0; i < 99; i++) other = model.registerDhikr(other, '2026-10-08', { rng });
  assert.equal(other.pendingDrops.filter(d => d.reason === 'friday').length, 0);
  // коллекция собрана — пятничное зерно всё равно выпадает
  const full = { ...model.initialState(), seeds: { fig: 1, pomegranate: 1, date_palm: 1, sidr: 1 } };
  let all = full;
  for (let i = 0; i < 99; i++) all = model.registerDhikr(all, friday, { rng });
  assert.equal(all.pendingDrops.filter(d => d.reason === 'friday').length, 1);
});

test('grove: a fruiting tree retires on planting or by hand, but never while it is the one being counted', () => {
  const fruiting = { ...model.initialState(), trees: [fruitingTree('t1', 'olive')], activeTreeId: 't1', seeds: { fig: 1 } };
  assert.equal(model.isFruiting(fruiting.trees[0]), true);
  // активное дерево отправить нельзя: счёт остался бы без дерева
  assert.equal(model.retireTree(fruiting, 't1'), fruiting);
  // посадка зерна уводит плодоносящее дерево в рощу само
  const planted = model.plantSeed(fruiting, 'fig', day);
  assert.equal(planted.trees.find(t => t.id === 't1').inGrove, true);
  assert.equal(planted.trees.find(t => t.id === planted.activeTreeId).inGrove, false);
  // роща не становится активным деревом
  assert.equal(model.setActiveTree(planted, 't1'), planted);
  // порода из рощи остаётся в коллекции: подарок её не повторит
  const owner = { ...planted, seeds: {} };
  const gift = model.registerDhikr({ ...owner, activeDays: 6 }, day, { rng: () => 0 });
  assert.notEqual(gift.pendingDrops[0]?.species, 'olive');
  // неплодоносящее неактивное дерево в рощу не уйдёт
  const young = { ...model.initialState(), trees: [
    { id: 't1', species: 'olive', progress: 5, activeDays: 1, stage: 0, lastGrowDate: null, plantedOn: null, harvested: false, inGrove: false },
    fruitingTree('t2', 'fig')], activeTreeId: 't1' };
  assert.equal(model.retireTree(young, 't2').trees.find(t => t.id === 't2').inGrove, true);
  const noFruit = { ...young, trees: [young.trees[1], { ...young.trees[0], id: 't3' }], activeTreeId: 't2' };
  assert.equal(model.retireTree(noFruit, 't3'), noFruit);
  // сохранение не оставляет активным дерево из рощи
  const broken = model.restoreState({ ...planted, activeTreeId: 't1' });
  assert.equal(broken.trees.find(t => t.id === broken.activeTreeId).inGrove, false);
});

test('after prayer the tree grows one and a half times faster, and the window follows the prayer times', () => {
  const normal = model.registerDhikr(model.initialState(), day);
  const boosted = model.registerDhikr(model.initialState(), day, { afterPrayer: true });
  assert.equal(model.activeTree(boosted).progress, model.activeTree(normal).progress * model.AFTER_PRAYER.multiplier);
  const { afterPrayerNow } = load('src/utils/prayerWindow.js');
  const days = [{ date: day, timings: { Fajr: '04:50', Sunrise: '06:10', Dhuhr: '12:10', Asr: '15:40', Maghrib: '18:00', Isha: '19:20' } }];
  const at = (h, m) => new Date(2026, 8, 13, h, m);
  assert.equal(afterPrayerNow(at(12, 10), 30, days), true);
  assert.equal(afterPrayerNow(at(12, 39), 30, days), true);
  assert.equal(afterPrayerNow(at(12, 41), 30, days), false);
  assert.equal(afterPrayerNow(at(12, 9), 30, days), false);
  // восход — не намаз
  assert.equal(afterPrayerNow(at(6, 15), 30, days), false);
  assert.equal(afterPrayerNow(at(12, 20), 30, []), false);
});

test('Friday seed also comes from 99 remembrances a day in a single-dhikr mode', () => {
  const friday = '2026-10-09';
  let state = { ...model.initialState(), selectedDhikr: 'subhanallah', circleLimit: true };
  for (let i = 0; i < 99; i++) state = model.registerDhikr(state, friday, { rng: () => 0 });
  assert.equal(state.pendingDrops.filter(d => d.reason === 'friday').length, 1);
});

test('old saves without grove or Friday fields restore cleanly; a growing tree stays out of the grove', () => {
  const old = JSON.parse(JSON.stringify(model.initialState()));
  delete old.lastFridayGift;
  for (const tree of old.trees) delete tree.inGrove;
  const restored = model.restoreState(old);
  assert.equal(restored.lastFridayGift, null);
  assert.equal(restored.trees[0].inGrove, false);
  const growing = { ...model.initialState(), seeds: { fig: 1 } };
  const planted = model.plantSeed(growing, 'fig', day);
  assert.equal(planted.trees.find(t => t.id === 't1').inGrove, false);
});

test('the after-prayer window follows prayers shifted across midnight', () => {
  const { afterPrayerNow } = load('src/utils/prayerWindow.js');
  // Фаджр в строке дня стоит 23:54, но по смыслу это вечер предыдущих суток;
  // Иша 00:20 — уже следующие.
  const days = [{ date: '2026-05-20', timings: { Fajr: '23:54', Sunrise: '03:10', Dhuhr: '13:30', Asr: '18:30', Maghrib: '21:30', Isha: '00:20' } }];
  assert.equal(afterPrayerNow(new Date(2026, 4, 19, 23, 58), 30, days), true);
  assert.equal(afterPrayerNow(new Date(2026, 4, 20, 23, 58), 30, days), false);
  assert.equal(afterPrayerNow(new Date(2026, 4, 21, 0, 30), 30, days), true);
  assert.equal(afterPrayerNow(new Date(2026, 4, 20, 0, 30), 30, days), false);
  // испорченный день не роняет, а даёт «окна нет»
  assert.equal(afterPrayerNow(new Date(2026, 4, 20, 13, 40), 30, [{ timings: null }, null]), false);
});

test('the after-prayer adhkar set uses known dhikr, fits the sequence editor and survives setSequence', () => {
  assert.ok(model.AZKAR_AFTER_PRAYER.length <= model.SEQUENCE_MAX_STEPS);
  for (const step of model.AZKAR_AFTER_PRAYER) {
    const item = model.DHIKR.find(d => d.id === step.id);
    assert.ok(item, step.id);
    assert.ok(item.arabic && item.ru && item.en && item.translation_ru && item.translation_en, step.id);
    assert.ok(Number.isInteger(step.target) && step.target >= 1 && step.target <= model.SEQUENCE_MAX_TARGET);
  }
  const state = model.setSequence(model.initialState(), model.AZKAR_AFTER_PRAYER);
  assert.deepEqual(state.sequence, model.AZKAR_AFTER_PRAYER);
  assert.equal(model.sequenceSteps(state).length, model.AZKAR_AFTER_PRAYER.length);
});
