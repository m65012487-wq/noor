# Тасбих v2 — спецификация (сад, зёрна, темы, ворота)

Проект: `E:\dev\noor` (Expo SDK 54, RN 0.81, чистый JS). Правила проекта — `CLAUDE.md`, дизайн-система — `src/constants/theme.js`
(экраны не изобретают кегли/отступы/цвета). Интерфейс двуязычный: `const { lang } = useLang(); const ru = lang === 'ru'`.
Не коммитить. Проверки: `npm test`, `npx eslint src/ App.js`, `npx expo export --platform ios` (бандл должен собираться).

## 1. Контракт ассетов (файлы уже лежат как заглушки, позже заменяются настоящими с теми же путями и размерами)

| Путь | Формат | Смысл |
|---|---|---|
| `assets/tasbih/trees/<species>/stage_<1..8>.png` | 768×960 RGBA | Стадии дерева. Все стадии всех пород в ОДНОМ масштабе камеры, корень ствола всегда в точке (384, 864) = (0.5, 0.9). Отображать `contain` без поправочных коэффициентов масштаба. |
| `assets/tasbih/seeds/<species>.png` | 256×256 RGBA | Иконка зерна породы. |
| `assets/tasbih/themes/<theme>/<phase>.jpg` | 1080×1920 | Фон темы для фазы суток. theme ∈ garden, oasis, highlands; phase ∈ dawn, day, sunset, night. Нижняя центральная часть — пустая поляна, где стоит дерево. |
| `assets/tasbih/gate/{arch,door_left,door_right,glow}.png` | 600×720 RGBA, общий холст | Слои ворот, накладываются друг на друга `absoluteFill`. Створки нарисованы на своих местах внутри холста. Петли: левая створка вращается вокруг x = `GATE_GEOMETRY.hingeLeft` (доля ширины), правая — вокруг `hingeRight`. `glow` — тёплый свет в проёме. |

Породы (species id → ru / en):
- `olive` — Олива / Olive (стартовая, есть у всех)
- `date_palm` — Финиковая пальма / Date palm
- `pomegranate` — Гранат / Pomegranate
- `fig` — Инжир / Fig
- `sidr` — Сидр / Lote tree (редкая)

Стадии (index 0..7 → файл stage_1..8), ru / en:
Зерно/Seed, Росток/Sprout, Побег/Shoot, Саженец/Sapling, Молодое дерево/Young tree, Крепкое дерево/Growing tree, Взрослое дерево/Mature tree, Плодоносящее/Fruiting.

## 2. Модель (src/tasbih/model.js) — состояние v2

```js
{
  version: 2,
  selectedDhikr, currentDhikrIndex, currentDhikrCount, totalDhikrCount, perDhikrCounts, dailyDhikrCounts,
  lastActiveDate, activeDays,                       // глобальные, как в v1
  hasSeenTasbihHint, hasSeenGateHint,
  trees: [{ id: 't1', species: 'olive', progress: 0, activeDays: 0, stage: 0, lastGrowDate: null, plantedOn: null, harvested: false }],
  activeTreeId: 't1',
  seeds: { fig: 1 },                                // инвентарь, только положительные целые
  lastCircleDropDate: null,                         // не больше одного «случайного» зерна в день
  pendingDrops: [],                                 // [{ species, reason }] — UI показывает анимацию и вызывает ackDrop()
}
```

Рост: тот же расчёт `growthForCount` по дневному счёту + `activeDayContribution`, но прогресс и activeDays копятся у АКТИВНОГО
дерева (первое касание дня для этого дерева — `tree.lastGrowDate !== dateKey` — даёт activeDayContribution и tree.activeDays+1).
Вклад по дневному счёту считать по общему dailyDhikrCounts (как сейчас). Стадия не откатывается назад.

`STAGES` — 8 записей { requiredProgress, minimumDays }:
0/0, 72/1, 300/3, 700/7, 1500/15, 2800/30, 5200/50, 8500/75.

