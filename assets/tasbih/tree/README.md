# Tree artwork

Current release uses olive_stage_01.png through olive_stage_05.png, explicitly requested by the user after preview. Original generated alpha and soft atmospheric halos are retained. TREE_ASSETS scales young/juvenile stages around the shared base; original SVGs remain in the garden prototype.

Place supplied transparent PNG/WebP files here, e.g. `olive_stage_06.png`.
Keep the same canvas proportions and root anchor (currently x=50%, y≈90%).
Register literal `require()` paths in `src/tasbih/assets.js`, then add stage metadata in `src/tasbih/model.js`.
Never register a require for a file that does not exist: Metro resolves files at build time.
Unregistered stages fall back to preceding registered art. The existing olive SVGs are reused until replacements arrive.
