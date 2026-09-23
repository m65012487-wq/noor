# Тасбих v3 — спецификация

Дополняет `docs/TASBIH_V2_SPEC.md` (всё оттуда остаётся в силе, если не сказано иное).
Проект: `E:\dev\noor` (Expo SDK 54, RN 0.81, JS). Правила — `CLAUDE.md`, дизайн-система — `src/constants/theme.js`.
Проверки: `node --test tests/core.test.cjs` (npm test в Git Bash не раскрывает glob), `npx eslint src/ App.js`,
`npx expo export --platform ios --output-dir build/export-check` (потом удалить папку). Не коммитить.

**Важно про iOS.** Web прощает то, на чём iOS падает красным экраном. Обязательно:
- `Image` с `require(...)` всегда с явными `width`/`height` (или `'100%'`) — иначе берётся размер файла;
- никакого текста/чисел вне `<Text>` (`{count && <X/>}` при count=0 рендерит «0» → падение), только `!!x &&` или тернарник;
- одно `Animated.Value` не водить и нативным, и JS-драйвером; нативным драйвером — только opacity/transform.

## A. Режимы тасбиха (src/tasbih/model.js, useTasbih.js, TasbihScreen.js)

Режимы (`state.selectedDhikr`):
- `sequence` — 33×3, как сейчас (всегда кругами по 33, переключатель на него не влияет);
- `subhanallah` / `alhamdulillah` / `allahuakbar` — как сейчас;
- `free` — **свободный зикр**: без текста конкретного поминания, человек говорит любые. На экране вместо арабского —
  заголовок «Свободный зикр» и подпись «Любые поминания — просто считайте»;
- `custom:<id>` — **свои поминания** пользователя.

Новые поля состояния (версия остаётся 2, restoreState добавляет дефолты и валидирует):
```js
circleLimit: true,        // «Круг по 33»: вкл — счёт сбрасывается после 33; выкл — растёт без предела
customDhikr: [],          // [{ id: 'c1695…', text: 'Астагфируллах', arabic: '' , translation: '' }]
```
- `circleLimit` действует на одиночные, свободный и свои режимы. Выключен — `target = null`, `advance` не сбрасывает, полоса
  прогресса скрыта, показывается только число.
- `addCustomDhikr(state, { text, arabic, translation })` — text обязателен (trim, до 80 символов), arabic/translation
  необязательны (до 120). `removeCustomDhikr(state, id)` — если был выбран — переключить на `free`.
  Счёт свои/свободного копится в `perDhikrCounts[id]` (`free`, `custom:<id>`).
- Рост дерева и выпадение зёрен работают во всех режимах одинаково (правило «полный круг 99» — по дневному счёту, как было).
- `useTasbih` отдаёт `addCustom`, `removeCustom`, `setCircleLimit(bool)`.

**Лист выбора режима** (новый `src/tasbih/DhikrSheet.js`, открывается пилюлей): радио-список режимов
(Последовательность, три зикра, Свободный зикр, свои поминания с кнопкой удаления 44pt), переключатель (`Switch`)
«Считать кругами по 33», кнопка «+ Своё поминание» → форма в том же листе: TextInput «Текст поминания» (обязательно),
«Арабский (необязательно)», «Перевод (необязательно)», кнопки «Сохранить» / «Отмена». Клавиатура не должна закрывать поля
(KeyboardAvoidingView). Всё на ru/en.

## B. Тактильная отдача (src/utils/haptics.js + TasbihScreen)

- Каждое касание — лёгкий удар (`hapticLight`, как сейчас).
- Каждые 33 (конец круга: в режиме с пределом — когда счёт стал 33; без предела — когда счёт кратен 33) — **сильный**
  удар `Haptics.impactAsync(Heavy)`; добавить `hapticHeavy()` в utils/haptics.js.
- Конец полной последовательности (третий круг 33 в режиме `sequence`) и каждые 99 без предела — `hapticSuccess`
  (notification Success), это «ещё сильнее».
- Визуально: при конце круга полоса/число коротко вспыхивают акцентом (scale 1→1.08→1, 250 мс, без reduceMotion — только цвет).
Логику «что за событие» вынести в чистую функцию модели `tapEvent(prev, next)` → `'tap' | 'circle' | 'complete'` и покрыть тестом.

