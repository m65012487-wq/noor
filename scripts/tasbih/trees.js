// Деревья тасбиха: плоские силуэты в стиле тем приложения.
//
// Раньше это были восемь растровых кадров на каждую породу — сорок файлов
// и двадцать мегабайт, которые спорили с остальным интерфейсом по стилю.
// Здесь дерево складывается из простых фигур одного цвета с разной
// прозрачностью, как сцены обоев: цвет берётся из схемы, файлов нет вовсе.
//
// Запуск из корня проекта: node scripts/tasbih/trees.js
// Пишет src/tasbih/treeShapes.js (данные для компонента) и, с ключом
// --preview <путь>, SVG-листы для глазной проверки.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'src', 'tasbih', 'treeShapes.js');

// Общий холст: основание ствола у всех пород и стадий в одной точке,
// поэтому при росте дерево не прыгает по экрану.
const W = 240;
const H = 300;
const BASE = { x: 120, y: 270 };

const n = (v) => {
  const s = Number(v).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};

function cubic(p, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
}

// Ствол или ветка: кривая с сужением от основания к кончику.
function limb(p, w0, w1, steps = 14) {
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = cubic(p, Math.max(0, t - 0.01));
    const b = cubic(p, Math.min(1, t + 0.01));
    const c = cubic(p, t);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.8)) / 2;
    left.push({ x: c.x + nx * w, y: c.y + ny * w });
    right.push({ x: c.x - nx * w, y: c.y - ny * w });
  }
  const pts = [...left, p[3], ...right.reverse()];
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let d = `M${n(mid(pts[pts.length - 1], pts[0]).x)} ${n(mid(pts[pts.length - 1], pts[0]).y)}`;
  for (let i = 0; i < pts.length; i += 1) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(cur, next);
    d += `Q${n(cur.x)} ${n(cur.y)} ${n(m.x)} ${n(m.y)}`;
  }
  return `${d}Z`;
}

const p = (d, o) => ({ t: 'p', d, o });
const e = (cx, cy, rx, ry, o) => ({ t: 'e', cx: +n(cx), cy: +n(cy), rx: +n(rx), ry: +n(ry), o });

// Ствол заданной высоты с лёгким наклоном и утолщением у земли.
function trunk(h, w, lean = 0, o = 0.85) {
  const top = { x: BASE.x + lean, y: BASE.y - h };
  const curve = [
    { x: BASE.x, y: BASE.y },
    { x: BASE.x - lean * 0.3, y: BASE.y - h * 0.4 },
    { x: BASE.x + lean * 0.9, y: BASE.y - h * 0.75 },
    top,
  ];
  return { shape: p(limb(curve, w, Math.max(1.2, w * 0.35)), o), top };
}

function branch(from, to, w, o = 0.7) {
  const curve = [from,
    { x: from.x + (to.x - from.x) * 0.3, y: from.y - Math.abs(to.y - from.y) * 0.25 },
    { x: from.x + (to.x - from.x) * 0.75, y: to.y + (from.y - to.y) * 0.25 },
    to];
  return p(limb(curve, w, Math.max(1, w * 0.3)), o);
}

// Крона: несколько перекрывающихся пятен разной плотности. Разные породы
// отличаются расстановкой и сплюснутостью пятен, а не отдельным рисунком.
const CROWNS = {
  // Олива: вытянутая вверх, слегка растрёпанная крона.
  olive: [[-0.66, 0.26, 0.48, 0.45], [0.6, 0.06, 0.5, 0.6], [-0.26, -0.52, 0.52, 0.72], [0.26, -0.3, 0.46, 0.8], [0.08, 0.22, 0.6, 0.92]],
  // Инжир: широкая и низкая.
  fig: [[-0.75, 0.2, 0.6, 0.5], [0.72, 0.16, 0.6, 0.6], [-0.05, -0.34, 0.68, 0.78], [0.3, 0.26, 0.6, 0.9]],
  // Гранат: плотный круглый ком.
  pomegranate: [[-0.42, 0.22, 0.5, 0.5], [0.44, 0.14, 0.52, 0.62], [0, -0.5, 0.56, 0.78], [0.06, 0.1, 0.58, 0.92]],
  // Сидр: раскидистая, почти плоская сверху.
  sidr: [[-0.9, 0.18, 0.56, 0.5], [0.88, 0.14, 0.56, 0.6], [-0.3, -0.3, 0.6, 0.76], [0.36, -0.22, 0.6, 0.86], [0.02, 0.22, 0.62, 0.92]],
};
const FLATTEN = { olive: 0.98, fig: 0.72, pomegranate: 1.04, sidr: 0.6, date_palm: 1 };

