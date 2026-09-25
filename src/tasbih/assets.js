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
const GEOMETRY = {
  garden: { aspect: 0.924, hingeLeft: 0.352, hingeRight: 0.629, opening: { left: 0.352, right: 0.629, top: 0.299, bottom: 0.826 } },
  oasis: { aspect: 0.721, hingeLeft: 0.389, hingeRight: 0.607, opening: { left: 0.389, right: 0.607, top: 0.187, bottom: 0.765 } },
  highlands: { aspect: 0.696, hingeLeft: 0.378, hingeRight: 0.628, opening: { left: 0.378, right: 0.628, top: 0.156, bottom: 0.790 } },
};
export const GATE_THEMES = {
  winter: {
    assets: { arch: require('../../assets/tasbih/winter/arch_winter.png') },
    geometry: { aspect: 1.5, hingeLeft: 0.27, hingeRight: 0.73,
      opening: { left: 0.29, right: 0.71, top: 0.24, bottom: 0.95 } },
  },
  garden: {
    assets: {
      arch: require('../../assets/tasbih/gates/garden/arch.png'),
      doorLeft: require('../../assets/tasbih/gates/garden/door_left.png'),
      doorRight: require('../../assets/tasbih/gates/garden/door_right.png'),
      glow: require('../../assets/tasbih/gates/garden/glow.png'),
    },
    geometry: GEOMETRY.garden,
  },
  oasis: {
    assets: {
      arch: require('../../assets/tasbih/gates/oasis/arch.png'),
      doorLeft: require('../../assets/tasbih/gates/oasis/door_left.png'),
      doorRight: require('../../assets/tasbih/gates/oasis/door_right.png'),
      glow: require('../../assets/tasbih/gates/oasis/glow.png'),
    },
    geometry: GEOMETRY.oasis,
  },
  highlands: {
    assets: {
      arch: require('../../assets/tasbih/gates/highlands/arch.png'),
      doorLeft: require('../../assets/tasbih/gates/highlands/door_left.png'),
      doorRight: require('../../assets/tasbih/gates/highlands/door_right.png'),
      glow: require('../../assets/tasbih/gates/highlands/glow.png'),
    },
    geometry: GEOMETRY.highlands,
  },
};
export function gateFor(theme) {
  return GATE_THEMES[theme] || GATE_THEMES.garden;
}
