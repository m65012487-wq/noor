import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './helpers';

const AppearanceContext = createContext(null);

// Оформление держится на трёх осях: узор, цветовая схема и шрифт.
// Фотообои («Лазурь», «Рассвет», «Космос» и прочие) убраны: они тянули
// за собой одиннадцать полноэкранных картинок, конкурировали с текстом
// и всё равно уступали узорам по читаемости.

// Плитка одна на все схемы: она белая на прозрачном фоне и красится через
// tintColor, поэтому «узор × цвет» не размножается файлами.
export const PATTERNS = [
  { id: 'none',   label_en: 'Plain',   label_ru: 'Без узора' },
  { id: 'bloom',  label_en: 'Bloom',   label_ru: 'Цветок' },
  { id: 'girih',  label_en: 'Girih',   label_ru: 'Гирих' },
  { id: 'scales', label_en: 'Domes',   label_ru: 'Купола' },
  { id: 'lanterns', label_en: 'Lanterns', label_ru: 'Фонари' },

  // Сцены — не плитки: они не повторяются, а растягиваются на весь экран
  // и разложены на три плана, которые сдвигаются при наклоне телефона.
  // Глубина держится на прозрачности слоёв, поэтому цвет по-прежнему
  // задаётся схемой, и одна картинка работает со всеми.
  { id: 'city',     label_en: 'Skyline',  label_ru: 'Город',    kind: 'scene' },
  { id: 'desert',   label_en: 'Desert',   label_ru: 'Пустыня',  kind: 'scene' },
  { id: 'crescent', label_en: 'Crescent', label_ru: 'Полумесяц', kind: 'scene' },
];

export const PATTERN_TILES = {
  bloom: require('../../assets/patterns/bloom.png'),
  girih: require('../../assets/patterns/girih.png'),
  scales: require('../../assets/patterns/scales.png'),
  lanterns: require('../../assets/patterns/lanterns.png'),
};

// Сцена — не один файл, а три плана от дальнего к ближнему. Разложены они
// ради параллакса: при наклоне телефона ближний план уезжает заметно
// сильнее дальнего, и плоская картинка получает глубину.
export const SCENE_LAYERS = {
  city: [
    require('../../assets/scenes/city-1.png'),
    require('../../assets/scenes/city-2.png'),
    require('../../assets/scenes/city-3.png'),
  ],
  desert: [
    require('../../assets/scenes/desert-1.png'),
    require('../../assets/scenes/desert-2.png'),
    require('../../assets/scenes/desert-3.png'),
  ],
  crescent: [
    require('../../assets/scenes/crescent-1.png'),
    require('../../assets/scenes/crescent-2.png'),
    require('../../assets/scenes/crescent-3.png'),
  ],
};

export function patternKind(id) {
  return PATTERNS.find((p) => p.id === id)?.kind || (id === 'none' ? 'none' : 'tile');
}

// Цветовые схемы. Первые пять — глубокие, для ночи и для того, чтобы узор
// читался как тиснение. Вторые пять — светлые: тот же тон, но поднятая
// светлота, поэтому обои видно как рисунок, а не как намёк.
//
// Потолок светлоты выбран не на глаз: у верхнего цвета градиента яркость
// держится ниже 0.11, иначе приглушённый текст (`textMuted`) перестаёт
// набирать три к одному по контрасту, а он несёт подписи и время.
export const SCHEMES = [
  { id: 'ink',   label_en: 'Ink',    label_ru: 'Тушь',
    bg: ['#1b2430', '#0d131b'], tint: '190,205,220', accent: '#c8d6e2' },
  { id: 'sand',  label_en: 'Sand',   label_ru: 'Песок',
    bg: ['#2a241c', '#15110c'], tint: '215,195,160', accent: '#d8c49c' },
  { id: 'moss',  label_en: 'Moss',   label_ru: 'Мох',
    bg: ['#1a2620', '#0c130f'], tint: '165,205,180', accent: '#a6cfb6' },
  { id: 'plum',  label_en: 'Plum',   label_ru: 'Слива',
    bg: ['#241c2b', '#110d15'], tint: '200,180,215', accent: '#c4aed6' },
  { id: 'ash',   label_en: 'Ash',    label_ru: 'Пепел',
    bg: ['#232528', '#101113'], tint: '210,210,215', accent: '#d2d4d8' },

  { id: 'pearl', label_en: 'Pearl',  label_ru: 'Жемчуг',
    bg: ['#4e5d6b', '#232c35'], tint: '225,236,245', accent: '#eaf2f8' },
  { id: 'linen', label_en: 'Linen',  label_ru: 'Лён',
    bg: ['#5c5344', '#2b2620'], tint: '240,228,205', accent: '#f0e2c6' },
  { id: 'sage',  label_en: 'Sage',   label_ru: 'Шалфей',
    bg: ['#46584d', '#212b25'], tint: '210,232,218', accent: '#d6ecdf' },
  { id: 'lilac', label_en: 'Lilac',  label_ru: 'Сирень',
    bg: ['#55495f', '#28222e'], tint: '228,216,240', accent: '#e5d9f0' },
  { id: 'rose',  label_en: 'Rose',   label_ru: 'Роза',
    bg: ['#5f4749', '#2c2224'], tint: '244,220,220', accent: '#f3dcdc' },
];

