export const DHIKR = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', ru: 'Субханаллах', en: 'SubhanAllah', translation_ru: 'Пречист Аллах', translation_en: 'Glory be to Allah', target: 33 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', ru: 'Альхамдулиллях', en: 'Alhamdulillah', translation_ru: 'Хвала Аллаху', translation_en: 'Praise be to Allah', target: 33 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', ru: 'Аллаху акбар', en: 'Allahu Akbar', translation_ru: 'Аллах превелик', translation_en: 'Allah is the greatest', target: 33 },
];
// Prototype coefficients are separate from the counter and artwork.
export const GROWTH = { dailyCap: 100, firstBand: 33, secondBand: 99, laterWeight: 0.05, secondWeight: 0.35, activeDayContribution: 65 };

// 8 stages shared by every species; art is resolved by (species, stage index) in assets.js.
export const STAGES = [
  { requiredProgress: 0, minimumDays: 0 },
  { requiredProgress: 72, minimumDays: 1 },
  { requiredProgress: 300, minimumDays: 3 },
  { requiredProgress: 700, minimumDays: 7 },
  { requiredProgress: 1500, minimumDays: 15 },
  { requiredProgress: 2800, minimumDays: 30 },
  { requiredProgress: 5200, minimumDays: 50 },
  { requiredProgress: 8500, minimumDays: 75 },
];
export const STAGE_NAMES = [
  { ru: 'Зерно', en: 'Seed' },
  { ru: 'Росток', en: 'Sprout' },
  { ru: 'Побег', en: 'Shoot' },
  { ru: 'Саженец', en: 'Sapling' },
  { ru: 'Молодое дерево', en: 'Young tree' },
  { ru: 'Крепкое дерево', en: 'Growing tree' },
  { ru: 'Взрослое дерево', en: 'Mature tree' },
  { ru: 'Плодоносящее', en: 'Fruiting' },
];

// Drop weight doubles for a species the player does not yet own; sidr additionally requires
// at least 3 distinct owned species (see pickSpecies below).
export const SPECIES = [
  { id: 'olive', ru: 'Олива', en: 'Olive', rarity: 'common', weight: 30 },
  { id: 'fig', ru: 'Инжир', en: 'Fig', rarity: 'common', weight: 25 },
  { id: 'pomegranate', ru: 'Гранат', en: 'Pomegranate', rarity: 'common', weight: 25 },
  { id: 'date_palm', ru: 'Финиковая пальма', en: 'Date palm', rarity: 'common', weight: 20 },
  { id: 'sidr', ru: 'Сидр', en: 'Lote tree', rarity: 'rare', weight: 6 },
];
const SPECIES_IDS = new Set(SPECIES.map(s => s.id));

