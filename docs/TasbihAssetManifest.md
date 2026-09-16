# Tasbih Asset Manifest

Все координаты anchor нормализованы. Z означает порядок композиции, а не глобальный zIndex интерфейса. Дерево никогда не входит в фоновую картинку. Цвет текста и элементы UI не запечены в изображениях.

## Environment

| Роль | Реализация / путь | Размер | Alpha | Anchor | Scaling | Z |
|---|---|---|---|---|---|---|
| garden_background | assets/tasbih/environment/garden_background.png | 1024×1536 | нет | 0.5, 0.5 | cover + overscan | 0 |
| atmospheric tint | EnvironmentScene.js, View/LinearGradient | viewport | да | центр | stretch | 1 |
| garden_midground | EnvironmentScene.js, SVG ground | viewBox 400×300 | да | низ | stretch, нижние 30% | 2 |
| garden_path | EnvironmentScene.js, SVG Path | viewBox 400×300 | да | 0.5, 1 | в слое ground | 3 |
| garden_foreground | EnvironmentScene.js, SVG края/трава | viewBox 400×300 | да | низ | stretch, нижние 30% | 4 |
| dynamic tree | TreeView.js | viewBox 240×280 | да | 0.5, 0.9 | contain | 5 |

Midground/path/foreground созданы программно: дополнительных PNG не требуют. Их отдельные SVG-исходники сохранены рядом с background: `garden_midground.svg`, `garden_path.svg`, `garden_foreground.svg`. Растровые замены рекомендованы 1200×1600 с прозрачным фоном и теми же относительными горизонтами. Параллакс: дальний слой 5pt, средний 10pt, передний 17pt; камера соответственно 7%, 20%, 34% увеличения.

## Gates

Файлы в `assets/tasbih/gate/`. Runtime SVG-строки: `src/tasbih/gateVectors.js`; тест проверяет совпадение.

| Роль | Canvas SVG (PNG replacement) | Alpha | Anchor | Scaling | Z |
|---|---|---|---|---|---|
| gate_arch | 200×240 (800×960) | да | центр | contain | 6 |
| gate_left_door | 100×200 (400×800) | да | left center | contain | 7 |
| gate_right_door | 100×200 (400×800) | да | right center | contain | 7 |
| gate_plants | 200×240 (800×960) | да | центр | contain | 8 |
| gate_light | 200×240 (800×960) | да | центр | contain | 9 |

GateForeground сейчас объединён с отдельным передним планом EnvironmentScene. Двери открываются независимо вокруг наружных петель. Регистрация замены: `GATE_ASSETS.gate_arch = require('../../assets/tasbih/gate/gate_arch.png')` и аналогично для каждого слоя. Не заменять всё одним закрытым screenshot: это сломает створки и динамическое дерево.

## Tree

Все пять SVG находятся в `assets/garden/plants/olive/`, имеют прозрачный фон, viewBox 240×280, корень (0.5, 0.9), contain. Нормализованный canvas один для Home, перехода и Tasbih.

| Stage id | Registry assetName | Файл |
|---|---|---|
| olive_stage_01 | seed | olive_seed.svg |
| olive_stage_02 | sprout | olive_sprout.svg |
| olive_stage_03 | young | olive_young.svg |
| olive_stage_04 | tree_young | olive_tree_young.svg |
| olive_stage_05 | tree_mature | olive_tree_mature.svg |

Будущие `olive_stage_06…N`: `assets/tasbih/tree/`, PNG 1200×1400, alpha, корень (600,1260), одинаковый масштаб камеры и padding. Нельзя плотно обрезать каждое дерево отдельно.

1. Добавить реальный файл и запись в TREE_ASSETS: `{ source: require('../../assets/tasbih/tree/olive_stage_06.png') }`.
2. Добавить в STAGES `{ id: 'olive_stage_06', assetName: 'olive_stage_06', requiredProgress: ..., minimumDays: ... }`.
3. Не переименовывать существующие сохранённые id. Подобрать монотонные пороги по размеру рисунка. Проверить рост и crossfade.
4. Отсутствующая запись ассета откатывает только изображение к предыдущему доступному, не прогресс. Не писать require на несуществующий файл.

Сейчас не существует 30 готовых рисунков: промежуточные стадии ещё предстоит создать. Код не ограничивает число стадий. Загружается текущий/предыдущий на время crossfade и предварительно следующий PNG; все стадии одновременно не монтируются. Профилирование реальной GPU-памяти требует устройства.

## Atmosphere slots

| Роль | Текущий статус | Expected size | Alpha | Anchor / Scaling | Z |
|---|---|---|---|---|---|
| mist | атмосферный veil/gradient, отдельный рисунок не нужен | viewport / 1200×1600 | да | center/stretch | 1 |
| light_rays | не включены; опциональный будущий слой | 1200×1600 | да | top/cover | 2 |
| stars | не включены, сознательно без sparkle | 1200×1600 | да | top/cover | 1 |
| clouds | дальняя дымка в background; независимый слой опционален | 1200×800 | да | top/contain | 1 |

Для всех четырёх опциональных слоёв созданы прозрачные SVG 400×600 в `assets/tasbih/atmosphere/`; они не подключены автоматически, чтобы не перегрузить интерфейс. Это не пропущенные обязательные require. Декоративные части всегда pointerEvents="none" и скрыты от VoiceOver.

## Кандидаты генерации, 16 сентября 2026

Пять PNG стадий дерева сохранены отдельно в `docs/design/tasbih-candidates/`. Не подключены: генератор сохранил цветные ореолы и нарушил масштаб ранних стадий. В этой папке есть QA-заметки и промпты; это не готовые production-cutouts. Рабочие SVG не заменены. Набор из 20–30 согласованных новых стадий по-прежнему не готов.

## Generation record

Background создан встроенным image generation tool, не скачан из библиотеки. Итог выбран и проверен визуально: пустая центральная поляна, нет взрослого дерева, текста и интерфейса. Prompt:

> Use case: stylized-concept. Asset type: final composable distant background for a premium Islamic prayer and contemplation mobile app, portrait 1024x1536. Create a calm elegant landscape plate: distant soft stone mountains and low muted olive hills confined to the bottom 35 percent, very spacious dark teal / deep forest green hazy sky in upper 65 percent. Gentle dawn-neutral diffuse illumination, subtle sage atmospheric perspective, fine restrained matte painterly natural texture. Foreground center must be an EMPTY quiet clearing with no object, for a separately rendered dynamically growing olive tree. Eye-level camera, centered perspective, gentle organic curves, low contrast so cream UI text can overlay upper half. No tree anywhere in the center, no large trees anywhere, no gates, doors, architecture, sun disc, moon, people, text, interface, frame, logos or watermark. No neon, fantasy, glitter, gold glow or cartoon. This is just one BACKGROUND layer, not a screenshot or finished UI. Other path, foreground, gates and tree will be composited by code.
