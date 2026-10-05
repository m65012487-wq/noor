# Ассеты Tasbih

Монохромные силуэты, сгенерированные Krea-2 через ComfyUI и собранные `scripts/tasbih_assets/build_v5.py`:
белый цвет с альфой, цвет даёт тема через `tintColor`.

- `trees5/<порода>_0..7.png` — пять пород (olive, date_palm, pomegranate, fig, sidr) по восемь стадий,
  холст 240×300, корень в (120, 270). Рамки и холст — `src/tasbih/treeArt.js`.
- `twigs/twig_0..7.png` — веточки для входа в приложение (`src/tasbih/twigArt.js`).
- `can.png` — лейка (`src/tasbih/canArt.js`).

Фон экрана тасбиха — сцена `assets/scenes/tasbih-garden-1..3.png` (`src/tasbih/gardenScene.js`).

Спецификация механики и интерфейса: `docs/TASBIH_V2_SPEC.md`.
