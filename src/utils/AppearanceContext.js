import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './helpers';
import { publishTheme } from './widgetBridge';
import { useLang } from '../i18n/LanguageContext';

const AppearanceContext = createContext(null);

// Оформление держится на осях: тема (сцена или живой фон), цветовая схема и шрифт.
// Фотообои («Лазурь», «Рассвет», «Космос» и прочие) убраны: они тянули
// за собой одиннадцать полноэкранных картинок, конкурировали с текстом
// и всё равно уступали узорам по читаемости.

// Плитка одна на все схемы: она белая на прозрачном фоне и красится через
// tintColor, поэтому «узор × цвет» не размножается файлами.
export const PATTERNS = [
  // Однотонный градиент схемы — для тех, кому рисунок под текстом мешает.
  { id: 'none',     label_en: 'Plain',    label_ru: 'Без рисунка', kind: 'none' },

  // Сцены — растягиваются на весь экран и разложены на три плана, которые
  // сдвигаются при наклоне телефона; цвет задаёт схема. Убраны по просьбе:
  // «Город», «Горы», «Оазис», «Сад», «Мечеть у воды», узоры «Купола», «Фонари»,
  // «Цветок», «Гирих», сцены «Полумесяц», «Скакуны», «Скалы», «Оливы»,
  // «Миндаль», «Тюльпаны», «Розы», «Кувшинки», «Сабля», «Знамя», «Кедры»,
  // «Всадник», «Табун», «Клинки».
  { id: 'desert',   label_en: 'Desert',   label_ru: 'Пустыня',  kind: 'scene' },
  // Сцены Krea-2 (scripts/tasbih_assets/build_scenes_v5.py).
  { id: 'caravan',  label_en: 'Caravan',  label_ru: 'Караван',  kind: 'scene' },
  { id: 'blossom',  label_en: 'Blossom',  label_ru: 'Цветение', kind: 'scene' },
  { id: 'gallop',   label_en: 'Gallop',   label_ru: 'Скачка',   kind: 'scene' },
  { id: 'rest',     label_en: 'Rest',     label_ru: 'Привал',   kind: 'scene' },

  // Живые абстрактные темы (src/components/LiveBackground.js): рисуются кодом
  // в цветах схемы и медленно движутся.
  { id: 'waves',    label_en: 'Waves',    label_ru: 'Волны',    kind: 'live' },
  { id: 'orbits',   label_en: 'Orbits',   label_ru: 'Орбиты',   kind: 'live' },
  { id: 'ripples',  label_en: 'Ripples',  label_ru: 'Рябь',     kind: 'live' },
];

// Убранные живые темы переходят на ближайшие по духу, а не на тему по умолчанию.
const RETIRED_PATTERNS = { dust: 'orbits', glow: 'ripples' };

// Узор по умолчанию и замена убранных узоров и сцен: сохранённый выбор, которого
// больше нет в PATTERNS, откатывается сюда.
export const DEFAULT_PATTERN = 'desert';


// Сцена — не один файл, а три плана от дальнего к ближнему. Разложены они
// ради параллакса: при наклоне телефона ближний план уезжает заметно
// сильнее дальнего, и плоская картинка получает глубину.
export const SCENE_LAYERS = {
  desert: [
    require('../../assets/scenes/desert-1.png'),
    require('../../assets/scenes/desert-2.png'),
    require('../../assets/scenes/desert-3.png'),
  ],
  caravan: [
    require('../../assets/scenes/caravan-1.png'),
    require('../../assets/scenes/caravan-2.png'),
    require('../../assets/scenes/caravan-3.png'),
  ],
  blossom: [
    require('../../assets/scenes/blossom-1.png'),
    require('../../assets/scenes/blossom-2.png'),
    require('../../assets/scenes/blossom-3.png'),
  ],
  gallop: [
    require('../../assets/scenes/gallop-1.png'),
    require('../../assets/scenes/gallop-2.png'),
    require('../../assets/scenes/gallop-3.png'),
  ],
  rest: [
    require('../../assets/scenes/rest-1.png'),
    require('../../assets/scenes/rest-2.png'),
    require('../../assets/scenes/rest-3.png'),
  ],
};