## C. Фон сада тасбиха — времена года (новый src/tasbih/GardenBackground.js)

Фон экрана тасбиха больше НЕ берётся из темы обоев. Это свой сад: `assets/tasbih/garden/{spring,summer,autumn,winter}.jpg`
(1080×1920, поляна для дерева внизу по центру). Сезон по месяцу телефона: 3–5 весна, 6–8 лето, 9–11 осень, 12–2 зима
(`seasonAt(date)` в model.js или отдельный util, с тестом).
`GardenBackground({ children, camera })`: картинка cover (обёртка с запасом по краям + Image 100%, как в EnvironmentScene),
поверх — градиент читаемости (сверху тёмный ~0.7 → прозрачно к 45%, снизу ~0.55), и лёгкая вуаль по фазе суток из
`useAppearance().phase`: night 0.45 тёмно-синего, dawn/sunset 0.12 тёплого, day 0. `camera` (Animated 0..1) — лёгкий
zoom 1.12→1 при входе из ворот. TasbihScreen использует GardenBackground вместо ThemedBackground.

## D. Ворота — у каждой темы свои (src/tasbih/assets.js, GateAssembly.js, GateEntry.js)

Ассеты: `assets/tasbih/gates/<theme>/{arch,door_left,door_right,glow}.png` (theme ∈ garden, oasis, highlands; сейчас заглушки,
позже будут настоящие с тем же холстом 600×720). Реестр:
```js
export const GATE_THEMES = { garden: { assets: {arch, doorLeft, doorRight, glow}, geometry: { aspect, hingeLeft, hingeRight, opening } }, oasis: …, highlands: … };
export function gateFor(theme) { return GATE_THEMES[theme] || GATE_THEMES.garden; }
```
(геометрию пока скопировать из текущей GATE_GEOMETRY во все три — потом подставлю реальные числа). Тема берётся из
`useAppearance().schemeColors.theme` (для не-environment схем — garden). Старые `assets/tasbih/gate/*` и GATE_ASSETS/GATE_GEOMETRY
удалить после перехода.

Ворота — часть пейзажа:
- крупнее: ширина `min(230, width * 0.52)`, стоят на земле у нижнего края области над таб-баром;
- **в покое створки приоткрыты** (~28°), в проёме видно тёплый свет и дерево пользователя (как сейчас в окне), свет «дышит»;
- под воротами — стеклянная карточка-кнопка (GlassView, RADIUS.pill): иконка ростка, «Тасбих» / «Войдите в сад зикра»
  (ru/en), шеврон справа. Нажатие на ворота или на карточку — вход. Прежнюю подпись «Коснитесь ворот» убрать.
- вход (1800 мс, Easing.inOut(cubic)): створки раскрываются до ~105°, свет → 1, камера наезжает в центр проёма
  (scale ~6), на 0.7–1 проявляется GardenBackground (не ThemedBackground!) и дерево на месте, где оно стоит на экране тасбиха;
  reduceMotion — кроссфейд 300 мс.
- Проверить вручную путь «вход → выход → снова вход» (busy/frame сбрасываются, анимации останавливаются при размонтировании).

## E. Темы на других экранах

- `src/screens/QiblaScreen.js` и `src/screens/ReadingScreen.js` — убрать `plain`: показывают пейзаж темы, как главный экран.
  Проверить читаемость (карточки на стекле, текст с лёгкой тенью при необходимости).
- `src/screens/SurahReaderScreen.js` (чтение Корана) остаётся на спокойном градиенте (`plain`), но **палитра — из темы**:
  вместо COLORS.accent / accentSoft / surfaceActive / glassBorderSoft / hairline брать `useAppearance()`:
  `accent` для номеров аятов, активного аята, кнопок; `rgba(tint, …)` для подложек, рамок и разделителей; перевод и
  подписи — `rgba(tint, 0.85)`. Так же пройтись по `QuranScreen.js` (список сур), если там жёсткие цвета.
  Градиент `plain` берётся из `schemeColors.bg` — уже тематический.
