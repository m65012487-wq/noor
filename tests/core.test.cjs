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
test('stage configuration can grow beyond eight entries', () => {
  const stages = Array.from({ length: 30 }, (_, i) => ({ requiredProgress: i * 100 }));
  assert.equal(model.chooseStage(2900, stages), 29);
  assert.equal(model.chooseStage(250, stages), 2);
});
test('tree silhouettes cover every species and stage and stay inside the canvas', () => {
  const { TREE_CANVAS, TREE_SHAPES, TREE_BOUNDS } = load('src/tasbih/treeShapes.js');
  assert.deepEqual(Object.keys(TREE_SHAPES).sort(), model.SPECIES.map(s => s.id).sort());
  for (const species of Object.keys(TREE_SHAPES)) {
    assert.equal(TREE_SHAPES[species].length, model.STAGES.length);
    assert.equal(TREE_BOUNDS[species].length, model.STAGES.length);
    TREE_SHAPES[species].forEach((shapes, stage) => {
      assert.ok(shapes.length > 0, `${species}:${stage} пустая стадия`);
      for (const shape of shapes) {
        // Путь целиком из команд M/Q/Z с числами: «NaN» или «undefined» внутри d
        // поиск чисел ниже молча пропустил бы, а Svg на устройстве — нет.
        if (shape.t === 'p') {
          assert.match(shape.d, /^(?:M-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?(?:Q(?:-?\d+(?:\.\d+)? ?){4})+Z)+$/,
            `${species}:${stage} испорченный путь`);
        }
        const numbers = shape.t === 'e'
          ? [shape.cx - shape.rx, shape.cx + shape.rx, shape.cy - shape.ry, shape.cy + shape.ry]
          : shape.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
        assert.ok(numbers.every(Number.isFinite), `${species}:${stage} нечисловая координата`);
        // Фигуры лежат в холсте: иначе Svg обрежет крону плоской линией.
        const xs = shape.t === 'e' ? numbers.slice(0, 2) : numbers.filter((_, i) => i % 2 === 0);
        const ys = shape.t === 'e' ? numbers.slice(2) : numbers.filter((_, i) => i % 2 === 1);
        assert.ok(Math.min(...xs) >= 0 && Math.max(...xs) <= TREE_CANVAS.width, `${species}:${stage} вышла по горизонтали`);
        assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= TREE_CANVAS.height, `${species}:${stage} вышла по вертикали`);
      }
      const b = TREE_BOUNDS[species][stage];
      assert.ok(b.width > 0 && b.height > 0 && b.x >= 0 && b.y >= 0
        && b.x + b.width <= TREE_CANVAS.width && b.y + b.height <= TREE_CANVAS.height,
      `${species}:${stage} границы вне холста`);
    });
    // Дерево не должно «усыхать»: силуэт следующей стадии не ниже прежнего.
    const heights = TREE_BOUNDS[species].map(b => b.height);
    heights.forEach((h, i) => {
      if (i) assert.ok(h >= heights[i - 1], `${species}: стадия ${i} ниже стадии ${i - 1} (${h} < ${heights[i - 1]})`);
    });
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
  assert.equal(state.pendingDrops.length, 1);
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
test('seeds come only from fruit: neither the 7th active day nor a full circle of 99 drops one', () => {
  const rng = () => 0;
  let state = model.initialState();
  for (let d = 1; d <= 7; d++) state = model.registerDhikr(state, `2026-09-0${d}`, { rng });
  assert.equal(state.activeDays, 7);
  assert.deepEqual(state.pendingDrops, []);
  assert.deepEqual(state.seeds, {});
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
  'subhanallahil_azim', 'la_hawla', 'salawat', 'hasbunallah'];
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
    assert.equal(d.target, 33, d.id);
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
