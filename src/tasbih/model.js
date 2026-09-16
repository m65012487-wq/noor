export const DHIKR = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', ru: 'Субханаллах', en: 'SubhanAllah', translation_ru: 'Пречист Аллах', translation_en: 'Glory be to Allah', target: 33 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', ru: 'Альхамдулиллях', en: 'Alhamdulillah', translation_ru: 'Хвала Аллаху', translation_en: 'Praise be to Allah', target: 33 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', ru: 'Аллаху акбар', en: 'Allahu Akbar', translation_ru: 'Аллах превелик', translation_en: 'Allah is the greatest', target: 33 },
];
// Prototype coefficients are separate from the counter and artwork.
export const GROWTH = { dailyCap: 100, firstBand: 33, secondBand: 99, laterWeight: 0.05, secondWeight: 0.35, activeDayContribution: 65 };
export const STAGES = [
  { id: 'olive_stage_01', assetName: 'seed', requiredProgress: 0, minimumDays: 0 },
  { id: 'olive_stage_02', assetName: 'sprout', requiredProgress: 72, minimumDays: 1 },
  { id: 'olive_stage_03', assetName: 'young', requiredProgress: 450, minimumDays: 5 },
  { id: 'olive_stage_04', assetName: 'tree_young', requiredProgress: 2500, minimumDays: 25 },
  { id: 'olive_stage_05', assetName: 'tree_mature', requiredProgress: 8500, minimumDays: 75 },
];
export function initialState() {
  return { version: 1, selectedDhikr: 'sequence', currentDhikrIndex: 0, currentDhikrCount: 0,
    totalDhikrCount: 0, perDhikrCounts: {}, treeGrowthProgress: 0, treeStage: STAGES[0].id,
    lastActiveDate: null, activeDays: 0, dailyDhikrCounts: {}, hasSeenTasbihHint: false, hasSeenGateHint: false };
}
export function definition(state) {
  return DHIKR.find(d => d.id === state.selectedDhikr) || DHIKR[state.currentDhikrIndex] || DHIKR[0];
}
export function advance(state) {
  if (state.currentDhikrCount < definition(state).target) return state;
  return { ...state, currentDhikrCount: 0,
    currentDhikrIndex: state.selectedDhikr === 'sequence' ? (state.currentDhikrIndex + 1) % DHIKR.length : state.currentDhikrIndex };
}
export function selectDhikr(state, id) {
  if (id !== 'sequence' && !DHIKR.some(d => d.id === id)) return state;
  return { ...state, selectedDhikr: id, currentDhikrIndex: 0, currentDhikrCount: 0 };
}
export function growthForCount(count, config = GROWTH) {
  return Math.min(config.dailyCap,
    Math.min(count, config.firstBand) + Math.max(0, Math.min(count, config.secondBand) - config.firstBand) * config.secondWeight
      + Math.max(0, count - config.secondBand) * config.laterWeight);
}
export function chooseStage(progress, activeDays, stages = STAGES) {
  return [...stages].sort((a, b) => a.requiredProgress - b.requiredProgress)
    .filter(s => progress >= s.requiredProgress && activeDays >= (s.minimumDays || 0)).pop() || stages[0] || null;
}
export function registerDhikr(previous, dateKey, config = GROWTH, stages = STAGES) {
  const state = advance(previous);
  const dhikr = definition(state);
  const todayCount = state.dailyDhikrCounts[dateKey] || 0;
  const activeDays = state.activeDays + (todayCount === 0 ? 1 : 0);
  const treeGrowthProgress = state.treeGrowthProgress + growthForCount(todayCount + 1, config) - growthForCount(todayCount, config)
    + (todayCount === 0 ? config.activeDayContribution : 0);
  const totalDhikrCount = state.totalDhikrCount + 1;
  const candidate = chooseStage(treeGrowthProgress, activeDays, stages);
  const previousStage = stages.find(s => s.id === state.treeStage);
  const treeStage = previousStage && candidate && previousStage.requiredProgress > candidate.requiredProgress ? previousStage : candidate;
  return { ...state, currentDhikrCount: state.currentDhikrCount + 1, totalDhikrCount,
    perDhikrCounts: { ...state.perDhikrCounts, [dhikr.id]: (state.perDhikrCounts[dhikr.id] || 0) + 1 },
    dailyDhikrCounts: { ...state.dailyDhikrCounts, [dateKey]: todayCount + 1 },
    lastActiveDate: dateKey, activeDays, treeGrowthProgress,
    treeStage: treeStage?.id || state.treeStage,
    hasSeenTasbihHint: state.hasSeenTasbihHint || totalDhikrCount >= 5 };
}
export function restoreState(raw) {
  const base = initialState();
  if (!raw || raw.version !== 1) return base;
  const state = { ...base, ...raw };
  for (const key of ['currentDhikrIndex', 'currentDhikrCount', 'totalDhikrCount', 'treeGrowthProgress', 'activeDays']) {
    if (!Number.isFinite(state[key]) || state[key] < 0) state[key] = base[key];
  }
  state.currentDhikrIndex = Math.floor(state.currentDhikrIndex) % DHIKR.length;
  if (state.selectedDhikr !== 'sequence' && !DHIKR.some(d => d.id === state.selectedDhikr)) state.selectedDhikr = 'sequence';
  state.currentDhikrCount = Math.min(Math.floor(state.currentDhikrCount), definition(state).target);
  for (const key of ['perDhikrCounts', 'dailyDhikrCounts']) {
    state[key] = Object.fromEntries(Object.entries(state[key] || {}).filter(([, value]) => Number.isSafeInteger(value) && value >= 0));
  }
  return state;
}
export function isResting(state, dateKey) {
  return !!state.lastActiveDate && (Date.parse(dateKey) - Date.parse(state.lastActiveDate)) / 86400000 >= 7;
}
export function resolveStageAsset(stageId, registry, stages = STAGES) {
  const index = stages.findIndex(s => s.id === stageId);
  for (let i = Math.max(0, index); i >= 0; i -= 1) {
    const asset = registry[stages[i]?.assetName];
    if (asset) return asset;
  }
  return Object.values(registry).find(Boolean) || null;
}
