# Gate artwork

Four raster layers share one 600×720 canvas: `arch.png`, `door_left.png`, `door_right.png`, `glow.png`.
Registered in `src/tasbih/assets.js` as `GATE_ASSETS`, with hinges and the opening rectangle in `GATE_GEOMETRY`.
Draw order (back to front): the tree window (clipped to the opening) → `glow` → doors → `arch`.
Door hinges: left door rotates around `GATE_GEOMETRY.hingeLeft` (fraction of width), right door around `hingeRight`.