function crown(species, cx, cy, r) {
  const flat = FLATTEN[species];
  return CROWNS[species].map(([dx, dy, f, o]) =>
    e(cx + dx * r, cy + dy * r * flat, r * f, r * f * flat, o));
}

// Плоды появляются на двух последних стадиях: у граната крупные, у прочих
// мелкие. Это единственное, чем отличается плодоносящая стадия.
function fruit(species, cx, cy, r, count, o) {
  const spots = [[-0.5, 0.25], [0.45, 0.1], [0.05, 0.45], [-0.15, -0.2], [0.62, 0.42], [-0.68, -0.05]];
  const size = species === 'pomegranate' ? 6 : 4;
  return spots.slice(0, count).map(([dx, dy]) => e(cx + dx * r, cy + dy * r, size, size, o));
}

// Пальма: ствол без ветвей и веер листьев. Листья — изогнутые «перья»,
// поэтому для неё отдельная сборка, а не общая крона.
function frond(cx, cy, angle, len, o) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const tip = { x: cx + dx * len, y: cy + dy * len * 0.9 };
  const curve = [{ x: cx, y: cy },
    { x: cx + dx * len * 0.35, y: cy + dy * len * 0.55 },
    { x: cx + dx * len * 0.8, y: cy + dy * len * 0.85 },
    tip];
  return p(limb(curve, 13, 1.5, 12), o);
}

function palm(stage) {
  const S = [
    { h: 0, fronds: 0, len: 0 },
    { h: 26, fronds: 2, len: 26 },
    { h: 52, fronds: 3, len: 40 },
    { h: 86, fronds: 4, len: 52 },
    { h: 118, fronds: 5, len: 62 },
    { h: 150, fronds: 6, len: 70 },
    { h: 172, fronds: 7, len: 76 },
    { h: 190, fronds: 7, len: 82 },
  ][stage];
  const { shape, top } = trunk(S.h, 6 + stage * 1.6, -4);
  const shapes = [shape];
  // Кольца на стволе — след от опавших листьев, узнаваемая примета пальмы.
  for (let i = 1; i <= Math.min(5, stage); i += 1) {
    const y = top.y + (S.h * i) / 6;
    shapes.push(e(BASE.x - 2, y, 5 + stage * 0.7, 1.6, 0.35));
  }
  const spread = [0, 30, 42, 50, 56, 62, 66, 70][stage];
  const count = S.fronds;
  for (let i = 0; i < count; i += 1) {
    const k = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    shapes.push(frond(top.x, top.y, k * spread, S.len, 0.55 + Math.abs(1 - Math.abs(k)) * 0.3));
  }
  if (stage >= 6) shapes.push(...fruit('date_palm', top.x, top.y + 16, 22, 3, 1));
  return shapes;
}

// Общая сборка для лиственных пород.
const GROWTH = [
  { h: 0, r: 0, w: 0 },
  { h: 30, r: 15, w: 4 },
  { h: 58, r: 26, w: 6 },
  { h: 92, r: 38, w: 8.5 },
  { h: 124, r: 50, w: 11 },
  { h: 148, r: 56, w: 13.5 },
  { h: 166, r: 62, w: 15.5 },
  { h: 178, r: 62, w: 17 },
];

function leafy(species, stage) {
  if (stage === 0) return [];
  const g = GROWTH[stage];
  const { shape, top } = trunk(g.h, g.w, stage > 2 ? -5 : 0);
  const shapes = [shape];
  const cy = top.y - g.r * 0.25;
  if (stage >= 4) {
    shapes.push(branch(top, { x: top.x - g.r * 0.7, y: cy + g.r * 0.1 }, g.w * 0.5));
    shapes.push(branch({ x: top.x, y: top.y + g.h * 0.12 }, { x: top.x + g.r * 0.7, y: cy + g.r * 0.2 }, g.w * 0.45));
  }
  if (stage === 1) {
    // Росток: два листа вместо кроны — крона на такой высоте выглядела бы
    // шариком на спичке.
    shapes.push(e(top.x - 9, top.y + 2, 10, 5.5, 0.75), e(top.x + 9, top.y - 1, 10, 5.5, 0.6));
  } else {
    shapes.push(...crown(species, top.x, cy, g.r));
  }
  if (stage >= 6) shapes.push(...fruit(species, top.x, cy, g.r, stage === 6 ? 3 : 5, stage === 6 ? 0.75 : 1));
  return shapes;
}