export function patternKind(id) {
  return PATTERNS.find((p) => p.id === id)?.kind || 'none';
}

// Цветовые схемы: шесть глубоких и две светлые (из прежних двадцати оставлены
// по просьбе), плюс «Свой цвет» — схема, собранная из цвета палитры.
//
// Потолок светлоты выбран не на глаз: у верхнего цвета градиента яркость
// держится ниже 0.11, иначе приглушённый текст (`textMuted`) перестаёт
// набирать три к одному по контрасту, а он несёт подписи и время.
// Пейзажные темы с фотографией и фазами дня убраны: каждая приносила свой
// стиль, свою графику ворот и сада и спорила с узорами. Остались плоские
// схемы — цвет из них задаёт и фон, и узор, и дерево тасбиха.
export const SCHEMES = [
  { id: 'ink',   label_en: 'Ink',    label_ru: 'Тушь',
    bg: ['#1b2430', '#0d131b'], tint: '190,205,220', accent: '#c8d6e2' },
  { id: 'night', label_en: 'Night',  label_ru: 'Ночь',
    bg: ['#1a1d33', '#0c0d19'], tint: '180,190,235', accent: '#b6c0ec' },
  { id: 'sea',   label_en: 'Sea',    label_ru: 'Море',
    bg: ['#162a2e', '#0a1517'], tint: '160,210,210', accent: '#a3d4d2' },
  { id: 'moss',  label_en: 'Moss',   label_ru: 'Мох',
    bg: ['#1a2620', '#0c130f'], tint: '165,205,180', accent: '#a6cfb6' },
  { id: 'sand',  label_en: 'Sand',   label_ru: 'Песок',
    bg: ['#2a241c', '#15110c'], tint: '215,195,160', accent: '#d8c49c' },
  { id: 'plum',  label_en: 'Plum',   label_ru: 'Слива',
    bg: ['#241c2b', '#110d15'], tint: '200,180,215', accent: '#c4aed6' },
  { id: 'blush', label_en: 'Blush',  label_ru: 'Румянец',
    bg: ['#664a55', '#2f2228'], tint: '248,222,232', accent: '#f6dbe6' },
  { id: 'lavender', label_en: 'Lavender', label_ru: 'Лаванда',
    bg: ['#4e4d6c', '#25243a'], tint: '228,226,248', accent: '#e2e0f8' },
];

// Шрифты. Обязательное условие — кириллица: интерфейс русский, и семейство
// без русских букв не ломает приложение, а тихо подменяется системным
// посимвольно. Проверено по таблице cmap каждого файла, а не по памяти.
//
// Интерфейс и чтение настраиваются отдельно. Интерфейс по умолчанию —
// пиксельный Departure Mono (Helena Zhang, OFL): подписи, цифры и кнопки.
// Для чтения перевода — только удобные для долгого чтения начертания; их
// выбор живёт в настройках чтения. PT Sans и PT Serif рисовала ParaType под
// кириллицу; Georgia встроена в iOS. Файлы подключает плагин expo-font.
export const UI_FONTS = [
  { id: 'pixel',   label_en: 'Pixel',   label_ru: 'Пиксельный', family: 'Departure Mono' },
  { id: 'system',  label_en: 'System',  label_ru: 'Системный',  family: undefined },
];

export const READING_FONTS = [
  { id: 'system',  label_en: 'System',  label_ru: 'Системный',   family: undefined },
  { id: 'ptsans',  label_en: 'Grotesk', label_ru: 'Гротеск',     family: 'PT Sans' },
  { id: 'ptserif', label_en: 'Book',    label_ru: 'Книжный',     family: 'PT Serif' },
  { id: 'georgia', label_en: 'Serif',   label_ru: 'С засечками', family: 'Georgia' },
];

