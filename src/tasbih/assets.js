import { OLIVE_STAGES } from '../garden/oliveStages';
// Replace an entry with { source: require('../../assets/tasbih/tree/name.png') }.
// Layered artwork may use { layers: [{ source }, ...] }.
export const TREE_ASSETS = Object.fromEntries(OLIVE_STAGES.map(stage => [stage.id, { xml: stage.xml }]));
export const GATE_ASSETS = { gate_arch: null, gate_left_door: null, gate_right_door: null, gate_plants: null, gate_light: null };