// Шрифты. Обязательное условие — кириллица: интерфейс русский, и семейство
// без русских букв не ломает приложение, а тихо подменяется системным
// посимвольно. Настройка при этом выглядит нерабочей.
//
// Проверено по таблице cmap каждого файла, а не по памяти. Из прошлого набора
// выброшены Gill Sans (кириллицы нет вовсе), Avenir Next, Optima, Futura и
// Iowan Old Style — латиница и всё.
//
// PT Sans и PT Serif лежат в assets/fonts и подключаются плагином expo-font
// на этапе сборки: их рисовала ParaType под кириллицу, а не добавляла её
// потом. Georgia и Verdana встроены в iOS и кириллицу содержат.
export const FONT_SETS = [
  { id: 'system',  label_en: 'System',  label_ru: 'Системный',
    ui: undefined,     reading: undefined },
  { id: 'rounded', label_en: 'Rounded', label_ru: 'Округлый',
    ui: 'SF Pro Rounded', reading: 'SF Pro Rounded' },
  { id: 'ptsans',  label_en: 'Grotesk', label_ru: 'Гротеск',
    ui: 'PT Sans',     reading: 'PT Sans' },
  { id: 'verdana', label_en: 'Wide',    label_ru: 'Широкий',
    ui: 'Verdana',     reading: 'Verdana' },
  { id: 'georgia', label_en: 'Serif',   label_ru: 'С засечками',
    ui: 'Georgia',     reading: 'Georgia' },
  { id: 'ptserif', label_en: 'Book',    label_ru: 'Книжный',
    ui: 'PT Serif',    reading: 'PT Serif' },
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

export function schemeFor(id) {
  return SCHEMES.find((s) => s.id === id) || SCHEMES[0];
}

export function fontSetFor(id) {
  return FONT_SETS.find((f) => f.id === id) || FONT_SETS[0];
}

export function AppearanceProvider({ children }) {
  const [pattern, setPattern] = useState('city');
  const [scheme, setScheme] = useState('ink');
  const [fontSet, setFontSet] = useState('system');
  const [arabicFont, setArabicFont] = useState('system');
  const [parallax, setParallax] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Значения из удалённых наборов откатываются на первое: сохранённый
      // идентификатор старой темы иначе молча тянул бы дефолты.
      const savedPattern = await loadJSON('pattern', 'city');
      setPattern(PATTERNS.some((p) => p.id === savedPattern) ? savedPattern : 'city');

      const savedScheme = await loadJSON('scheme', 'ink');
      setScheme(SCHEMES.some((s) => s.id === savedScheme) ? savedScheme : 'ink');

      const savedFont = await loadJSON('fontSet', 'system');
      setFontSet(FONT_SETS.some((f) => f.id === savedFont) ? savedFont : 'system');

      const savedArabic = await loadJSON('arabicFont', 'system');
      setArabicFont(ARABIC_FONTS.some((f) => f.id === savedArabic) ? savedArabic : 'system');

      setParallax(await loadJSON('parallax', true) !== false);

      setReady(true);
    })();
  }, []);

  const choosePattern = async (id) => { setPattern(id); await saveJSON('pattern', id); };
  const chooseScheme = async (id) => { setScheme(id); await saveJSON('scheme', id); };
  const chooseFontSet = async (id) => { setFontSet(id); await saveJSON('fontSet', id); };
  const chooseArabicFont = async (id) => { setArabicFont(id); await saveJSON('arabicFont', id); };
  const toggleParallax = async (v) => { setParallax(v); await saveJSON('parallax', v); };

  const sc = schemeFor(scheme);
  const fonts = fontSetFor(fontSet);

  if (!ready) return null;
  return (
    <AppearanceContext.Provider value={{
      pattern, choosePattern, PATTERNS,
      scheme, chooseScheme, SCHEMES,
      fontSet, chooseFontSet, FONT_SETS,
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
  pattern: 'city', choosePattern: () => {}, PATTERNS,
  scheme: 'ink', chooseScheme: () => {}, SCHEMES,
  fontSet: 'system', chooseFontSet: () => {}, FONT_SETS,
  arabicFont: 'system', chooseArabicFont: () => {}, ARABIC_FONTS,
  arabicFamily: 'System',
  parallax: true, toggleParallax: () => {},
  patterned: true, schemeColors: SCHEMES[0], fonts: FONT_SETS[0],
  accent: SCHEMES[0].accent, tint: SCHEMES[0].tint,
};