// Арабские начертания. Все встроены в iOS, поэтому ничего не скачивается.
// Насх — привычная форма для мусхафа, куфи — угловатая, для заголовков.
export const ARABIC_FONTS = [
  { id: 'system',  label_en: 'System',    label_ru: 'Системный',  family: 'System' },
  { id: 'geeza',   label_en: 'Geeza Pro', label_ru: 'Гиза',       family: 'Geeza Pro' },
  { id: 'nile',    label_en: 'Al Nile',   label_ru: 'Ан-Ниль',    family: 'Al Nile' },
  { id: 'damascus',label_en: 'Damascus',  label_ru: 'Дамаск',     family: 'Damascus' },
  { id: 'mishafi', label_en: 'Mishafi',   label_ru: 'Мусхаф',     family: 'Mishafi' },
  { id: 'baghdad', label_en: 'Baghdad',   label_ru: 'Багдад',     family: 'Baghdad' },
];

export function arabicFontFor(id) {
  return ARABIC_FONTS.find((f) => f.id === id) || ARABIC_FONTS[0];
}

// ---- Свой цвет ----
// Из одного выбранного цвета собирается вся схема: фон — тот же тон, глубоко
// затемнённый (верх градиента держится ниже порога яркости, см. выше), узор и
// подписи — светлый вариант тона. Насыщенность фона приглушена: яркий фон
// под текстом утомляет, а цвет и так узнаётся по узору и акценту.
export const DEFAULT_CUSTOM = '#5b8fd6';

function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
}

const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
const clamp01 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function makeScheme(hex) {
  const [h, s] = hexToHsl(hex || DEFAULT_CUSTOM);
  const grey = s < 0.08;
  const bgS = grey ? s : clamp01(s * 0.55, 0.12, 0.4);
  const lightS = grey ? s : clamp01(s, 0.3, 0.6);
  return {
    id: 'custom', label_en: 'Custom', label_ru: 'Свой цвет',
    bg: [toHex(hslToRgb(h, bgS, 0.135)), toHex(hslToRgb(h, bgS, 0.065))],
    tint: hslToRgb(h, lightS, 0.8).join(','),
    // У серого акцент тоже серый: иначе нулевой тон дал бы розоватый оттенок.
    accent: toHex(hslToRgb(h, grey ? s : clamp01(lightS + 0.1, 0.3, 0.7), 0.8)),
  };
}

export function schemeFor(id, custom) {
  if (id === 'custom') return makeScheme(custom);
  return SCHEMES.find((s) => s.id === id) || SCHEMES[0];
}

const uiFontFor = (id) => UI_FONTS.find((f) => f.id === id) || UI_FONTS[0];
const readingFontFor = (id) => READING_FONTS.find((f) => f.id === id) || READING_FONTS[0];

