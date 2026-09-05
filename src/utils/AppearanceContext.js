import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './helpers';

const AppearanceContext = createContext(null);

// Each theme is a PACK of wallpapers with slots:
//   main   — Prayer / Qibla / Quran list (the everyday backdrop)
//   reader — behind Quran ayah text (must stay calm, not fight the text)
//   lesson — inside the learning lessons
// If a slot is missing it falls back to `main`.
export const THEMES = [
  { id: 'main',   label_en: 'Azure',  label_ru: 'Лазурь',   main: 'main',   reader: 'main',   lesson: 'main',   tint: '150,200,225', accent: '#bcd3e0' },
  { id: 'clouds', label_en: 'Clouds', label_ru: 'Облака',   main: 'clouds', reader: 'clouds', lesson: 'main',   tint: '150,200,225', accent: '#bcd3e0' },
  { id: 'dawn',   label_en: 'Dawn',   label_ru: 'Рассвет',  main: 'dawn',   reader: 'dawn',   lesson: 'main',   tint: '230,180,150', accent: '#e3b48c' },
  { id: 'dusk',   label_en: 'Dusk',   label_ru: 'Сумерки',  main: 'alt1',   reader: 'alt1',   lesson: 'main',   tint: '200,160,200', accent: '#caa6d6' },
  { id: 'night',  label_en: 'Night',  label_ru: 'Ночь',     main: 'alt2',   reader: 'alt2',   lesson: 'main',   tint: '150,180,220', accent: '#a9c2e0' },
  // Emerald "Paradise Gardens" pack
  { id: 'garden', label_en: 'Gardens', label_ru: 'Райские сады',
    main: 'garden_main', reader: 'garden_reader', lesson: 'garden_lesson', tint: '140,200,150', accent: '#8fcf9a' },
  // Cosmos pack — deep indigo/violet starry sky.
  { id: 'cosmos', label_en: 'Cosmos', label_ru: 'Космос',
    main: 'cosmos_main', reader: 'cosmos_reader', lesson: 'cosmos_lesson', tint: '170,150,220', accent: '#b6a6e0' },
];

// Resolve a wallpaper key for a theme + slot, with fallback to main.

// Узорные темы. Плитка одна на все схемы: она белая на прозрачном фоне
// и красится через tintColor, поэтому «узор × цвет» не размножается файлами.
export const PATTERNS = [
  { id: 'none',   label_en: 'Plain',   label_ru: 'Без узора' },
  { id: 'stars',  label_en: 'Khatam',  label_ru: 'Хатам' },
  { id: 'bloom',  label_en: 'Bloom',   label_ru: 'Цветок' },
  { id: 'girih',  label_en: 'Girih',   label_ru: 'Гирих' },
  { id: 'scales', label_en: 'Domes',   label_ru: 'Купола' },
];

export const PATTERN_TILES = {
  stars: require('../../assets/patterns/stars.png'),
  bloom: require('../../assets/patterns/bloom.png'),
  girih: require('../../assets/patterns/girih.png'),
  scales: require('../../assets/patterns/scales.png'),
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

export function schemeFor(id) {
  return SCHEMES.find((s) => s.id === id) || SCHEMES[0];
}
export function wallpaperFor(themeId, slot) {
  const th = THEMES.find((t) => t.id === themeId) || THEMES[0];
  return th[slot] || th.main;
}

// Theme accent color (active states, progress, highlights).
export function accentFor(themeId) {
  const th = THEMES.find((t) => t.id === themeId) || THEMES[0];
  return th.accent || '#bcd3e0';
}
// Theme glass tint as an "r,g,b" string.
export function tintFor(themeId) {
  const th = THEMES.find((t) => t.id === themeId) || THEMES[0];
  return th.tint || '150,200,225';
}

export function AppearanceProvider({ children }) {
  const [theme, setTheme] = useState('main');
  const [pattern, setPattern] = useState('none');
  const [scheme, setScheme] = useState('ink');
  const [glassOpacity, setGlassOpacity] = useState(0.07);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadJSON('theme', 'main');
      // Тема могла быть удалена из набора — тогда откатываемся на первую,
      // иначе сохранённый идентификатор молча тянул бы дефолты.
      setTheme(THEMES.some((t) => t.id === saved) ? saved : 'main');

      const savedPattern = await loadJSON('pattern', 'none');
      setPattern(PATTERNS.some((p) => p.id === savedPattern) ? savedPattern : 'none');

      const savedScheme = await loadJSON('scheme', 'ink');
      setScheme(SCHEMES.some((s) => s.id === savedScheme) ? savedScheme : 'ink');

      setGlassOpacity(await loadJSON('glassOpacity', 0.07));
      setReady(true);
    })();
  }, []);

  const chooseTheme = async (id) => { setTheme(id); await saveJSON('theme', id); };
  const choosePattern = async (id) => { setPattern(id); await saveJSON('pattern', id); };
  const chooseScheme = async (id) => { setScheme(id); await saveJSON('scheme', id); };
  const chooseGlassOpacity = async (v) => { setGlassOpacity(v); await saveJSON('glassOpacity', v); };

  // Когда выбран узор, фотообои не используются, и акцент со стеклом берутся
  // из монохромной схемы: иначе голубое стекло висело бы поверх песочного фона.
  const patterned = pattern !== 'none';
  const sc = schemeFor(scheme);

  if (!ready) return null;
  return (
    <AppearanceContext.Provider value={{
      theme, chooseTheme, THEMES,
      pattern, choosePattern, PATTERNS,
      scheme, chooseScheme, SCHEMES,
      patterned, schemeColors: sc,
      glassOpacity, chooseGlassOpacity,
      accent: patterned ? sc.accent : accentFor(theme),
      tint: patterned ? sc.tint : tintFor(theme),
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext) || {
  theme: 'main', chooseTheme: () => {}, THEMES,
  pattern: 'none', choosePattern: () => {}, PATTERNS,
  scheme: 'ink', chooseScheme: () => {}, SCHEMES,
  patterned: false, schemeColors: SCHEMES[0],
  glassOpacity: 0.07, chooseGlassOpacity: () => {},
  accent: '#bcd3e0', tint: '150,200,225',
};
