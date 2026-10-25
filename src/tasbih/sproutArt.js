import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { useAppearance } from '../utils/AppearanceContext';

// Спутник — один на всё приложение: он гуляет по таб-бару главного экрана
// (PixelPal) и сопровождает в обучении (SproutGuide). Персонажей два, выбор в
// настройках оформления: проросшее семечко (по умолчанию) и росток-малыш.
// У семечка нет лица: изображать существ с душой многие учёные запрещают, а
// растения можно по согласию, поэтому настроение семечка передают листки.
// Квадраты-«пиксели» цветов схемы: лист — accent, тело — tint, глаз ростка —
// самый тёмный цвет фона. Имена кадров у обоих персонажей одни и те же.

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

const SPROUT = {
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

// Проросшее семечко: боб с бликом и тенью, из него стебелёк с двумя листками.
// Ног нет — на ходу листки отклоняются назад, а семечко подскакивает на
// пиксель. «Моргание» — листок вздрагивает, «речь» — листки поднимаются и
// опускаются, радость — листки вскинуты, огорчение — поникли зонтиком.
// 'K' — тело семечка, 'S' — его тень. Донце (пиксели 3…8) стоит там же, где
// ноги ростка: на ровной части кромки таб-бара.
const SEED_BODY = [
  '...KKLKKK...',
  '..KWKKKKKS..',
  '.KWKKKKKKKS.',
  '.KKKKKKKKKS.',
  '.KKKKKKKKSS.',
  '..KKKKKKSS..',
  '...KKKKSS...',
];
const SEED_LEAVES = {
  up: [
    '.LLL....LLL.',
    'LLLLL..LLLLL',
    '.LLLL..LLLL.',
    '...LLLLLL...',
    '.....LL.....',
    '.....L......',
  ],
  back: [
    'LLL....LLL..',
    'LLLL..LLLLL.',
    'LLLL..LLLL..',
    '..LLLLLL....',
    '....LLL.....',
    '.....L......',
  ],
  flick: [
    '.LLL.....LLL',
    'LLLLL..LLLLL',
    '.LLLL..LLLL.',
    '...LLLLLL...',
    '.....LL.....',
    '.....L......',
  ],
  raised: [
    '..LL....LL..',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '..LLL..LLL..',
    '....LLLL....',
    '.....L......',
  ],
  droop: [
    '............',
    '............',
    '...LLLLLL...',
    '.LLLLLLLLLL.',
    'LLLL.L..LLLL',
    'LL...L....LL',
  ],
  flat: [
    '............',
    '............',
    '............',
    'LLL......LLL',
    'LLLLL..LLLLL',
    '..LLLLLLLL..',
  ],
};
const seed = leaves => [...SEED_LEAVES[leaves], ...SEED_BODY];
const SEED = {
  idle: { top: 0, rows: seed('up') },
  walkA: { top: 0, rows: seed('back') },
  walkB: { top: -1, rows: seed('up') },
  blink: { top: 0, rows: seed('flick') },
  squish: { top: 0, rows: seed('flat') },
  talk: { top: 0, rows: seed('raised') },
  talkHalf: { top: 0, rows: seed('up') },
  happy: { top: 0, rows: seed('raised') },
  sad: { top: 0, rows: seed('droop') },
};

// Предмет вместо существа: фонарь не ходит, а стоит на кромке и живёт своей
// анимацией — кадры a0…aN по кругу (OBJECT_ANIM), idle — первый из них.

// Фонарь (фанус): купол и донце цветом листа, стенки — тела, стекло тёплое
// ('G'), пламя ('F') с белым ядром мерцает.
const LANTERN = [
  '.....KK.....',
  '....K..K....',
  '....LLLL....',
  '...LLLLLL...',
  '..LLLLLLLL..',
  '..K######K..',
  '..K######K..',
  '..K######K..',
  '..K######K..',
  '..K######K..',
  '..LLLLLLLL..',
  '...LLLLLL...',
  '....LLLL....',
];
const FLAMES = [
  ['GGGFGG', 'GGFFGG', 'GFFWFG', 'GFWWFG', 'GGFFGG'],
  ['GGFGGG', 'GGFFGG', 'GFFWFG', 'GFWWFG', 'GGFFGG'],
  ['GGGGGG', 'GGGFGG', 'GGFFGG', 'GFWWFG', 'GGFFGG'],
  ['GGGGFG', 'GGFFGG', 'GFFWFG', 'GFWWFG', 'GGFFGG'],
];
const lanternFrame = flame => ({ top: 0, rows: LANTERN.map((row, r) =>
  (r >= 5 && r <= 9 ? row.replace('######', flame[r - 5]) : row)) });

const cycle = (count, make) => {
  const frames = {};
  for (let i = 0; i < count; i += 1) frames['a' + i] = make(i);
  return { idle: frames.a0, ...frames };
};
const LANTERN_FRAMES = cycle(FLAMES.length, i => lanternFrame(FLAMES[i]));

const CHARACTER_FRAMES = { seed: SEED, sprout: SPROUT, lantern: LANTERN_FRAMES };

// Кто ходит по кромке (семечко, росток), а кто стоит на месте (фонарь).
export const WALKERS = new Set(['seed', 'sprout']);
// Кадры предметов по кругу и пауза между ними; у фонаря пауза случайная.
export const OBJECT_ANIM = {
  lantern: { frames: ['a0', 'a1', 'a2', 'a3'], ms: [110, 260], random: true },
};
// В уроках говорит и радуется только существо-спутник: при выбранном
// предмете там остаётся семечко.
export const guideCharacter = character => (character === 'sprout' ? 'sprout' : 'seed');

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
const RECTS = Object.fromEntries(Object.entries(CHARACTER_FRAMES).map(([id, frames]) => [id,
  Object.fromEntries(Object.entries(frames).map(([name, def]) => [name, buildRects(def)]))]));

const FLAME = '#ffb454';
const hexToRgb = hex => (/^#[0-9a-f]{6}$/i.test(hex || '')
  ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',') : null);