export function initialState() {
  return {
    version: 2, selectedDhikr: 'sequence', currentDhikrIndex: 0, currentDhikrCount: 0,
    totalDhikrCount: 0, perDhikrCounts: {}, dailyDhikrCounts: {},
    lastActiveDate: null, activeDays: 0,
    hasSeenTasbihHint: false, hasSeenGateHint: false,
    trees: [{ id: 't1', species: 'olive', progress: 0, activeDays: 0, stage: 0, lastGrowDate: null, plantedOn: null, harvested: false }],
    activeTreeId: 't1',
    seeds: {},
    lastCircleDropDate: null,
    pendingDrops: [],
    circleLimit: true,
    customDhikr: [],
  };
}
function customDhikrById(state, id) {
  return (state.customDhikr || []).find(d => `custom:${d.id}` === id);
}
// `free` (no fixed phrase) and `custom:<id>` (the user's own remembrances)
// share the same target rule as the three single dhikr: 33 while
// `circleLimit` is on, unbounded (target: null) once it's off. `sequence`
// ignores circleLimit entirely — it is always three circles of 33.
export function definition(state) {
  if (state.selectedDhikr === 'free') {
    return { id: 'free', arabic: '', ru: 'Свободный зикр', en: 'Free dhikr',
      translation_ru: 'Любые поминания — просто считайте', translation_en: 'Any remembrance — just count',
      target: state.circleLimit ? 33 : null };
  }
  if (typeof state.selectedDhikr === 'string' && state.selectedDhikr.startsWith('custom:')) {
    const custom = customDhikrById(state, state.selectedDhikr);
    if (custom) {
      return { id: state.selectedDhikr, arabic: custom.arabic || '', ru: custom.text, en: custom.text,
        translation_ru: custom.translation || '', translation_en: custom.translation || '',
        target: state.circleLimit ? 33 : null };
    }
  }
  const found = DHIKR.find(d => d.id === state.selectedDhikr);
  if (found) return state.selectedDhikr === 'sequence' ? found : { ...found, target: state.circleLimit ? 33 : null };
  return DHIKR[state.currentDhikrIndex] || DHIKR[0];
}
export function advance(state) {
  const target = definition(state).target;
  if (target == null || state.currentDhikrCount < target) return state;
  return { ...state, currentDhikrCount: 0,
    currentDhikrIndex: state.selectedDhikr === 'sequence' ? (state.currentDhikrIndex + 1) % DHIKR.length : state.currentDhikrIndex };
}
export function selectDhikr(state, id) {
  const valid = id === 'sequence' || id === 'free' || DHIKR.some(d => d.id === id) || !!customDhikrById(state, id);
  if (!valid) return state;
  return { ...state, selectedDhikr: id, currentDhikrIndex: 0, currentDhikrCount: 0 };
}
export function setCircleLimit(state, value) {
  return { ...state, circleLimit: !!value };
}
function trimTo(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
export function addCustomDhikr(state, { text, arabic, translation } = {}) {
  const trimmedText = trimTo(text, 80);
  if (!trimmedText) return state;
  const entry = { id: `c${Date.now()}${Math.floor(Math.random() * 1000)}`, text: trimmedText,
    arabic: trimTo(arabic, 120), translation: trimTo(translation, 120) };
  return { ...state, customDhikr: [...(state.customDhikr || []), entry] };
}
export function removeCustomDhikr(state, id) {
  const customDhikr = (state.customDhikr || []).filter(d => d.id !== id);
  if (customDhikr.length === (state.customDhikr || []).length) return state;
  if (state.selectedDhikr === `custom:${id}`) {
    return { ...state, customDhikr, selectedDhikr: 'free', currentDhikrIndex: 0, currentDhikrCount: 0 };
  }
  return { ...state, customDhikr };
}
// Which haptic/visual reaction a completed tap deserves. `prev` is the state
// right before the tap, `next` is registerDhikr's result. Every 33rd tap of
// a circle is `'circle'`; the third circle of a full sequence (or, with the
// per-dhikr circle limit off, every 99th tap) is the stronger `'complete'`.
export function tapEvent(prev, next) {
  if (next.selectedDhikr === 'sequence') {
    if (next.currentDhikrCount === 33) return prev.currentDhikrIndex === 2 ? 'complete' : 'circle';
    return 'tap';
  }
  const target = definition(next).target;
  if (target != null) return next.currentDhikrCount === target ? 'circle' : 'tap';
  const count = next.currentDhikrCount;
  if (count > 0 && count % 33 === 0) return count % 99 === 0 ? 'complete' : 'circle';
  return 'tap';
}
// Month → meteorological season for the garden backdrop (device clock).
export function seasonAt(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
export function growthForCount(count, config = GROWTH) {
  return Math.min(config.dailyCap,
    Math.min(count, config.firstBand) + Math.max(0, Math.min(count, config.secondBand) - config.firstBand) * config.secondWeight
      + Math.max(0, count - config.secondBand) * config.laterWeight);
}
// Returns the highest stage index whose thresholds are met; stages must be sorted ascending.
export function chooseStage(progress, activeDays, stages = STAGES) {
  let index = 0;
  for (let i = 0; i < stages.length; i += 1) {
    if (progress >= stages[i].requiredProgress && activeDays >= (stages[i].minimumDays || 0)) index = i;
  }
  return index;
}
export function activeTree(state) {
  return state.trees.find(t => t.id === state.activeTreeId) || null;
}
function ownedSpecies(state) {
  const owned = new Set(state.trees.map(t => t.species));
  for (const [species, count] of Object.entries(state.seeds || {})) if (count > 0) owned.add(species);
  return owned;
}
function pickSpecies(state, rng) {
  const owned = ownedSpecies(state);
  const sidrAllowed = owned.size >= 3;
  const entries = SPECIES.filter(s => s.id !== 'sidr' || sidrAllowed)
    .map(s => ({ id: s.id, weight: s.weight * (owned.has(s.id) ? 1 : 2) }));
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return entries[entries.length - 1].id;
}
export function registerDhikr(previous, dateKey, { rng = Math.random } = {}) {
  const state = advance(previous);
  const dhikr = definition(state);
  const todayCount = state.dailyDhikrCounts[dateKey] || 0;
  const isFirstToday = todayCount === 0;
  const activeDays = state.activeDays + (isFirstToday ? 1 : 0);
  const totalDhikrCount = state.totalDhikrCount + 1;
  const dailyDelta = growthForCount(todayCount + 1) - growthForCount(todayCount);

  let harvested = false;
  const trees = state.trees.map(tree => {
    if (tree.id !== state.activeTreeId) return tree;
    const treeFirstToday = tree.lastGrowDate !== dateKey;
    const progress = tree.progress + dailyDelta + (treeFirstToday ? GROWTH.activeDayContribution : 0);
    const treeActiveDays = tree.activeDays + (treeFirstToday ? 1 : 0);
    const stage = Math.max(tree.stage, chooseStage(progress, treeActiveDays));
    if (stage === STAGES.length - 1 && !tree.harvested) harvested = true;
    return { ...tree, progress, activeDays: treeActiveDays, stage, lastGrowDate: dateKey, harvested: tree.harvested || stage === STAGES.length - 1 };
  });

  let seeds = { ...state.seeds };
  const pendingDrops = [...state.pendingDrops];
  let lastCircleDropDate = state.lastCircleDropDate;
  const grant = (partial, reason) => {
    const species = pickSpecies({ ...partial, seeds }, rng);
    seeds = { ...seeds, [species]: (seeds[species] || 0) + 1 };
    pendingDrops.push({ species, reason });
  };
  if (isFirstToday && activeDays > 0 && activeDays % 7 === 0) grant({ trees }, 'week');
  if (harvested) grant({ trees }, 'harvest');
  const todayTotal = todayCount + 1;
  if (todayTotal % 99 === 0 && lastCircleDropDate !== dateKey && rng() < 0.12) {
    grant({ trees }, 'circle');
    lastCircleDropDate = dateKey;
  }

  return { ...state, currentDhikrCount: state.currentDhikrCount + 1, totalDhikrCount,
    perDhikrCounts: { ...state.perDhikrCounts, [dhikr.id]: (state.perDhikrCounts[dhikr.id] || 0) + 1 },
    dailyDhikrCounts: { ...state.dailyDhikrCounts, [dateKey]: todayTotal },
    lastActiveDate: dateKey, activeDays, trees, seeds, lastCircleDropDate, pendingDrops,
    hasSeenTasbihHint: state.hasSeenTasbihHint || totalDhikrCount >= 5 };
}
function nextTreeId(trees) {
  let max = 0;
  for (const tree of trees) {
    const match = /^t(\d+)$/.exec(tree.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `t${max + 1}`;
}
export function plantSeed(state, species, dateKey = null) {
  const available = state.seeds?.[species] || 0;
  if (available <= 0) return state;
  const seeds = { ...state.seeds, [species]: available - 1 };
  if (seeds[species] <= 0) delete seeds[species];
  const id = nextTreeId(state.trees);
  const tree = { id, species, progress: 0, activeDays: 0, stage: 0, lastGrowDate: null, plantedOn: dateKey, harvested: false };
  return { ...state, seeds, trees: [...state.trees, tree], activeTreeId: id };
}
export function setActiveTree(state, id) {
  if (!state.trees.some(t => t.id === id)) return state;
  return { ...state, activeTreeId: id };
}
export function ackDrop(state) {
  if (!state.pendingDrops.length) return state;
  return { ...state, pendingDrops: state.pendingDrops.slice(1) };
}
function sanitizeCustomDhikr(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue;
    if (typeof item.text !== 'string' || !item.text.trim()) continue;
    seen.add(item.id);
    out.push({ id: item.id, text: item.text.trim().slice(0, 80),
      arabic: typeof item.arabic === 'string' ? item.arabic.trim().slice(0, 120) : '',
      translation: typeof item.translation === 'string' ? item.translation.trim().slice(0, 120) : '' });
  }
  return out;
}
// Validates circleLimit/customDhikr and, transitively, selectedDhikr (which
// may now point at 'free' or a 'custom:<id>' entry) before sanitizeCounters
// clamps currentDhikrCount against the resulting target.
function sanitizeModes(state, base) {
  const next = { ...state };
  next.circleLimit = typeof next.circleLimit === 'boolean' ? next.circleLimit : base.circleLimit;
  next.customDhikr = sanitizeCustomDhikr(next.customDhikr);
  const validSelected = next.selectedDhikr === 'sequence' || next.selectedDhikr === 'free'
    || DHIKR.some(d => d.id === next.selectedDhikr) || !!customDhikrById(next, next.selectedDhikr);
  if (!validSelected) next.selectedDhikr = base.selectedDhikr;
  return next;
}
function sanitizeCounters(state, base) {
  const next = { ...state };
  for (const key of ['currentDhikrIndex', 'currentDhikrCount', 'totalDhikrCount', 'activeDays']) {
    if (!Number.isFinite(next[key]) || next[key] < 0) next[key] = base[key];
  }
  next.currentDhikrIndex = Math.floor(next.currentDhikrIndex) % DHIKR.length;
  const target = definition(next).target;
  next.currentDhikrCount = target == null ? Math.floor(next.currentDhikrCount) : Math.min(Math.floor(next.currentDhikrCount), target);
  for (const key of ['perDhikrCounts', 'dailyDhikrCounts']) {
    next[key] = Object.fromEntries(Object.entries(next[key] || {}).filter(([, value]) => Number.isSafeInteger(value) && value >= 0));
  }
  return next;
}
function sanitizeGarden(state, base) {
  const next = { ...state };
  let trees = Array.isArray(next.trees) ? next.trees.filter(t => t && SPECIES_IDS.has(t.species)
    && Number.isSafeInteger(t.stage) && t.stage >= 0 && t.stage < STAGES.length && typeof t.id === 'string' && t.id)
    .map(t => ({
      id: t.id, species: t.species,
      progress: Number.isFinite(t.progress) && t.progress >= 0 ? t.progress : 0,
      activeDays: Number.isSafeInteger(t.activeDays) && t.activeDays >= 0 ? t.activeDays : 0,
      stage: t.stage,
      lastGrowDate: typeof t.lastGrowDate === 'string' ? t.lastGrowDate : null,
      plantedOn: typeof t.plantedOn === 'string' ? t.plantedOn : null,
      harvested: !!t.harvested,
    })) : [];
  if (trees.length === 0) trees = base.trees;
  next.trees = trees;
  next.activeTreeId = trees.some(t => t.id === next.activeTreeId) ? next.activeTreeId : trees[0].id;
  const seeds = {};
  if (next.seeds && typeof next.seeds === 'object') {
    for (const [species, count] of Object.entries(next.seeds)) {
      if (SPECIES_IDS.has(species) && Number.isSafeInteger(count) && count > 0) seeds[species] = count;
    }
  }
  next.seeds = seeds;
  next.lastCircleDropDate = typeof next.lastCircleDropDate === 'string' ? next.lastCircleDropDate : null;
  next.pendingDrops = Array.isArray(next.pendingDrops)
    ? next.pendingDrops.filter(d => d && SPECIES_IDS.has(d.species) && typeof d.reason === 'string').map(d => ({ species: d.species, reason: d.reason }))
    : [];
  return next;
}
function migrateFromV1(raw, base) {
  const merged = { ...base, ...raw, version: 2 };
  const progress = Number.isFinite(raw.treeGrowthProgress) && raw.treeGrowthProgress >= 0 ? raw.treeGrowthProgress : 0;
  const activeDays = Number.isSafeInteger(raw.activeDays) && raw.activeDays >= 0 ? raw.activeDays : 0;
  const stage = chooseStage(progress, activeDays);
  merged.trees = [{ id: 't1', species: 'olive', progress, activeDays, stage,
    lastGrowDate: typeof merged.lastActiveDate === 'string' ? merged.lastActiveDate : null,
    plantedOn: null, harvested: stage === STAGES.length - 1 }];
  merged.activeTreeId = 't1';
  merged.seeds = {};
  merged.lastCircleDropDate = null;
  merged.pendingDrops = [];
  merged.circleLimit = true;
  merged.customDhikr = [];
  delete merged.treeGrowthProgress;
  delete merged.treeStage;
  return merged;
}
export function restoreState(raw) {
  const base = initialState();
  if (!raw || (raw.version !== 1 && raw.version !== 2)) return base;
  const merged = raw.version === 1 ? migrateFromV1(raw, base) : { ...base, ...raw, version: 2 };
  const modes = sanitizeModes(merged, base);
  const counters = sanitizeCounters(modes, base);
  return sanitizeGarden(counters, base);
}
export function isResting(state, dateKey) {
  return !!state.lastActiveDate && (Date.parse(dateKey) - Date.parse(state.lastActiveDate)) / 86400000 >= 7;
}