Правила выпадения зерна (всё внутри `registerDhikr(prev, dateKey, { rng = Math.random } = {})`, rng — инъекция для тестов):
1. **Неделя**: когда глобальный activeDays увеличился и стал кратен 7 → зерно, reason `'week'`.
2. **Урожай**: активное дерево впервые дошло до последней стадии (index 7) → зерно, reason `'harvest'`, `tree.harvested = true`.
3. **Полный круг**: дневной счёт стал кратен 99 (99, 198, …), и `lastCircleDropDate !== dateKey` → с вероятностью 0.12 (rng() < 0.12)
   зерно, reason `'circle'`, `lastCircleDropDate = dateKey` (ставить только при выпадении).
Выбор породы: веса `{ olive: 30, fig: 25, pomegranate: 25, date_palm: 20, sidr: 6 }`, sidr доступен только если у пользователя
уже есть ≥3 разных породы (среди trees и seeds); вес ×2 для породы, которой ещё нет ни в trees, ни в seeds. Выбор через тот же rng.
Выпавшее зерно: `seeds[species] += 1` и push в `pendingDrops`.

Новые чистые функции: `plantSeed(state, species, dateKey)` (списывает зерно, создаёт дерево stage 0 с новым id, делает его активным;
без зерна — вернуть state без изменений), `setActiveTree(state, id)`, `ackDrop(state)` (снимает первый элемент pendingDrops),
`activeTree(state)`, `SPECIES` (массив { id, ru, en, rarity: 'common'|'rare' }), `STAGE_NAMES`.

Миграция `restoreState`: v1 → v2. Дерево олива из v1 получает progress = treeGrowthProgress, activeDays = activeDays, stage вычисляется
`chooseStage` по новым STAGES. Всё прочее — валидация как сейчас (неотрицательные числа, неизвестные породы/деревья отбрасываются,
activeTreeId указывает на существующее дерево, при пустом trees — стартовая олива). Ключ хранения `tasbih:v1` оставить (версия внутри).

`useTasbih` отдаёт дополнительно: `plant(species)`, `setActive(id)`, `ackDrop()`.
Тесты в `tests/core.test.cjs` обновить под v2 и добавить: миграция v1, каждое из трёх правил выпадения (детерминированный rng),
не больше одного circle-зерна в день, sidr недоступен до 3 пород, plantSeed списывает зерно, стадия не откатывается.

## 3. Темы (время суток)

`src/constants/environmentTheme.js`: `THEMES = { garden, oasis, highlands }`, у каждой `{ label_ru, label_en, phases: { dawn, day, sunset, night } }`,
фаза = `{ bg: [top, bottom], tint, accent, atmosphere }` (формат как у текущих LIGHT_STATES). `LIGHT_STATES` оставить как алиас на garden.
Фоны — `THEME_BACKGROUNDS[theme][phase] = require(...)`.
В `AppearanceContext` схемы с `environment: true`: `sanctuary` (Тихий сад → garden), `oasis` (Оазис / Oasis), `highlands` (Горный сад / Highlands).
`sc` для них = `{ ...scheme, ...THEMES[scheme.theme].phases[phase], phase, theme }`.
`EnvironmentScene`: фон = картинка фазы на полную непрозрачность (cover, тот же overscan + параллакс + camera), при смене фазы — плавный
crossfade 1.2 с. Поверх — вертикальный градиент для читаемости (сверху bg[0] ~0.55 → прозрачно к 35% → прозрачно до 70% → bg[1] ~0.6 внизу).
Старые SVG-планы земли и `garden_background.png` убрать из сцены. Настройки (SettingsModal) — новые темы должны появиться в выборе схем,
выбор света (auto/dawn/day/sunset/night) должен работать для всех environment-тем.

## 4. Ворота

