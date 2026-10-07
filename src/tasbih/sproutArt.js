import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { useAppearance } from '../utils/AppearanceContext';

// Рисунок ростка — один на всё приложение: он гуляет по таб-бару главного
// экрана (PixelPal) и сопровождает в обучении (SproutGuide). Квадраты-«пиксели»
// цветов схемы: лист — accent, тело — tint, глаз — самый тёмный цвет фона.

export const COLS = 12;
export const ROWS = 13;

// Кадры: '.' — пусто, 'L' — лист и стебель, 'B' — тело, 'W' — блик, 'E' — глаз
// и рот, 'P' — румянец. top — строка, с которой начинается кадр: в шаге-прыжке
// тело на пиксель выше.
const IDLE = [
  '.....LL.....',
  '....LLL.LL..',
  '......LLL...',
  '......L.....',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBWBBBBBBB.',
  '.BBEBBBBEBB.',
  '.BBEBBBBEBB.',
  '.BBBBBBBBBB.',
  '.BBBBBBBBBB.',
  '..BBBBBBBB..',
  '...B....B...',
];
const withRows = (rows, changes) => rows.map((r, i) => (changes[i] !== undefined ? changes[i] : r));

export const FRAMES = {
  idle: { top: 0, rows: IDLE },
  // Шаг: ноги разведены.
  walkA: { top: 0, rows: withRows(IDLE, { 12: '..B......B..' }) },
  // Шаг-прыжок: тело на пиксель выше, ноги сведены и вытянуты на два пикселя.
  walkB: { top: -1, rows: [...IDLE.slice(0, 12), '....B..B....', '....B..B....'] },
  // Моргание: на месте каждого глаза — короткая чёрточка вместо двух пикселей.
  blink: { top: 0, rows: withRows(IDLE, { 7: '.BBBBBBBBBB.', 8: '.BEEBBBBEEB.' }) },
  // Придавило: глаза зажмурены косыми чёрточками (> <), рот — удивлённое «о».
  squish: { top: 0, rows: withRows(IDLE, { 7: '.BEBBBBBBEB.', 8: '.BBEBBBBEBB.', 10: '.BBBBEEBBBB.' }) },
  // Говорит: рот открыт квадратиком два на два или приоткрыт полоской.
  talk: { top: 0, rows: withRows(IDLE, { 9: '.BBBBEEBBBB.', 10: '.BBBBEEBBBB.' }) },
  talkHalf: { top: 0, rows: withRows(IDLE, { 10: '.BBBBEEBBBB.' }) },
  // Радуется: глаза дугами «^ ^», румянец и улыбка.
  happy: { top: 0, rows: withRows(IDLE, {
    7: '.BBEBBBBEBB.', 8: '.BEBEBBEBEB.', 9: '.BPBBBBBBPB.', 10: '.BBBEBBEBBB.', 11: '..BBBEEBBB..',
  }) },
  // Огорчён: глаза опущены, рот дугой вниз.
  sad: { top: 0, rows: withRows(IDLE, {
    7: '.BBBBBBBBBB.', 8: '.BBEBBBBEBB.', 9: '.BBEBBBBEBB.', 10: '.BBBBEEBBBB.', 11: '..BBEBBEBB..',
  }) },
};

// Строки сливаются в отрезки, а одинаковые отрезки подряд — в прямоугольники:
// вместо сотни View на кадр получается два-три десятка.
function buildRects({ top, rows }) {
  const open = new Map();
  const rects = [];
  rows.forEach((row, r) => {
    const y = top + r;
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w += 1;
      if (c !== '.') {
        const key = `${c}:${x}:${w}`;
        const prev = open.get(key);
        if (prev && prev.y + prev.h === y) {
          prev.h += 1;
        } else {
          const rect = { c, x, y, w, h: 1 };
          open.set(key, rect);
          rects.push(rect);
        }
      }
      x += w;
    }
  });
  return rects;
}
const RECTS = Object.fromEntries(Object.entries(FRAMES).map(([name, def]) => [name, buildRects(def)]));

// Цвета, которых нет в схеме: блик и румянец одинаковы при любой палитре.
const FIXED = { W: 'rgba(255,255,255,0.9)', P: 'rgba(255,138,160,0.8)' };

// Прямоугольники заходят друг на друга на полпункта: в дыхании и прыжке росток
// масштабируется, края встают на дробные позиции, и без нахлёста между
// «пикселями» проступали бы тонкие щели.
const SEAM = 0.5;

// px — размер одного «пикселя» в пунктах.
export const Sprite = memo(function Sprite({ frame, colors, px = 4 }) {
  return (
    <View style={{ width: COLS * px, height: ROWS * px }}>
      {RECTS[frame].map(r => (
        <View key={`${r.c}:${r.x}:${r.y}`} style={{
          position: 'absolute', left: r.x * px, top: r.y * px, width: r.w * px + SEAM, height: r.h * px + SEAM,
          backgroundColor: colors[r.c] || FIXED[r.c],
        }} />
      ))}
    </View>
  );
});

// Цвета ростка из текущей схемы.
export function useSproutColors() {
  const { accent, tint, schemeColors } = useAppearance();
  return useMemo(() => ({
    L: accent,
    B: `rgba(${tint || '150,200,225'},1)`,
    W: FIXED.W,
    E: schemeColors.bg[1],
    P: FIXED.P,
  }), [accent, tint, schemeColors]);
}
