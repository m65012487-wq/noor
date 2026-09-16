# Gate artwork

Five transparent SVG layers are included: arch, independent left/right doors, plants and lights.
Runtime XML is in `src/tasbih/gateVectors.js`; tests keep it identical to these files.
To replace a layer with PNG, set its matching `GATE_ASSETS` entry in `src/tasbih/assets.js`.
Keep the same aspect ratio and transparent padding. Door hinges are left/right respectively.
See `docs/TasbihAssetManifest.md` for dimensions, anchors and layer order.
