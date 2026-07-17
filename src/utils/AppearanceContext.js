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
  // Flat monochrome "dot" style — pure black, thin white lines, red accent.
  // No wallpaper, no frosted glass: components render a flat mono variant.
  { id: 'dot', label_en: 'Dot', label_ru: 'Точки',
    main: 'main', reader: 'main', lesson: 'main', tint: '255,255,255', accent: '#e60019',
    flat: true, bg: '#2a2a30' },
];

// Resolve a wallpaper key for a theme + slot, with fallback to main.
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
// Whether the theme uses the flat monochrome look (no wallpaper, no glass blur).
export function flatFor(themeId) {
  const th = THEMES.find((t) => t.id === themeId) || THEMES[0];
  return !!th.flat;
}
// Solid background color for flat themes.
export function bgFor(themeId) {
  const th = THEMES.find((t) => t.id === themeId) || THEMES[0];
  return th.bg || '#0e1a2a';
}

export function AppearanceProvider({ children }) {
  const [theme, setTheme] = useState('main');
  const [glassOpacity, setGlassOpacity] = useState(0.07);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setTheme(await loadJSON('theme', 'main'));
      setGlassOpacity(await loadJSON('glassOpacity', 0.07));
      setReady(true);
    })();
  }, []);

  const chooseTheme = async (id) => { setTheme(id); await saveJSON('theme', id); };
  const chooseGlassOpacity = async (v) => { setGlassOpacity(v); await saveJSON('glassOpacity', v); };

  if (!ready) return null;
  return (
    <AppearanceContext.Provider value={{ theme, chooseTheme, glassOpacity, chooseGlassOpacity, THEMES,
      accent: accentFor(theme), tint: tintFor(theme), flat: flatFor(theme), bg: bgFor(theme) }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext) || {
  theme: 'main', glassOpacity: 0.07, chooseTheme: () => {}, chooseGlassOpacity: () => {}, THEMES,
  accent: '#bcd3e0', tint: '150,200,225', flat: false, bg: '#0e1a2a',
};
