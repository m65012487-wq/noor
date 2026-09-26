// Tree artwork, keyed by species then stage index (0..7). Every stage of
// every species shares one camera scale with the trunk base at (0.5, 0.9),
// so TreeView draws it `contain` with no per-entry scale correction.
export const TREE_ASSETS = {
  olive: {
    0: { source: require('../../assets/tasbih/trees/olive/stage_1.png') },
    1: { source: require('../../assets/tasbih/trees/olive/stage_2.png') },
    2: { source: require('../../assets/tasbih/trees/olive/stage_3.png') },
    3: { source: require('../../assets/tasbih/trees/olive/stage_4.png') },
    4: { source: require('../../assets/tasbih/trees/olive/stage_5.png') },
    5: { source: require('../../assets/tasbih/trees/olive/stage_6.png') },
    6: { source: require('../../assets/tasbih/trees/olive/stage_7.png') },
    7: { source: require('../../assets/tasbih/trees/olive/stage_8.png') },
  },
  date_palm: {
    0: { source: require('../../assets/tasbih/trees/date_palm/stage_1.png') },
    1: { source: require('../../assets/tasbih/trees/date_palm/stage_2.png') },
    2: { source: require('../../assets/tasbih/trees/date_palm/stage_3.png') },
    3: { source: require('../../assets/tasbih/trees/date_palm/stage_4.png') },
    4: { source: require('../../assets/tasbih/trees/date_palm/stage_5.png') },
    5: { source: require('../../assets/tasbih/trees/date_palm/stage_6.png') },
    6: { source: require('../../assets/tasbih/trees/date_palm/stage_7.png') },
    7: { source: require('../../assets/tasbih/trees/date_palm/stage_8.png') },
  },
  pomegranate: {
    0: { source: require('../../assets/tasbih/trees/pomegranate/stage_1.png') },
    1: { source: require('../../assets/tasbih/trees/pomegranate/stage_2.png') },
    2: { source: require('../../assets/tasbih/trees/pomegranate/stage_3.png') },
    3: { source: require('../../assets/tasbih/trees/pomegranate/stage_4.png') },
    4: { source: require('../../assets/tasbih/trees/pomegranate/stage_5.png') },
    5: { source: require('../../assets/tasbih/trees/pomegranate/stage_6.png') },
    6: { source: require('../../assets/tasbih/trees/pomegranate/stage_7.png') },
    7: { source: require('../../assets/tasbih/trees/pomegranate/stage_8.png') },
  },
  fig: {
    0: { source: require('../../assets/tasbih/trees/fig/stage_1.png') },
    1: { source: require('../../assets/tasbih/trees/fig/stage_2.png') },
    2: { source: require('../../assets/tasbih/trees/fig/stage_3.png') },
    3: { source: require('../../assets/tasbih/trees/fig/stage_4.png') },
    4: { source: require('../../assets/tasbih/trees/fig/stage_5.png') },
    5: { source: require('../../assets/tasbih/trees/fig/stage_6.png') },
    6: { source: require('../../assets/tasbih/trees/fig/stage_7.png') },
    7: { source: require('../../assets/tasbih/trees/fig/stage_8.png') },
  },
  sidr: {
    0: { source: require('../../assets/tasbih/trees/sidr/stage_1.png') },
    1: { source: require('../../assets/tasbih/trees/sidr/stage_2.png') },
    2: { source: require('../../assets/tasbih/trees/sidr/stage_3.png') },
    3: { source: require('../../assets/tasbih/trees/sidr/stage_4.png') },
    4: { source: require('../../assets/tasbih/trees/sidr/stage_5.png') },
    5: { source: require('../../assets/tasbih/trees/sidr/stage_6.png') },
    6: { source: require('../../assets/tasbih/trees/sidr/stage_7.png') },
    7: { source: require('../../assets/tasbih/trees/sidr/stage_8.png') },
  },
};

// Seed icons, one per species — used in the garden sheet and the seed-drop
// animation on the tasbih screen.
export const SEED_ASSETS = {
  olive: require('../../assets/tasbih/seeds/olive.png'),
  date_palm: require('../../assets/tasbih/seeds/date_palm.png'),
  pomegranate: require('../../assets/tasbih/seeds/pomegranate.png'),
  fig: require('../../assets/tasbih/seeds/fig.png'),
  sidr: require('../../assets/tasbih/seeds/sidr.png'),
};
// Gates: one set of four stacked raster layers per environment theme on a
// shared canvas (720 wide, height = aspect × width). Geometry comes from
// scripts/tasbih_assets/build_assets.py (gates), which prints it for each theme:
// hinges are the door edges at the walls, opening is the doorway rectangle.
// Пока в приложении одна тема (см. SCHEMES в AppearanceContext.js), в бандл
// идёт только её графика. Файлы архивных тем лежат в assets/tasbih на месте;
// чтобы вернуть тему, добавьте её записи сюда обратно (история — коммит 4244381).
export const GATE_THEMES = {
  winter: {
    assets: { arch: require('../../assets/tasbih/winter/arch_winter.png') },
    // Проём измерен по альфе arch_winter.png: вершина свода 0.154, низ у
    // цоколей 0.95, внутренние грани колонн ≈0.28/0.72. По центру проёма
    // целится наезд камеры при входе, поэтому top важен (был 0.24 — камера
    // уезжала ниже середины арки).
    geometry: { aspect: 1.5, hingeLeft: 0.28, hingeRight: 0.72,
      opening: { left: 0.28, right: 0.72, top: 0.154, bottom: 0.95 } },
  },
};
export function gateFor(theme) {
  return GATE_THEMES[theme] || GATE_THEMES.winter;
}