`GateAssembly` рисует растровые слои из `assets/tasbih/gate/*.png` (новый реестр `GATE_ASSETS` в `src/tasbih/assets.js` +
`GATE_GEOMETRY = { aspect: 1.2, hingeLeft: 0.25, hingeRight: 0.75, opening: { left: 0.25, right: 0.75, top: 0.22, bottom: 0.97 } }`).
Порядок: окно с деревом (обрезано по проёму) → glow → створки → arch. SVG-векторы ворот (`gateVectors.js`, svg-файлы) больше не используются —
удалить вместе с их тестом.
Анимация входа (`GateEntry`), 1800 мс, Easing.inOut(Easing.cubic):
- 0–0.45: створки распахиваются (rotateY до ∓105°, perspective ≈ width*4), glow 0.25→1;
- 0.35–1: камера наезжает на центр проёма (scale до ~7, центр проёма → центр экрана), ворота гаснут на 0.8–1, дерево и фон тасбиха проявляются;
- reduceMotion: короткий кроссфейд 300 мс без наезда.
На главном экране: ворота крупнее (ширина `min(112, max(64, width*0.24))`), glow медленно «дышит» (0.55↔0.85, цикл 3.2 с, выключено при reduceMotion).

## 5. Экран тасбиха (src/tasbih/TasbihScreen.js) — без ScrollView, фиксированная сетка

Сверху вниз, выравнивание по центральной оси, горизонтальные поля SPACING.lg:
1. **Шапка** (высота 48): слева круглая кнопка закрытия 44×44 (иконка `Ionicons close`), по центру заголовок «Тасбих» (TYPE.subhead),
   справа кнопка «Сад» 44×44 (иконка `leaf-outline`) с бейджем количества зёрен, если > 0. Свайп вниз по шапке и свайп вправо — как сейчас.
2. **Выбор зикра**: одна «пилюля» по центру (GlassView, RADIUS.pill, высота 36): текущий режим + chevron-down. Открывает нижний лист (Modal
   transparent, slide), а не раскрывает меню в потоке. В листе — радио-список режимов.
3. **Текст** — блок фиксированной высоты: арабский (ARABIC.lg), транскрипция (TYPE.subhead), перевод (TYPE.callout, textMuted).
4. **Счётчик**: крупное число (TYPE.display, tabular) «12» и «/ 33» мельче рядом; под ним тонкая полоса прогресса 33 (ширина 160, высота 3, RADIUS.pill);
   в режиме «последовательность» — три точки этапов под полосой.
5. **Дерево** — `flex: 1`, вся область — зона касания. Дерево через `TreeView` (contain, якорь 0.5/0.9). Под корнем мягкая эллиптическая тень.
6. **Низ**: строка «Олива · Саженец» (TYPE.callout) и тонкая полоса роста до следующей стадии; одноразовая подсказка «Нажимайте на дерево…»
   показывается вместо этой строки, пока `!hasSeenTasbihHint`. Нижних кнопок «Вернуться к намазам» и подсказки про свайп больше нет.

**Выпадение зерна**: когда `state.pendingDrops.length > 0` — анимация: иконка зерна (seeds/<species>.png, 40×40) появляется в кроне
(~35% высоты области дерева), падает к корню с лёгким отскоком (~900 мс), затем «пилюля»-тост сверху области дерева
«Выпало зерно · Гранат» + подпись причины (неделя: «7 дней зикра», урожай: «Дерево дало плод», круг: «Полный круг 99») на 2.6 с,
затем `ackDrop()`. reduceMotion — только тост. Хаптик `hapticSuccess` если есть в utils/haptics, иначе hapticLight.

**Лист «Сад»** (Modal, нижний лист, GlassView): раздел «Мои деревья» — горизонтальный ряд карточек (превью последней стадии дерева
через Image contain 72×90, название породы, стадия), тап делает дерево активным, активное подсвечено accent-рамкой; раздел «Зёрна» — карточки
с иконкой зерна, породой, количеством и кнопкой «Посадить»; внизу короткое пояснение, как выпадают зёрна (три правила, по-человечески).
Если зёрен нет — «Зёрен пока нет» + пояснение.

`TreeView` получает `species` и `stage` (index) вместо stageId; реестр `TREE_ASSETS[species][stage]`. Предзагрузка следующей стадии сохраняется.
Кроссфейд смены стадии и покачивание при касании — как сейчас. `GateEntry`/`GateAssembly` показывают активное дерево.
