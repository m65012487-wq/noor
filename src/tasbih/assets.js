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
// Four stacked raster layers sharing one canvas; see GATE_GEOMETRY for the
// door hinges and the opening rectangle the tree window clips to.
export const GATE_ASSETS = {
  arch: require('../../assets/tasbih/gate/arch.png'),
  doorLeft: require('../../assets/tasbih/gate/door_left.png'),
  doorRight: require('../../assets/tasbih/gate/door_right.png'),
  glow: require('../../assets/tasbih/gate/glow.png'),
};
export const GATE_GEOMETRY = {
  aspect: 1.2,
  hingeLeft: 0.272,
  hingeRight: 0.730,
  opening: { left: 0.272, right: 0.730, top: 0.225, bottom: 0.933 },
};
