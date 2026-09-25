# Сад Тасбиха — зимний набор

## Подключение

Настройки → Оформление → «Сад Тасбиха · Зима». Время суток: автоматически
по локальным часам либо Рассвет / День / Закат / Ночь. Другие темы сохранены.
Расчёты намаза, зикр и сохранённый прогресс не изменены.

## Runtime-файлы

Все новые runtime-файлы находятся в `assets/tasbih/winter/`.

| Файл | Размер | Формат / alpha | Назначение |
| --- | --- | --- | --- |
| winter_morning.jpg | 852×1846 | JPEG / нет | Главный экран, рассвет |
| winter_day.jpg | 852×1846 | JPEG / нет | Главный экран, день |
| winter_evening.jpg | 852×1846 | JPEG / нет | Главный экран, закат |
| winter_night.jpg | 852×1846 | JPEG / нет | Главный экран, ночь |
| garden_winter.jpg | 852×1846 | JPEG / нет | Внутренний сад, свободная площадка под дерево |
| arch_winter.png | 1024×1536 | PNG / да | Отдельная интерактивная арка без дверей и пейзажа в проёме |
| olive_ground.png | 1774×887 | PNG / да | Независимая клумба под корнями |

Олива переиспользует существующие реальные файлы
`assets/tasbih/trees/olive/stage_1.png` … `stage_8.png`:
768×960, RGBA, общий якорь (0.5, 0.9), стадии 0…7. Это существующая
последовательность от ростка до плодоносящей оливы, а не восемь новых генераций.
Отдельную стадию непрорастающего семени и новые виды растений здесь не добавляли.

Полный машинный перечень каждого файла, размеров, alpha и байтов:
`tasbih_garden_assets.json`. Семь новых runtime-файлов занимают 6 170 937 байт.

## Masters и происхождение

`docs/design/tasbih-winter/masters/` содержит семь исходных PNG с теми же
базовыми именами. Они не импортируются приложением. Встроенный imagegen
создал дневной master; утро, вечер и ночь получены редактированием этого
же master, а не независимыми генерациями. Внутренний сад также производный
от него: сохранены горы, озеро и боковые кипарисы, изменена передняя площадка.

Фактическое разрешение пейзажей — 852×1846. Желаемый master 1290×2796
генератор не выдал. Искусственного увеличения не делали; для больших Retina
экранов остаётся задача получить более высокое исходное разрешение.

## Prompt set

Встроенный imagegen, без внешнего API и скачанных изображений.

- **Day / stylized-concept:** premium adult cinematic painterly winter
  Mediterranean Islamic garden, snowy mountains, turquoise still lake,
  side cypresses, warm ivory old stone path, snow, restrained white/pink
  flowers, tiny amber lanterns, quiet upper sky, empty lower-middle arch
  placement, no arch/tree in center, no people/text/UI/watermarks.
- **Morning / lighting-weather:** same master geometry/crop/landmarks;
  only pale-blue, cream and peach dawn lighting, light mist and soft shadows.
- **Evening / lighting-weather:** same master; deep teal/dusty rose sky,
  warm gold horizon/reflections and lit lanterns, no new architecture.
- **Night / lighting-weather:** same master; midnight blue, sparse stars,
  small moon, cold snow/light and amber lanterns, no changed landmarks.
- **Arch / stylized-concept + background-extraction:** isolated Moorish
  ivory stone arch, restrained carving, ivy, white flowers, snow and two
  base lanterns. Actual transparent exterior AND doorway, no doors/scenery.
  Extraction edit requested removal of diffuse haze while retaining geometry.
- **Garden / precise-object-edit:** move into same lakeside garden; empty
  broad stone terrace for separate user tree; no arch or central fixed tree.
- **Ground / stylized-concept:** isolated low oval soil bed, ivory stone rim
  with snow and sparse moss, empty soil center, transparent outside, no tree.

## Слои и анимации

Главный экран: пейзаж → градиент читаемости → отдельная арка → интерфейс.
Арка занимает до 40% ширины телефона. Зимний вариант без створок; используется
существующий camera push и crossfade. В проёме виден настоящий нижний фон.
Сад: пейзаж → существующая световая вуаль по времени суток → клумба → дерево → UI.
Внутренний сад имеет один базовый файл, а не четыре разных пейзажа. Ночная
вуаль меняет тон, но не перерисовывает физически свет/отражения — это ограничение.
Клумба вычисляет положение по contain-холсту дерева, а не по размеру кроны.
Существующие SafeArea и Reduce Motion сохранены.

Фонари и боковые цветы на пейзаже декоративны и не интерактивны. Отдельные
glow/снег/птицы/лепестки не добавлялись: для минимального набора они не нужны.
При дальнейшем развитии их следует рисовать программно либо отдельными малыми
слоями, не добавляя полноэкранные PNG.

## Сезоны и дальнейшая работа

Новый набор охватывает только winter. Spring/summer/autumn не генерировались.
Старые сезонные фоны проекта сохранены. Реестры THEMES/THEME_BACKGROUNDS/
GATE_THEMES допускают добавление следующих наборов без изменения бизнес-логики.

## Проверки и воспроизведение

`scripts/tasbih_assets/package_winter.py <generated_images_directory>` копирует
masters, сохраняет JPEG quality 91 и PNG с исходным alpha без ретуши,
создаёт JSON manifest. Pillow используется только как инструмент подготовки,
новых зависимостей мобильного приложения нет.

`scripts/tasbih_assets/verify_winter.py` проверяет существование/декодирование,
размеры, alpha, прозрачный внутренний прямоугольник арки, одинаковые холсты
оливы и создаёт QA-контактные листы. В проёме допустим только шум alpha ≤1/255;
это не нарисованный фон. Отсутствие текста, UI, шахматного фона и встроенных
ворот проверяется визуально, а не объявляется доказанным пиксельным тестом.

QA-превью: `docs/design/tasbih-winter/qa/`. Они не входят в приложение.
Нативную проверку на физическом iPhone/Android необходимо выполнить отдельно.

### Результаты проверки 25 сентября 2026

- Проверка manifest: 22 файла, прозрачность арки, общие холсты восьми стадий — PASS.
- `node --test tests/core.test.cjs`: 31/31 тест, без ошибок.
- ESLint для `src/tasbih`, `environmentTheme.js`, `AppearanceContext.js`: без ошибок.
- `expo export --platform ios --platform android --output-dir build/verify-winter-final`:
  созданы оба JS/Hermes bundle и runtime-ассеты. Это не нативная сборка IPA/APK.
- `git diff --check`: ошибок пробелов нет.
- Контактные листы арки на двух фонах и восьми стадий оливы просмотрены.
- Запуск интерфейса на устройстве и проверка safe areas пока не выполнены.