// Цвета, которых нет в схеме: блик и румянец одинаковы при любой палитре.
const FIXED = { W: 'rgba(255,255,255,0.9)', P: 'rgba(255,138,160,0.8)' };

// Прямоугольники заходят друг на друга на полпункта: в дыхании и прыжке росток
// масштабируется, края встают на дробные позиции, и без нахлёста между
// «пикселями» проступали бы тонкие щели.
const SEAM = 0.5;

// px — размер одного «пикселя» в пунктах; character — какой персонаж, без
// него — выбранный в настройках.
export const Sprite = memo(function Sprite({ frame, colors, px = 4, character }) {
  const { character: chosen } = useAppearance();
  const rects = (RECTS[character || chosen] || RECTS.seed)[frame] || [];
  return (
    <View style={{ width: COLS * px, height: ROWS * px }}>
      {rects.map(r => (
        <View key={`${r.c}:${r.x}:${r.y}`} style={{
          position: 'absolute', left: r.x * px, top: r.y * px, width: r.w * px + SEAM, height: r.h * px + SEAM,
          backgroundColor: colors[r.c] || FIXED[r.c],
        }} />
      ))}
    </View>
  );
});

// Тело семечка темнее листков: цвет схемы, смешанный с фоном. Смешивается
// заранее, а не прозрачностью — сквозь полупрозрачное тело просвечивала бы
// прокрутка под таб-баром.
function mix(rgb, hex, share) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 'rgba(' + rgb + ',' + share + ')';
  const a = rgb.split(',').map(Number);
  const b = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return 'rgb(' + a.map((v, i) => Math.round(v * share + b[i] * (1 - share))).join(',') + ')';
}

// Цвета персонажа из текущей схемы.
export function useSproutColors() {
  const { accent, tint, schemeColors } = useAppearance();
  return useMemo(() => ({
    L: accent,
    B: `rgba(${tint || '150,200,225'},1)`,
    W: FIXED.W,
    E: schemeColors.bg[1],
    P: FIXED.P,
    K: mix(tint || '150,200,225', schemeColors.bg[0], 0.62),
    S: mix(tint || '150,200,225', schemeColors.bg[0], 0.4),
    D: mix(hexToRgb(accent) || tint || '150,200,225', schemeColors.bg[0], 0.6),
    // Пламя фонаря тёплое при любой схеме, стекло — то же пламя на фоне.
    F: FLAME,
    G: mix(hexToRgb(FLAME), schemeColors.bg[0], 0.3),
  }), [accent, tint, schemeColors]);
}
