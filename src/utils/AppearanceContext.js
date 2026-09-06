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
  { id: 'stars',  label_en: 'Khatam',  label_ru: 'Хатам' },
  { id: 'bloom',  label_en: 'Bloom',   label_ru: 'Цветок' },
  { id: 'girih',  label_en: 'Girih',   label_ru: 'Гирих' },
  { id: 'scales', label_en: 'Domes',    label_ru: 'Купола' },
  { id: 'dunes',    label_en: 'Dunes',    label_ru: 'Барханы' },
  { id: 'arches',   label_en: 'Arches',   label_ru: 'Арки' },
  { id: 'lanterns', label_en: 'Lanterns', label_ru: 'Фонари' },
  { id: 'swords',   label_en: 'Sabres',   label_ru: 'Сабли' },
];

export const PATTERN_TILES = {
  stars: require('../../assets/patterns/stars.png'),
  bloom: require('../../assets/patterns/bloom.png'),
  girih: require('../../assets/patterns/girih.png'),
  scales: require('../../assets/patterns/scales.png'),
  dunes: require('../../assets/patterns/dunes.png'),
  arches: require('../../assets/patterns/arches.png'),
  lanterns: require('../../assets/patterns/lanterns.png'),
  swords: require('../../assets/patterns/swords.png'),
};

// Монохромные схемы: каждая держится одного тона, меняется только светлота.
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
];

// Шрифты только системные: ничего не скачивается и не грузится при старте.
// Каждый из них есть в iOS с давних версий, поэтому подмены не случится.
export const FONT_SETS = [
  { id: 'system', label_en: 'System',  label_ru: 'Системный',
    ui: undefined,      reading: undefined },
  { id: 'rounded', label_en: 'Rounded', label_ru: 'Округлый',
    ui: 'SF Pro Rounded', reading: 'SF Pro Rounded' },
  { id: 'serif',  label_en: 'Serif',   label_ru: 'С засечками',
    ui: undefined,      reading: 'Georgia' },
  { id: 'avenir', label_en: 'Avenir',  label_ru: 'Авенир',
    ui: 'Avenir Next',  reading: 'Avenir Next' },
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
  const [pattern, setPattern] = useState('stars');
  const [scheme, setScheme] = useState('ink');
  const [fontSet, setFontSet] = useState('system');
  const [arabicFont, setArabicFont] = useState('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Значения из удалённых наборов откатываются на первое: сохранённый
      // идентификатор старой темы иначе молча тянул бы дефолты.
      const savedPattern = await loadJSON('pattern', 'stars');
      setPattern(PATTERNS.some((p) => p.id === savedPattern) ? savedPattern : 'stars');

      const savedScheme = await loadJSON('scheme', 'ink');
      setScheme(SCHEMES.some((s) => s.id === savedScheme) ? savedScheme : 'ink');

      const savedFont = await loadJSON('fontSet', 'system');
      setFontSet(FONT_SETS.some((f) => f.id === savedFont) ? savedFont : 'system');

      const savedArabic = await loadJSON('arabicFont', 'system');
      setArabicFont(ARABIC_FONTS.some((f) => f.id === savedArabic) ? savedArabic : 'system');

      setReady(true);
    })();
  }, []);

  const choosePattern = async (id) => { setPattern(id); await saveJSON('pattern', id); };
  const chooseScheme = async (id) => { setScheme(id); await saveJSON('scheme', id); };
  const chooseFontSet = async (id) => { setFontSet(id); await saveJSON('fontSet', id); };
  const chooseArabicFont = async (id) => { setArabicFont(id); await saveJSON('arabicFont', id); };

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
      patterned: pattern !== 'none',
      schemeColors: sc, fonts,
      accent: sc.accent, tint: sc.tint,
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext) || {
  pattern: 'stars', choosePattern: () => {}, PATTERNS,
  scheme: 'ink', chooseScheme: () => {}, SCHEMES,
  fontSet: 'system', chooseFontSet: () => {}, FONT_SETS,
  arabicFont: 'system', chooseArabicFont: () => {}, ARABIC_FONTS,
  arabicFamily: 'System',
  patterned: true, schemeColors: SCHEMES[0], fonts: FONT_SETS[0],
  accent: SCHEMES[0].accent, tint: SCHEMES[0].tint,
};
