import { dateFromKey } from '../utils/calendarDate';
export const DHIKR = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', ru: 'Субханаллах', en: 'SubhanAllah', translation_ru: 'Пречист Аллах', translation_en: 'Glory be to Allah', target: 33 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', ru: 'Альхамдулиллях', en: 'Alhamdulillah', translation_ru: 'Хвала Аллаху', translation_en: 'Praise be to Allah', target: 33 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', ru: 'Аллаху акбар', en: 'Allahu Akbar', translation_ru: 'Аллах превелик', translation_en: 'Allah is the greatest', target: 33 },
  // Дальше идут отдельные поминания: в последовательность по умолчанию они не
  // входят (см. DEFAULT_SEQUENCE), но их можно добавить в редакторе.
  { id: 'la_ilaha_illallah', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', ru: 'Ля иляха илляЛлах', en: 'La ilaha illallah', translation_ru: 'Нет божества, кроме Аллаха', translation_en: 'There is no god but Allah', target: 33 },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', ru: 'Астагфируллах', en: 'Astaghfirullah', translation_ru: 'Прошу прощения у Аллаха', translation_en: "I seek Allah's forgiveness", target: 33 },
  { id: 'subhanallahi_wa_bihamdihi', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', ru: 'Субханаллахи ва бихамдихи', en: 'SubhanAllahi wa bihamdihi', translation_ru: 'Пречист Аллах, и хвала Ему', translation_en: 'Glory and praise be to Allah', target: 33 },
  { id: 'subhanallahil_azim', arabic: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', ru: 'Субханаллахиль-Азым', en: 'SubhanAllahil-Azim', translation_ru: 'Пречист Аллах Великий', translation_en: 'Glory be to Allah the Magnificent', target: 33 },
  { id: 'la_hawla', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', ru: 'Ля хауля ва ля куввата илля билЛях', en: 'La hawla wa la quwwata illa billah', translation_ru: 'Нет мощи и силы, кроме как у Аллаха', translation_en: 'There is no power nor strength except with Allah', target: 33 },
  { id: 'salawat', arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', ru: 'Аллахумма салли аля Мухаммад', en: 'Allahumma salli ala Muhammad', translation_ru: 'О Аллах, благослови Мухаммада', translation_en: 'O Allah, send blessings upon Muhammad', target: 33 },
  { id: 'hasbunallah', arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', ru: 'Хасбуна-Ллаху ва ни‘маль-вакиль', en: "Hasbunallahu wa ni'mal wakil", translation_ru: 'Достаточно нам Аллаха, и Он — лучший Покровитель', translation_en: 'Allah is sufficient for us, and He is the best Disposer of affairs', target: 33 },
];
// «Последовательность» — шаги { id, target } по кругу; по умолчанию три первых
// поминания по 33. Задаётся явными id, а не длиной DHIKR: список поминаний
// растёт, а круг остаётся в 99. id — из DHIKR или `custom:<id>` своего поминания.
export const DEFAULT_SEQUENCE = [
  { id: 'subhanallah', target: 33 },
  { id: 'alhamdulillah', target: 33 },
  { id: 'allahuakbar', target: 33 },
];
export const SEQUENCE_MAX_STEPS = 12;
export const SEQUENCE_MAX_TARGET = 999;
// Prototype coefficients are separate from the counter and artwork. Every dhikr
// is one unit of growth; the first `bonusTaps` of each day count `bonusMultiplier` times.
export const GROWTH = { bonusTaps: 33, bonusMultiplier: 2 };
// Азкары после намаза: в первые полчаса после любого из пяти намазов рост
// идёт в полтора раза быстрее. Это поощрение привычки, а не ограничение:
// вне окна дерево растёт как обычно.
export const AFTER_PRAYER = { minutes: 30, multiplier: 1.5 };

// 8 stages shared by every species; the silhouette is resolved by (species, stage index) in treeArt.js.
// Стадию задаёт только накопленный рост — сроков нет: 99 поминаний в день дают
// плоды примерно за 15 дней, 33 — за месяц, 300 — за неделю.
export const STAGES = [
  { requiredProgress: 0 },
  { requiredProgress: 40 },
  { requiredProgress: 160 },
  { requiredProgress: 360 },
  { requiredProgress: 640 },
  { requiredProgress: 1000 },
  { requiredProgress: 1450 },
  { requiredProgress: 2000 },
];
// Пока активное дерево плодоносит, прирост копится в запасе и достаётся
// следующему посаженному зерну; новое дерево стартует не дальше «Крепкого дерева».
export const RESERVE_CAP = STAGES[5].requiredProgress;
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

function defaultSequence() {
  return DEFAULT_SEQUENCE.map(step => ({ ...step }));
}
export function initialState() {
  return {
    version: 3, selectedDhikr: 'sequence', currentDhikrIndex: 0, currentDhikrCount: 0,
    totalDhikrCount: 0, perDhikrCounts: {}, dailyDhikrCounts: {},
    lastActiveDate: null, activeDays: 0, lastFridayGift: null,
    hasSeenTasbihHint: false,
    trees: [{ id: 't1', species: 'olive', progress: 0, activeDays: 0, stage: 0, lastGrowDate: null, plantedOn: null, harvested: false, inGrove: false }],
    activeTreeId: 't1',
    seeds: {},
    reserve: 0,
    pendingDrops: [],
    circleLimit: true,
    customDhikr: [],
    sequence: defaultSequence(),
  };
}
function customDhikrById(state, id) {
  return (state.customDhikr || []).find(d => `custom:${d.id}` === id);
}
// Definition of one remembrance (built-in or custom) with the given target, or
// null when the id doesn't resolve. Shared by single mode and sequence steps.
function dhikrDefinition(state, id, target) {
  if (typeof id === 'string' && id.startsWith('custom:')) {
    const custom = customDhikrById(state, id);
    if (!custom) return null;
    return { id, arabic: custom.arabic || '', ru: custom.text, en: custom.text,
      translation_ru: custom.translation || '', translation_en: custom.translation || '', target };
  }
  const found = DHIKR.find(d => d.id === id);
  return found ? { ...found, target } : null;
}
// Resolved steps of the sequence: each is what definition() would return for
// that single remembrance, but with the step's own target. Steps that no longer
// resolve are skipped; with none left the default three circles apply.
export function sequenceSteps(state) {
  const steps = (Array.isArray(state.sequence) ? state.sequence : [])
    .map(step => (step ? dhikrDefinition(state, step.id, step.target) : null)).filter(Boolean);
  return steps.length ? steps : DEFAULT_SEQUENCE.map(step => dhikrDefinition(state, step.id, step.target));
}
// `free` (no fixed phrase) and `custom:<id>` (the user's own remembrances)
// share the same target rule as the single dhikr: 33 while
// `circleLimit` is on, unbounded (target: null) once it's off. `sequence`
// ignores circleLimit entirely — every step has its own target.
export function definition(state) {
  if (state.selectedDhikr === 'free') {
    return { id: 'free', arabic: '', ru: 'Свободный зикр', en: 'Free dhikr',
      translation_ru: 'Любые поминания — просто считайте', translation_en: 'Any remembrance — just count',
      target: state.circleLimit ? 33 : null };
  }
  if (state.selectedDhikr !== 'sequence') {
    const single = dhikrDefinition(state, state.selectedDhikr, state.circleLimit ? 33 : null);
    if (single) return single;
  }
  // 'sequence' (and any unknown id) resolves through the sequence steps.
  const steps = sequenceSteps(state);
  return steps[state.currentDhikrIndex % steps.length];
}
export function advance(state) {
  const target = definition(state).target;
  if (target == null || state.currentDhikrCount < target) return state;
  return { ...state, currentDhikrCount: 0,
    currentDhikrIndex: state.selectedDhikr === 'sequence' ? (state.currentDhikrIndex + 1) % sequenceSteps(state).length : state.currentDhikrIndex };
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
// Cleans a list of steps: unknown ids are dropped, target is rounded and
// clamped to 1..SEQUENCE_MAX_TARGET (junk falls back to 33), the list is cut to
// SEQUENCE_MAX_STEPS; nothing left means DEFAULT_SEQUENCE. Custom ids are
// checked against `state.customDhikr`.
function cleanSequence(state, steps) {
  const out = [];
  for (const step of Array.isArray(steps) ? steps : []) {
    if (out.length >= SEQUENCE_MAX_STEPS) break;
    if (!step || typeof step.id !== 'string') continue;
    if (!DHIKR.some(d => d.id === step.id) && !customDhikrById(state, step.id)) continue;
    const raw = typeof step.target === 'number' && !Number.isNaN(step.target) ? Math.round(step.target) : 33;
    out.push({ id: step.id, target: Math.min(SEQUENCE_MAX_TARGET, Math.max(1, raw)) });
  }
  return out.length ? out : defaultSequence();
}
function sameSequence(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length
    && a.every((step, i) => step.id === b[i].id && step.target === b[i].target);
}
// The sequence's own counter restarts whenever its steps change: the old index
// and count could point past the new list or at another step's target.
function resetSequenceCounter(state) {
  return state.selectedDhikr === 'sequence' ? { ...state, currentDhikrIndex: 0, currentDhikrCount: 0 } : state;
}
export function setSequence(state, steps) {
  const sequence = cleanSequence(state, steps);
  if (sameSequence(sequence, state.sequence)) return state;
  return resetSequenceCounter({ ...state, sequence });
}
export function removeCustomDhikr(state, id) {
  const customDhikr = (state.customDhikr || []).filter(d => d.id !== id);
  if (customDhikr.length === (state.customDhikr || []).length) return state;
  let next = { ...state, customDhikr };
  if (state.selectedDhikr === `custom:${id}`) {
    next = { ...next, selectedDhikr: 'free', currentDhikrIndex: 0, currentDhikrCount: 0 };
  }
  const steps = Array.isArray(state.sequence) ? state.sequence : [];
  const kept = steps.filter(step => step?.id !== `custom:${id}`);
  if (kept.length !== steps.length) {
    next = resetSequenceCounter({ ...next, sequence: kept.length ? kept : defaultSequence() });
  }
  return next;
}
// Which haptic/visual reaction a completed tap deserves. `prev` is the state
// right before the tap, `next` is registerDhikr's result. Every completed
// circle is `'circle'`; the last step of the sequence (or, with the per-dhikr
// circle limit off, every 99th tap) is the stronger `'complete'`.
export function tapEvent(prev, next) {
  if (next.selectedDhikr === 'sequence') {
    // registerDhikr has already moved on from a finished step, so the index in
    // `next` is the step that was just counted (not `prev`'s, which may be the old one).
    const steps = sequenceSteps(next);
    const index = next.currentDhikrIndex % steps.length;
    if (next.currentDhikrCount !== steps[index].target) return 'tap';
    return index === steps.length - 1 ? 'complete' : 'circle';
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
// Growth for the day's first `count` remembrances: each is one unit, the first
// `bonusTaps` count `bonusMultiplier` times. No daily cap.
export function growthForCount(count, config = GROWTH) {
  return count + Math.min(count, config.bonusTaps) * (config.bonusMultiplier - 1);
}
// Returns the highest stage index whose threshold is met; stages must be sorted ascending.
export function chooseStage(progress, stages = STAGES) {
  let index = 0;
  for (let i = 0; i < stages.length; i += 1) {
    if (progress >= stages[i].requiredProgress) index = i;
  }
  return index;
}
export function activeTree(state) {
  return state.trees.find(t => t.id === state.activeTreeId) || null;
}
// Share (0..1) of the way to the next stage, by growth alone.
// The last stage is always 1.
export function growthRatio(tree, stages = STAGES) {
  const cur = stages[tree.stage];
  const next = stages[tree.stage + 1];
  if (!cur) return 0;
  if (!next) return 1;
  return Math.max(0, Math.min(1, (tree.progress - cur.requiredProgress) / Math.max(1, next.requiredProgress - cur.requiredProgress)));
}
function ownedSpecies(state) {
  const owned = new Set(state.trees.map(t => t.species));
  for (const [species, count] of Object.entries(state.seeds || {})) if (count > 0) owned.add(species);
  return owned;
}
// Подарочные зёрна — за семь дней зикра и за подросшее дерево — несут только
// новые породы, пока коллекция не собрана: подарок должен открывать растение,
// которого ещё нет, а не копить дубли. Зерно за плоды выпадает всегда и по весам.
// Когда нечего открывать, подарка нет — и зёрна не копятся горой, которую
// некуда сажать: растёт одно дерево за раз.
export const GIFT_EVERY_DAYS = 7;
export const GIFT_STAGE = 4;
function pickNewSpecies(state, rng) {
  const owned = ownedSpecies(state);
  const fresh = SPECIES.filter(s => !owned.has(s.id) && (s.id !== 'sidr' || owned.size >= 3));
  if (!fresh.length) return null;
  const total = fresh.reduce((sum, s) => sum + s.weight, 0);
  let roll = rng() * total;
  for (const s of fresh) {
    roll -= s.weight;
    if (roll <= 0) return s.id;
  }
  return fresh[fresh.length - 1].id;
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
export function registerDhikr(previous, dateKey, { rng = Math.random, afterPrayer = false } = {}) {
  const state = advance(previous);
  const dhikr = definition(state);
  const todayCount = state.dailyDhikrCounts[dateKey] || 0;
  const isFirstToday = todayCount === 0;
  const activeDays = state.activeDays + (isFirstToday ? 1 : 0);
  const totalDhikrCount = state.totalDhikrCount + 1;
  const delta = (growthForCount(todayCount + 1) - growthForCount(todayCount)) * (afterPrayer ? AFTER_PRAYER.multiplier : 1);

  const finalStage = STAGES.length - 1;
  let harvested = false;
  let grewTo = false;
  let reserve = Number.isFinite(state.reserve) ? state.reserve : 0;
  const trees = state.trees.map(tree => {
    if (tree.id !== state.activeTreeId) return tree;
    const treeActiveDays = tree.activeDays + (tree.lastGrowDate !== dateKey ? 1 : 0);
    // A fruiting tree has no stages left to earn: the same growth is also kept in
    // the reserve for the next seed. A tree that fruits but was never marked
    // harvested (old saves) pays out its seed now.
    if (tree.stage === finalStage) {
      reserve = Math.min(RESERVE_CAP, reserve + delta);
      if (!tree.harvested) harvested = true;
      return { ...tree, progress: tree.progress + delta, activeDays: treeActiveDays, lastGrowDate: dateKey, harvested: true };
    }
    const progress = tree.progress + delta;
    const stage = Math.max(tree.stage, chooseStage(progress));
    if (stage === finalStage && !tree.harvested) harvested = true;
    if (tree.stage < GIFT_STAGE && stage >= GIFT_STAGE) grewTo = true;
    return { ...tree, progress, activeDays: treeActiveDays, stage, lastGrowDate: dateKey, harvested: tree.harvested || stage === finalStage };
  });

  // One seed per grown tree: only the first time the active tree fruits.
  let seeds = { ...state.seeds };
  const pendingDrops = [...state.pendingDrops];
  if (harvested) {
    const species = pickSpecies({ trees, seeds }, rng);
    seeds = { ...seeds, [species]: (seeds[species] || 0) + 1 };
    pendingDrops.push({ species, reason: 'harvest' });
  }
  // Подарки: каждый седьмой день зикра и первый подъём дерева до «Молодого
  // дерева» (по разу на дерево — стадия назад не идёт).
  const gifts = [];
  if (isFirstToday && activeDays % GIFT_EVERY_DAYS === 0) gifts.push('week');
  if (grewTo) gifts.push('growth');
  for (const reason of gifts) {
    const species = pickNewSpecies({ trees, seeds }, rng);
    if (!species) break;
    seeds = { ...seeds, [species]: (seeds[species] || 0) + 1 };
    pendingDrops.push({ species, reason });
  }
  // Пятница: первая завершённая за день последовательность (или круг из 99 в
  // свободном режиме) приносит зерно. В отличие от подарков оно выпадает и
  // тогда, когда коллекция собрана, — это ритуал дня, а не награда за новизну;
  // порода тогда выбирается по весам.
  let lastFridayGift = state.lastFridayGift || null;
  const counted = { ...state, currentDhikrCount: state.currentDhikrCount + 1 };
  // Круг завершён последовательностью или набрано 99 поминаний за день в любом режиме:
  // иначе считающий одиночным зикром или кругами по 33 пятничного зерна не видел бы.
  const finishedCircle = tapEvent(previous, counted) === 'complete' || todayCount + 1 === 99;
  if (lastFridayGift !== dateKey && dateFromKey(dateKey).getDay() === 5 && finishedCircle) {
    const species = pickNewSpecies({ trees, seeds }, rng) || pickSpecies({ trees, seeds }, rng);
    seeds = { ...seeds, [species]: (seeds[species] || 0) + 1 };
    pendingDrops.push({ species, reason: 'friday' });
    lastFridayGift = dateKey;
  }

  return { ...state, currentDhikrCount: state.currentDhikrCount + 1, totalDhikrCount,
    perDhikrCounts: { ...state.perDhikrCounts, [dhikr.id]: (state.perDhikrCounts[dhikr.id] || 0) + 1 },
    dailyDhikrCounts: { ...state.dailyDhikrCounts, [dateKey]: todayCount + 1 },
    lastActiveDate: dateKey, activeDays, trees, seeds, reserve, pendingDrops, lastFridayGift,
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
// Дерево в плодах можно отправить в рощу: оно перестаёт быть «живым» и больше
// не занимает ряд «Мои деревья», но остаётся в саду навсегда — и считается
// в коллекции пород. Ухаживаемое дерево отправить нельзя (иначе счёт остался бы
// без дерева), поэтому при посадке нового зерна плодоносящее уходит в рощу само.
export function isFruiting(tree) {
  return !!tree && tree.harvested && tree.stage === STAGES.length - 1;
}
export function retireTree(state, id) {
  const tree = state.trees.find(t => t.id === id);
  if (!isFruiting(tree) || tree.inGrove || id === state.activeTreeId) return state;
  return { ...state, trees: state.trees.map(t => (t.id === id ? { ...t, inGrove: true } : t)) };
}
// The new tree takes over all growth kept while the previous one was fruiting.
export function plantSeed(state, species, dateKey = null) {
  const available = state.seeds?.[species] || 0;
  if (available <= 0) return state;
  const seeds = { ...state.seeds, [species]: available - 1 };
  if (seeds[species] <= 0) delete seeds[species];
  const id = nextTreeId(state.trees);
  const progress = Number.isFinite(state.reserve) ? state.reserve : 0;
  const tree = { id, species, progress, activeDays: 0, stage: chooseStage(progress), lastGrowDate: null, plantedOn: dateKey, harvested: false, inGrove: false };
  // Плодоносящее дерево, которое мы оставляем, уходит в рощу.
  const retired = state.trees.map(t => (t.id === state.activeTreeId && isFruiting(t) ? { ...t, inGrove: true } : t));
  return { ...state, seeds, trees: [...retired, tree], activeTreeId: id, reserve: 0 };
}
export function setActiveTree(state, id) {
  if (!state.trees.some(t => t.id === id && !t.inGrove)) return state;
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
// Validates circleLimit/customDhikr/sequence and, transitively, selectedDhikr
// (which may now point at 'free' or a 'custom:<id>' entry) before
// sanitizeCounters clamps currentDhikrCount against the resulting target.
function sanitizeModes(state, base) {
  const next = { ...state };
  next.circleLimit = typeof next.circleLimit === 'boolean' ? next.circleLimit : base.circleLimit;
  next.customDhikr = sanitizeCustomDhikr(next.customDhikr);
  next.sequence = cleanSequence(next, next.sequence);
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
  next.currentDhikrIndex = Math.floor(next.currentDhikrIndex) % sequenceSteps(next).length;
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
      inGrove: !!t.inGrove,
    })) : [];
  if (trees.length === 0) trees = base.trees;
  next.trees = trees;
  // Живое дерево — первое не из рощи; в роще не может быть и активного.
  const living = trees.find(t => !t.inGrove);
  if (!living) trees = trees.map((t, i) => (i === 0 ? { ...t, inGrove: false } : t));
  next.trees = trees;
  const activeOk = trees.some(t => t.id === next.activeTreeId && !t.inGrove);
  next.activeTreeId = activeOk ? next.activeTreeId : trees.find(t => !t.inGrove).id;
  next.lastFridayGift = typeof next.lastFridayGift === 'string' ? next.lastFridayGift : null;
  const seeds = {};
  if (next.seeds && typeof next.seeds === 'object') {
    for (const [species, count] of Object.entries(next.seeds)) {
      if (SPECIES_IDS.has(species) && Number.isSafeInteger(count) && count > 0) seeds[species] = count;
    }
  }
  next.seeds = seeds;
  next.reserve = Number.isFinite(next.reserve) && next.reserve >= 0 ? Math.min(next.reserve, RESERVE_CAP) : 0;
  delete next.lastCircleDropDate;
  next.pendingDrops = Array.isArray(next.pendingDrops)
    ? next.pendingDrops.filter(d => d && SPECIES_IDS.has(d.species) && typeof d.reason === 'string').map(d => ({ species: d.species, reason: d.reason }))
    : [];
  return next;
}
function migrateFromV1(raw, base) {
  const merged = { ...base, ...raw, version: 3 };
  const progress = Number.isFinite(raw.treeGrowthProgress) && raw.treeGrowthProgress >= 0 ? raw.treeGrowthProgress : 0;
  const activeDays = Number.isSafeInteger(raw.activeDays) && raw.activeDays >= 0 ? raw.activeDays : 0;
  const stage = chooseStage(progress);
  merged.trees = [{ id: 't1', species: 'olive', progress, activeDays, stage,
    lastGrowDate: typeof merged.lastActiveDate === 'string' ? merged.lastActiveDate : null,
    plantedOn: null, harvested: stage === STAGES.length - 1, inGrove: false }];
  merged.activeTreeId = 't1';
  merged.seeds = {};
  merged.pendingDrops = [];
  merged.circleLimit = true;
  merged.customDhikr = [];
  merged.sequence = defaultSequence();
  merged.reserve = 0;
  delete merged.treeGrowthProgress;
  delete merged.treeStage;
  return merged;
}
// v2 → v3: the sequence is configurable, growth has no day limits and is kept in
// `reserve`; the old growth thresholds were higher, so a tree never ends up
// below the stage its progress now earns (see restoreState).
function migrateFromV2(raw, base) {
  return { ...base, ...raw, version: 3, sequence: defaultSequence(), reserve: 0 };
}
export function restoreState(raw) {
  const base = initialState();
  if (!raw || ![1, 2, 3].includes(raw.version)) return base;
  const merged = raw.version === 1 ? migrateFromV1(raw, base) : raw.version === 2 ? migrateFromV2(raw, base) : { ...base, ...raw, version: 3 };
  const modes = sanitizeModes(merged, base);
  const counters = sanitizeCounters(modes, base);
  const garden = sanitizeGarden(counters, base);
  if (raw.version === 3) return garden;
  return { ...garden, trees: garden.trees.map(t => ({ ...t, stage: Math.max(t.stage, chooseStage(t.progress)) })) };
}
export function isResting(state, dateKey) {
  return !!state.lastActiveDate && (Date.parse(dateKey) - Date.parse(state.lastActiveDate)) / 86400000 >= 7;
}
