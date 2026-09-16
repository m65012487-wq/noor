// Replace an entry with { source: require('../../assets/tasbih/tree/name.png') }.
// Layered artwork may use { layers: [{ source }, ...] }.
export const TREE_ASSETS = {
  seed: { source: require('../../assets/tasbih/tree/olive_stage_01.png'), scale: 1 },
  sprout: { source: require('../../assets/tasbih/tree/olive_stage_02.png'), scale: 0.85 },
  young: { source: require('../../assets/tasbih/tree/olive_stage_03.png'), scale: 0.44 },
  tree_young: { source: require('../../assets/tasbih/tree/olive_stage_04.png'), scale: 0.70 },
  tree_mature: { source: require('../../assets/tasbih/tree/olive_stage_05.png'), scale: 1 },
};
export const GATE_ASSETS = { gate_arch: null, gate_left_door: null, gate_right_door: null, gate_plants: null, gate_light: null };