export function AppearanceProvider({ children }) {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [scheme, setScheme] = useState(SCHEMES[0].id);
  const [customColor, setCustomColor] = useState(DEFAULT_CUSTOM);
  const [uiFont, setUiFont] = useState(UI_FONTS[0].id);
  const [readingFont, setReadingFont] = useState('system');
  const [arabicFont, setArabicFont] = useState('system');
  const [parallax, setParallax] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Значения из удалённых наборов откатываются на первое: сохранённый
      // идентификатор старой темы иначе молча тянул бы дефолты.
      const rawPattern = await loadJSON('pattern', DEFAULT_PATTERN);
      const savedPattern = RETIRED_PATTERNS[rawPattern] || rawPattern;
      const knownPattern = PATTERNS.some((p) => p.id === savedPattern);
      // Убранная сцена откатывается и записывается сразу: иначе откат
      // повторялся бы на каждом запуске.
      if (!knownPattern || savedPattern !== rawPattern) await saveJSON('pattern', knownPattern ? savedPattern : DEFAULT_PATTERN);
      setPattern(knownPattern ? savedPattern : DEFAULT_PATTERN);

      // Сохранённый выбор убранной темы сводится к первой схеме, иначе
      // после обновления человек остался бы с фоном, которого больше нет.
      const savedScheme = await loadJSON('scheme', SCHEMES[0].id);
      const knownScheme = savedScheme === 'custom' || SCHEMES.some(s => s.id === savedScheme);
      if (!knownScheme) await saveJSON('scheme', SCHEMES[0].id);
      setScheme(knownScheme ? savedScheme : SCHEMES[0].id);
      const savedCustom = await loadJSON('customColor', DEFAULT_CUSTOM);
      setCustomColor(/^#[0-9a-f]{6}$/i.test(savedCustom) ? savedCustom : DEFAULT_CUSTOM);

      // Раньше шрифт был один на всё (fontSet): его чтение переезжает в
      // шрифт для чтения, а интерфейс получает новый пиксельный по умолчанию.
      const legacy = await loadJSON('fontSet', null);
      const savedUi = await loadJSON('uiFont', UI_FONTS[0].id);
      setUiFont(UI_FONTS.some((f) => f.id === savedUi) ? savedUi : UI_FONTS[0].id);
      const savedReading = await loadJSON('readingFont', legacy || 'system');
      setReadingFont(READING_FONTS.some((f) => f.id === savedReading) ? savedReading : 'system');

      const savedArabic = await loadJSON('arabicFont', 'system');
      setArabicFont(ARABIC_FONTS.some((f) => f.id === savedArabic) ? savedArabic : 'system');

      setParallax(await loadJSON('parallax', true) !== false);

      setReady(true);
    })();
  }, []);

  const choosePattern = async (id) => { setPattern(id); await saveJSON('pattern', id); };
  const chooseScheme = async (id) => { setScheme(id); await saveJSON('scheme', id); };
  // Выбор цвета в палитре сразу включает свою схему.
  const chooseCustomColor = async (hex) => {
    setCustomColor(hex); setScheme('custom');
    await saveJSON('customColor', hex); await saveJSON('scheme', 'custom');
  };
  const chooseUiFont = async (id) => { setUiFont(id); await saveJSON('uiFont', id); };
  const chooseReadingFont = async (id) => { setReadingFont(id); await saveJSON('readingFont', id); };
  const chooseArabicFont = async (id) => { setArabicFont(id); await saveJSON('arabicFont', id); };
  const toggleParallax = async (v) => { setParallax(v); await saveJSON('parallax', v); };

  const sc = React.useMemo(() => schemeFor(scheme, customColor), [scheme, customColor]);
  const fonts = React.useMemo(() => ({ ui: uiFontFor(uiFont).family, reading: readingFontFor(readingFont).family }),
    [uiFont, readingFont]);

  // Виджет красится цветами схемы и говорит на языке приложения: отдаём их
  // в общий контейнер при запуске и при каждой смене.
  const { lang } = useLang();
  useEffect(() => {
    if (ready) publishTheme({ bg: sc.bg, accent: sc.accent, lang });
  }, [ready, sc, lang]);

  if (!ready) return null;
  return (
    <AppearanceContext.Provider value={{
      pattern, choosePattern, PATTERNS,
      scheme, chooseScheme, SCHEMES,
      customColor, chooseCustomColor,
      uiFont, chooseUiFont, UI_FONTS,
      readingFont, chooseReadingFont, READING_FONTS,
      arabicFont, chooseArabicFont, ARABIC_FONTS,
      arabicFamily: arabicFontFor(arabicFont).family,
      parallax, toggleParallax,
      patterned: pattern !== 'none',
      schemeColors: sc, fonts,
      accent: sc.accent, tint: sc.tint,
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext) || {
  pattern: DEFAULT_PATTERN, choosePattern: () => {}, PATTERNS,
  scheme: SCHEMES[0].id, chooseScheme: () => {}, SCHEMES,
  customColor: DEFAULT_CUSTOM, chooseCustomColor: () => {},
  uiFont: UI_FONTS[0].id, chooseUiFont: () => {}, UI_FONTS,
  readingFont: 'system', chooseReadingFont: () => {}, READING_FONTS,
  arabicFont: 'system', chooseArabicFont: () => {}, ARABIC_FONTS,
  arabicFamily: 'System',
  parallax: true, toggleParallax: () => {},
  patterned: true, schemeColors: SCHEMES[0], fonts: { ui: UI_FONTS[0].family, reading: undefined },
  accent: SCHEMES[0].accent, tint: SCHEMES[0].tint,
};
