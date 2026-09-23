# Ассеты Tasbih

Все растровые ассеты сгенерированы локально Krea-2 Turbo через ComfyUI в одном стиле (сказочная гуашь)
и собраны скриптами `scripts/tasbih_assets/` (промпты, вырезка фона, нормализация). Пересборка:
`comfy_gen.py` → `build_assets.py trees seeds themes gate`.

- `trees/<порода>/stage_1..8.png` — 768×960, прозрачный фон, общий масштаб, корень в (384, 864).
  Породы: olive, date_palm, pomegranate, fig, sidr.
- `seeds/<порода>.png` — 256×256, иконки зёрен.
- `themes/<тема>/<фаза>.jpg` — 1080×1920, темы garden / oasis / highlands, фазы dawn / day / sunset / night.
  Фазы получены правкой дневного кадра (Krea-2 Edit), поэтому композиция совпадает и смена фаз идёт кроссфейдом.
- `gate/arch|door_left|door_right|glow.png` — 600×720, общий холст. Створки вырезаны по форме проёма арки.
- `atmosphere/` — старые опциональные SVG-слои, не подключены.

Спецификация механики и интерфейса: `docs/TASBIH_V2_SPEC.md`.