const SPECIES = ['olive', 'date_palm', 'pomegranate', 'fig', 'sidr'];

// Габариты фигуры. Нужны дважды: проверить, что рисунок влез в холст, и
// показать маленькие стадии крупно на карточке входа — зерно во весь холст
// занимает три точки и выглядит пустым местом.
const MARGIN = 4;

function boundsOf(shapes) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const s of shapes) {
    if (s.t === 'e') {
      hit(s.cx - s.rx, s.cy - s.ry);
      hit(s.cx + s.rx, s.cy + s.ry);
    } else {
      // Контур уже разложен в числа: достаточно пройти все координаты пути.
      const nums = s.d.match(/-?\d+(\.\d+)?/g).map(Number);
      for (let i = 0; i + 1 < nums.length; i += 2) hit(nums[i], nums[i + 1]);
    }
  }
  return {
    x: +Math.max(0, minX - MARGIN).toFixed(1), y: +Math.max(0, minY - MARGIN).toFixed(1),
    width: +Math.min(W, maxX + MARGIN - Math.max(0, minX - MARGIN)).toFixed(1),
    height: +Math.min(H, maxY + MARGIN - Math.max(0, minY - MARGIN)).toFixed(1),
    raw: { minX, minY, maxX, maxY },
  };
}

// Нулевая стадия у всех одна: зерно в земле.
const SEED = [e(BASE.x, BASE.y - 2, 22, 7, 0.3), e(BASE.x, BASE.y - 9, 8, 11, 0.85)];

const DATA = {};
const BOUNDS = {};
for (const s of SPECIES) {
  DATA[s] = [];
  BOUNDS[s] = [];
  for (let stage = 0; stage < 8; stage += 1) {
    DATA[s].push(stage === 0 ? SEED : s === 'date_palm' ? palm(stage) : leafy(s, stage));
    const b = boundsOf(DATA[s][stage]);
    const { minX, minY, maxX, maxY } = b.raw;
    if (minX < 0 || minY < 0 || maxX > W || maxY > H) {
      throw new Error(`${s}, стадия ${stage}: рисунок вышел за холст — ${'' /* габариты ниже */}`
        + `x ${minX.toFixed(1)}..${maxX.toFixed(1)}, y ${minY.toFixed(1)}..${maxY.toFixed(1)}`);
    }
    delete b.raw;
    BOUNDS[s].push(b);
  }
}

const js = `// Сгенерировано scripts/tasbih/trees.js — не править вручную.
//
// Силуэт дерева: массив фигур на стадию (0..7) для каждой породы.
// t: 'p' — путь, 'e' — эллипс; o — прозрачность, которая и даёт объём.
// Цвет задаёт компонент: он один на всю фигуру и берётся из цветовой схемы.

export const TREE_CANVAS = { width: ${W}, height: ${H}, baseX: ${BASE.x}, baseY: ${BASE.y} };

export const TREE_SHAPES = ${JSON.stringify(DATA)};

// Прямоугольник, в который вписан силуэт. По нему карточка входа показывает
// маленькие стадии крупно: зерно во весь холст занимает три точки и читается
// как пустое место.
export const TREE_BOUNDS = ${JSON.stringify(BOUNDS)};
`;
fs.writeFileSync(OUT, js);
console.log(`src/tasbih/treeShapes.js: ${(js.length / 1024).toFixed(1)} KB`);

// Лист для проверки глазами: строка на породу, восемь стадий в ряд.
const previewArg = process.argv.indexOf('--preview');
if (previewArg > -1) {
  const dir = process.argv[previewArg + 1];
  fs.mkdirSync(dir, { recursive: true });
  const draw = (shapes, color) => shapes.map((s) => (s.t === 'p'
    ? `<path d="${s.d}" fill="${color}" fill-opacity="${s.o}"/>`
    : `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="${color}" fill-opacity="${s.o}"/>`)).join('');
  const color = '#d6ecdf';
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 8}" height="${H * SPECIES.length}" viewBox="0 0 ${W * 8} ${H * SPECIES.length}"><rect width="100%" height="100%" fill="#212b25"/>`;
  SPECIES.forEach((s, row) => {
    DATA[s].forEach((shapes, stage) => {
      svg += `<g transform="translate(${stage * W} ${row * H})">${draw(shapes, color)}</g>`;
    });
  });
  svg += '</svg>';
  fs.writeFileSync(path.join(dir, 'trees.svg'), svg);
  console.log(`preview: ${path.join(dir, 'trees.svg')}`);
}
