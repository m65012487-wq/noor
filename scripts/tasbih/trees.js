// Деревья тасбиха: плоские силуэты в стиле тем приложения.
//
// Дерево — один цвет схемы, а объём даёт прозрачность слоёв: дальние листья
// бледнее, ствол и ближние листья плотнее. Картинок нет, только данные.
//
// Устройство. У каждой породы — рекурсивный скелет ветвей и свой лист:
// узкий у оливы, лопастный у инжира, мелкий овальный у граната и сидра,
// перистые вайи у пальмы. Случайность детерминирована и привязана к пути
// ветки («0/1/2»), поэтому на старшей стадии сохраняются ветки младшей —
// дерево растёт, а не перерисовывается заново. Листья одного слоя сливаются
// в один путь: на экране это несколько фигур, а не двести.
//
// Запуск из корня проекта: node scripts/tasbih/trees.js
// Пишет src/tasbih/treeShapes.js (данные для компонента) и, с ключом
// --preview <путь>, SVG-лист для глазной проверки.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'src', 'tasbih', 'treeShapes.js');

// Общий холст: основание ствола у всех пород и стадий в одной точке,
// поэтому при росте дерево не прыгает по экрану.
const W = 240;
const H = 300;
const BASE = { x: 120, y: 270 };

// Высота силуэта по стадиям (от земли до макушки). Ширина ограничена холстом.
const HEIGHT = [0, 46, 78, 118, 158, 192, 222, 236];
const MAX_W = 228;

const n = (v) => {
  const s = (Math.round(v * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};
const rad = (deg) => (deg * Math.PI) / 180;

// --- случайность ---------------------------------------------------------

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(key) {
  let a = hash(key);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- примитивы -----------------------------------------------------------
// Фигура — замкнутый контур. kind 'smooth': гладкая кривая через середины
// сторон многоугольника; kind 'lens': лист из двух дуг (base → c1 → tip → c2).
// Все контуры приводятся к одному направлению обхода: слои склеиваются в
// один путь, и встречный обход вырезал бы дырки на пересечениях листьев.

function area(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

function smooth(pts) { return { kind: 'smooth', pts }; }
function lens(base, ang, len, wid) {
  const dx = Math.sin(rad(ang)); const dy = -Math.cos(rad(ang));
  const tip = { x: base.x + dx * len, y: base.y + dy * len };
  const mx = base.x + dx * len * 0.48; const my = base.y + dy * len * 0.48;
  return { kind: 'lens', int: true, base, tip, c1: { x: mx - dy * wid, y: my + dx * wid }, c2: { x: mx + dy * wid, y: my - dx * wid } };
}

// Масса листвы: неровное пятно вокруг кончика ветки. Дальний слой кроны —
// из таких пятен, поверх них лежат отдельные листья.
function clump(c, radius, r, flat = 0.82) {
  const pts = [];
  const N = 8;
  for (let i = 0; i < N; i += 1) {
    const th = (i / N) * Math.PI * 2;
    const k = 0.78 + r() * 0.36;
    pts.push({ x: c.x + Math.cos(th) * radius * k, y: c.y + Math.sin(th) * radius * k * flat });
  }
  return { kind: 'smooth', int: true, pts };
}

// Листья и массы листвы пишутся целыми числами — на холсте 240×300 этого
// хватает, а данных вдвое меньше; ветки сохраняют десятые, иначе тонкие
// побеги выходят ступеньками.
function serialize(shape) {
  const q = shape.int ? Math.round : n;
  if (shape.kind === 'lens') {
    let { c1, c2 } = shape;
    if (area([shape.base, c1, shape.tip, c2]) < 0) [c1, c2] = [c2, c1];
    const { base, tip } = shape;
    return `M${q(base.x)} ${q(base.y)}Q${q(c1.x)} ${q(c1.y)} ${q(tip.x)} ${q(tip.y)}Q${q(c2.x)} ${q(c2.y)} ${q(base.x)} ${q(base.y)}Z`;
  }
  let pts = shape.pts;
  if (area(pts) < 0) pts = [...pts].reverse();
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(pts[pts.length - 1], pts[0]);
  let d = `M${q(start.x)} ${q(start.y)}`;
  for (let i = 0; i < pts.length; i += 1) {
    const m = mid(pts[i], pts[(i + 1) % pts.length]);
    d += `Q${q(pts[i].x)} ${q(pts[i].y)} ${q(m.x)} ${q(m.y)}`;
  }
  return `${d}Z`;
}

function cubic(p, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
}

// Ветка или ствол: кривая с сужением от основания к кончику.
// flare — расширение у самого основания (корневая шейка).
function limb(curve, w0, w1, steps = 12, flare = 0) {
  const left = []; const right = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = cubic(curve, Math.max(0, t - 0.02));
    const b = cubic(curve, Math.min(1, t + 0.02));
    const c = cubic(curve, t);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len; const ny = (b.x - a.x) / len;
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.75) + flare * Math.pow(1 - t, 6)) / 2;
    left.push({ x: c.x + nx * w, y: c.y + ny * w });
    right.push({ x: c.x - nx * w, y: c.y - ny * w });
  }
  return smooth([...left, curve[3], ...right.reverse()]);
}

function bentCurve(from, ang, len, bend) {
  const dx = Math.sin(rad(ang)); const dy = -Math.cos(rad(ang));
  const to = { x: from.x + dx * len, y: from.y + dy * len };
  const px = -dy; const py = dx;
  return [from,
    { x: from.x + dx * len * 0.33 + px * bend, y: from.y + dy * len * 0.33 + py * bend },
    { x: from.x + dx * len * 0.7 - px * bend * 0.5, y: from.y + dy * len * 0.7 - py * bend * 0.5 },
    to];
}

// --- листья пород --------------------------------------------------------

// Пальчатый лист инжира: три лопасти, полярный контур вокруг середины листа.
function figLeaf(base, ang, size) {
  const ca = Math.cos(rad(ang)); const sa = Math.sin(rad(ang));
  const dx = sa; const dy = -ca;
  const c = { x: base.x + dx * size * 0.55, y: base.y + dy * size * 0.55 };
  const pts = [];
  const N = 12;
  for (let i = 0; i < N; i += 1) {
    const th = (i / N) * Math.PI * 2;
    const lobes = Math.pow(Math.abs(Math.cos(1.5 * th)), 0.7);
    // К черешку лист сужается.
    const back = th > Math.PI * 0.75 && th < Math.PI * 1.25 ? 0.55 : 1;
    const r = size * (0.32 + 0.3 * lobes) * back;
    const lx = Math.sin(th) * r; const ly = -Math.cos(th) * r;
    pts.push({ x: c.x + lx * ca - ly * sa, y: c.y + lx * sa + ly * ca });
  }
  return { kind: 'smooth', int: true, pts };
}

const LEAF = {
  olive: (b, a, s) => lens(b, a, s * 1.25, s * 0.2),
  pomegranate: (b, a, s) => lens(b, a, s * 0.95, s * 0.3),
  sidr: (b, a, s) => lens(b, a, s * 0.75, s * 0.38),
  fig: (b, a, s) => figLeaf(b, a, s * 1.6),
};

// --- параметры лиственных пород -----------------------------------------
// trunk — длина ствола до первой развилки; spread — угол разведения веток;
// decay — укорочение каждого следующего яруса; kids — сколько веток даёт
// развилка; leaf — размер листа в точках холста; perTip — листьев на кончик;
// stems — число стволов от земли (гранат растёт кустом); depth — ярусы
// ветвления по стадиям.

const PARAMS = {
  olive: { trunk: 0.46, lean: -6, spread: 30, decay: 0.72, kids: [2, 3], curl: 10, leaf: 14, perTip: 7, fan: 150,
    width: 0.075, stems: 1, twist: true, depth: [0, 0, 0, 1, 2, 2, 3, 3], droop: 6, clump: 2.5, flat: 0.72 },
  fig: { trunk: 0.36, lean: 3, spread: 44, decay: 0.7, kids: [2, 3], curl: 6, leaf: 13, perTip: 4, fan: 170,
    width: 0.07, stems: 1, depth: [0, 0, 0, 1, 2, 2, 3, 3], droop: 0, clump: 2.6, flat: 0.7 },
  pomegranate: { trunk: 0.34, lean: 0, spread: 24, decay: 0.74, kids: [2, 3], curl: 8, leaf: 10, perTip: 6, fan: 200,
    width: 0.05, stems: 3, depth: [0, 0, 0, 1, 1, 2, 2, 2], droop: 0, clump: 2.4, flat: 0.9 },
  sidr: { trunk: 0.42, lean: -4, spread: 50, decay: 0.68, kids: [2, 3], curl: 14, leaf: 10, perTip: 7, fan: 190,
    width: 0.07, stems: 1, depth: [0, 0, 0, 1, 2, 3, 3, 3], droop: 3, clump: 2.6, flat: 0.58 },
};

// Скелет: ветки (с шириной) и кончики, на которых растут листья.
function skeleton(sp, stage) {
  const P = PARAMS[sp];
  const depth = P.depth[stage];
  const limbs = []; const tips = [];
  const unit = 100; // условная высота ствола; потом всё масштабируется
  function grow(id, from, ang, len, w, level) {
    const r = rng(`${sp}/${id}`);
    const bend = (r() - 0.5) * P.curl * (level === 0 ? 0.6 : 1);
    const curve = bentCurve(from, ang, len, bend);
    limbs.push({ curve, w0: w, w1: Math.max(0.9, w * 0.55), level });
    const end = curve[3];
    if (level >= depth) { tips.push({ at: end, ang, len, level, id }); return; }
    const count = P.kids[0] + Math.floor(r() * (P.kids[1] - P.kids[0] + 1));
    for (let k = 0; k < count; k += 1) {
      const t = count === 1 ? 0 : k / (count - 1) - 0.5;
      const childAng = ang * 0.55 + t * P.spread * 2 + (r() - 0.5) * 14;
      // Боковые ветки отходят чуть ниже конца родителя — так крона гуще.
      const along = level === 0 ? 1 : 0.82 + r() * 0.18;
      const start = cubic(curve, along);
      grow(`${id}/${k}`, start, childAng, len * P.decay * (0.85 + r() * 0.3), w * 0.62, level + 1);
    }
    // Короткие боковые побеги с листьями вдоль веток верхних ярусов.
    if (level >= depth - 1 && level > 0) {
      const side = r() > 0.5 ? 1 : -1;
      const start = cubic(curve, 0.5 + r() * 0.2);
      tips.push({ at: start, ang: ang + side * (40 + r() * 20), len: len * 0.4, level: level + 1, id: `${id}/s` });
    }
  }
  const stems = P.stems;
  for (let s = 0; s < stems; s += 1) {
    const off = stems === 1 ? 0 : (s / (stems - 1) - 0.5);
    const from = { x: BASE.x + off * 6, y: BASE.y };
    const ang = P.lean + off * 24;
    const len = unit * P.trunk * (stems === 1 ? 1 : 0.9 + (1 - Math.abs(off)) * 0.25);
    grow(`${s}`, from, ang, len, unit * P.width * (stems === 1 ? 1 : 0.6), 0);
  }
  return { limbs, tips };
}

function box(points) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// Земля под деревом: невысокий холмик и несколько травинок.
function ground(stage, key) {
  const r = rng(`ground/${key}`);
  const wide = 18 + stage * 6;
  const shapes = { mound: [], grass: [] };
  shapes.mound.push(smooth([
    { x: BASE.x - wide, y: BASE.y + 2 }, { x: BASE.x - wide * 0.55, y: BASE.y - 4 },
    { x: BASE.x, y: BASE.y - 6 }, { x: BASE.x + wide * 0.55, y: BASE.y - 4 },
    { x: BASE.x + wide, y: BASE.y + 2 }, { x: BASE.x, y: BASE.y + 5 },
  ]));
  const blades = 3 + Math.min(4, stage);
  for (let i = 0; i < blades; i += 1) {
    const side = i % 2 ? 1 : -1;
    const x = BASE.x + side * (wide * (0.35 + r() * 0.55));
    shapes.grass.push(lens({ x, y: BASE.y }, side * (8 + r() * 22), 7 + r() * 6, 1.1));
  }
  return shapes;
}

// --- сборка лиственного дерева ------------------------------------------

function emptyLayers() { return { back: [], limbs: [], mid: [], front: [], fruit: [] }; }

function leafy(sp, stage) {
  const P = PARAMS[sp];
  const layers = emptyLayers();
  const fruitEllipses = [];

  if (stage === 1 || stage === 2) {
    // Росток и побег: стебель и листья без кроны.
    const h = HEIGHT[stage];
    const r = rng(`${sp}/sprout`);
    const stem = bentCurve({ x: BASE.x, y: BASE.y }, 4, h * 0.82, -5);
    layers.limbs.push(limb(stem, stage === 1 ? 3 : 4, 1.4, 10));
    const top = stem[3];
    if (stage === 1) {
      // Две семядоли — округлые, не похожие на настоящие листья.
      layers.front.push(lens({ x: top.x, y: top.y + 2 }, -62, 15, 6), lens({ x: top.x, y: top.y + 1 }, 58, 15, 6));
      layers.mid.push(LEAF[sp](top, -4, 9));
    } else {
      const pairs = sp === 'fig' ? 2 : 3;
      for (let i = 0; i < pairs; i += 1) {
        const t = 0.45 + i * (0.5 / pairs);
        const at = cubic(stem, t);
        const size = sp === 'fig' ? 12 : 14 - i * 1.5;
        layers.front.push(LEAF[sp](at, -55 - r() * 15, size));
        layers.mid.push(LEAF[sp](at, 55 + r() * 15, size));
      }
      layers.front.push(LEAF[sp](top, (r() - 0.5) * 20, sp === 'fig' ? 11 : 12));
    }
    return { layers, fruitEllipses };
  }

  // Скелет в условных единицах → масштаб под высоту стадии.
  const { limbs, tips } = skeleton(sp, stage);
  const pts = limbs.flatMap(l => [l.curve[0], l.curve[3]]);
  const b = box(pts);
  const rawH = BASE.y - b.minY;
  // Крона добавит сверху примерно 1.3 листа — оставляем ей место.
  const leafPad = P.leaf * 1.3;
  const s = (HEIGHT[stage] - leafPad) / rawH;

  // Ширину здесь не ограничиваем: это делает fit(), сжимая только по горизонтали.
  const f = p => ({ x: BASE.x + (p.x - BASE.x) * s, y: BASE.y + (p.y - BASE.y) * s });

  limbs.forEach((l) => {
    const curve = l.curve.map(f);
    // Ширина масштабируется мягче длины: иначе тонкие ветки молодых стадий
    // исчезали бы совсем.
    const w0 = Math.max(1.4, l.w0 * s * 1.15);
    const w1 = Math.max(0.9, l.w1 * s * 1.15);
    layers.limbs.push(limb(curve, w0, w1, l.level === 0 ? 12 : 6, l.level === 0 ? w0 * 0.9 : 0));
    // Олива: витой ствол — вторая прядь поверх, чуть смещённая.
    if (P.twist && l.level === 0 && stage >= 4) {
      const strand = curve.map((p, i) => ({ x: p.x + (i === 1 ? 3 : i === 2 ? -3 : 0), y: p.y }));
      layers.mid.push(limb(strand, w0 * 0.45, w1 * 0.5, 14));
    }
  });
  // Корни у взрослых деревьев: короткие ответвления у земли.
  if (stage >= 4) {
    const r = rng(`${sp}/roots`);
    const tw = Math.max(2, limbs[0].w0 * s * 1.15);
    [-1, 1].forEach((side) => {
      const len = tw * (1.6 + r() * 0.6);
      layers.limbs.push(limb([{ x: BASE.x, y: BASE.y - tw * 0.4 },
        { x: BASE.x + side * len * 0.4, y: BASE.y - tw * 0.2 },
        { x: BASE.x + side * len * 0.8, y: BASE.y + 1 },
        { x: BASE.x + side * len, y: BASE.y + 2 }], tw * 0.55, 1, 8));
    });
  }

  // Массы листвы и вдоль веток последнего яруса: без них крона выглядела
  // пушистыми шариками на голых ветках.
  limbs.filter(l => l.level >= Math.max(1, P.depth[stage] - 1)).forEach((l, i) => {
    const r = rng(`${sp}/inner/${i}`);
    const c = f(cubic(l.curve, 0.55));
    const R = P.leaf * P.clump * 0.75 * (0.85 + r() * 0.3);
    layers.back.push(clump(c, R, r, P.flat));
  });

  // Массы листвы: большое бледное пятно и пятно поплотнее чуть выше.
  tips.forEach((tip) => {
    const r = rng(`${sp}/${tip.id}/clump`);
    const at = f(tip.at);
    const side = tip.level > P.depth[stage] ? 0.65 : 1;
    const R = P.leaf * P.clump * side * (0.85 + r() * 0.3);
    const out = { x: at.x + Math.sin(rad(tip.ang)) * R * 0.3, y: at.y - Math.cos(rad(tip.ang)) * R * 0.3 };
    layers.back.push(clump(out, R, r, P.flat));
    layers.mid.push(clump({ x: out.x + (r() - 0.5) * R * 0.4, y: out.y - R * 0.18 }, R * 0.66, r, P.flat));
  });

  // Листья: пучок на каждом кончике и вдоль последних веток.
  tips.forEach((tip) => {
    const r = rng(`${sp}/${tip.id}/leaves`);
    const at = f(tip.at);
    const count = Math.max(3, Math.round(P.perTip * (tip.level > P.depth[stage] ? 0.6 : 1)));
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const ang = tip.ang * 0.6 + t * P.fan + (r() - 0.5) * 24 + P.droop * Math.abs(t) * 4;
      // Листья сидят не в одной точке, а вдоль последнего отрезка ветки.
      const back = r() * P.leaf * 0.9;
      const base = { x: at.x - Math.sin(rad(tip.ang)) * back, y: at.y + Math.cos(rad(tip.ang)) * back };
      const size = P.leaf * (0.75 + r() * 0.45);
      const leaf = LEAF[sp](base, ang, size);
      const roll = r();
      (roll < 0.25 ? layers.mid : layers.front).push(leaf);
    }
  });

  // Плоды на двух последних стадиях: у взрослого — немного, у плодоносящего — много.
  if (stage >= 6) {
    const r = rng(`${sp}/fruit/${stage}`);
    const pool = tips.filter((_, i) => i % (stage === 6 ? 3 : 1) === 0);
    pool.forEach((tip) => {
      if (r() > (stage === 6 ? 0.6 : 0.85)) return;
      const at = f(tip.at);
      const x = at.x + (r() - 0.5) * P.leaf; const y = at.y + P.leaf * (0.2 + r() * 0.5);
      if (sp === 'pomegranate') {
        fruitEllipses.push({ t: 'e', cx: +n(x), cy: +n(y), rx: 5.5, ry: 5.2, o: 1 });
        layers.fruit.push(lens({ x, y: y - 4.5 }, 0, 3.4, 1.8)); // венчик
      } else if (sp === 'fig') {
        layers.fruit.push(smooth([{ x, y: y - 6 }, { x: x + 4, y: y + 1 }, { x, y: y + 5 }, { x: x - 4, y: y + 1 }]));
      } else if (sp === 'olive') {
        fruitEllipses.push({ t: 'e', cx: +n(x), cy: +n(y), rx: 2.2, ry: 3, o: 1 });
        fruitEllipses.push({ t: 'e', cx: +n(x + 4), cy: +n(y + 2), rx: 2.2, ry: 3, o: 1 });
      } else {
        fruitEllipses.push({ t: 'e', cx: +n(x), cy: +n(y), rx: 2.6, ry: 2.6, o: 1 });
      }
    });
  }
  return { layers, fruitEllipses };
}

// --- финиковая пальма ----------------------------------------------------

// Вайя: изогнутый черешок и перья-листочки по обе стороны, к концу короче.
function frond(from, ang, len, droop, out, density = 1) {
  const dx = Math.sin(rad(ang)); const dy = -Math.cos(rad(ang));
  const curve = [from,
    { x: from.x + dx * len * 0.35, y: from.y + dy * len * 0.35 },
    { x: from.x + dx * len * 0.75, y: from.y + dy * len * 0.6 + droop * 0.6 },
    { x: from.x + dx * len, y: from.y + dy * len * 0.55 + droop }];
  out.limbs.push(limb(curve, 2.6, 0.8, 10));
  const count = Math.round((len / 4.2) * density);
  for (let i = 1; i < count; i += 1) {
    const t = i / count;
    const a = cubic(curve, Math.max(0, t - 0.02)); const b2 = cubic(curve, Math.min(1, t + 0.02));
    const dir = (Math.atan2(b2.x - a.x, -(b2.y - a.y)) * 180) / Math.PI;
    const at = cubic(curve, t);
    const l = len * 0.32 * (1 - t * 0.6);
    // Листочки смотрят вперёд по ходу вайи под острым углом.
    out.front.push(lens(at, dir - 42, l, 1.3));
    out.mid.push(lens(at, dir + 42, l, 1.3));
  }
}

function palm(stage) {
  const layers = emptyLayers();
  const fruitEllipses = [];
  const r = rng(`palm/${stage}`);
  if (stage <= 3) {
    // Молодая пальма — пучок листьев прямо из земли, ствола ещё нет.
    const blades = [0, 1, 3, 5][stage];
    const len = [0, 34, 52, 74][stage];
    for (let i = 0; i < blades; i += 1) {
      const t = blades === 1 ? 0 : i / (blades - 1) - 0.5;
      const ang = t * 90 + (r() - 0.5) * 8;
      if (stage === 1) {
        layers.front.push(lens({ x: BASE.x, y: BASE.y }, 6, len, 3.4));
      } else {
        frond({ x: BASE.x, y: BASE.y - 2 }, ang, len * (1 - Math.abs(t) * 0.4), 6 + Math.abs(t) * 10, layers, 0.9);
      }
    }
    return { layers, fruitEllipses };
  }
  const h = HEIGHT[stage] - 52;
  const trunkCurve = bentCurve({ x: BASE.x, y: BASE.y }, -3, h, 6);
  const tw = 6 + stage * 1.7;
  layers.limbs.push(limb(trunkCurve, tw, tw * 0.75, 16, tw * 0.6));
  // Рубцы от опавших листьев — «чешуя» ствола.
  const rings = Math.round(h / 9);
  for (let i = 1; i < rings; i += 1) {
    const t = i / rings;
    const c = cubic(trunkCurve, t);
    const w = (tw - tw * 0.25 * t) * 0.5;
    layers.back.push(smooth([{ x: c.x - w, y: c.y + 1 }, { x: c.x, y: c.y - 2.6 }, { x: c.x + w, y: c.y + 1 }, { x: c.x, y: c.y - 0.6 }]));
  }
  const top = trunkCurve[3];
  const count = [0, 0, 0, 0, 7, 9, 11, 11][stage];
  const len = [0, 0, 0, 0, 58, 66, 74, 78][stage];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1) - 0.5;
    const ang = t * 210 + (r() - 0.5) * 10;
    const droop = 10 + Math.abs(t) * 46;
    frond(top, ang, len * (0.82 + (1 - Math.abs(t)) * 0.25), droop, layers);
  }
  // Сердцевина кроны.
  layers.front.push(smooth([{ x: top.x - 6, y: top.y + 2 }, { x: top.x, y: top.y - 7 }, { x: top.x + 6, y: top.y + 2 }, { x: top.x, y: top.y + 6 }]));
  if (stage >= 6) {
    // Гроздья фиников свисают из-под кроны.
    const bunches = stage === 6 ? 2 : 4;
    for (let k = 0; k < bunches; k += 1) {
      const side = k % 2 ? 1 : -1;
      const bx = top.x + side * (6 + k * 3); const by = top.y + 6;
      layers.limbs.push(limb([{ x: top.x, y: top.y + 2 }, { x: bx, y: by }, { x: bx + side * 2, y: by + 8 }, { x: bx + side * 3, y: by + 14 }], 1.6, 1, 6));
      for (let j = 0; j < 7; j += 1) {
        fruitEllipses.push({ t: 'e', cx: +n(bx + side * 3 + (r() - 0.5) * 9), cy: +n(by + 12 + r() * 12), rx: 2.1, ry: 2.8, o: 1 });
      }
    }
  }
  return { layers, fruitEllipses };
}

// Нулевая стадия у всех одна: зерно, наполовину ушедшее в землю, с первым
// кончиком ростка.
function seed() {
  const layers = emptyLayers();
  layers.front.push(smooth([{ x: BASE.x - 9, y: BASE.y - 4 }, { x: BASE.x - 7, y: BASE.y - 15 },
    { x: BASE.x + 2, y: BASE.y - 19 }, { x: BASE.x + 9, y: BASE.y - 12 }, { x: BASE.x + 9, y: BASE.y - 4 }, { x: BASE.x, y: BASE.y - 1 }]));
  layers.mid.push(lens({ x: BASE.x + 1, y: BASE.y - 17 }, 18, 9, 2.4));
  return { layers, fruitEllipses: [] };
}

// Подгонка под холст: после сборки фигура целиком (с кроной, плодами,
// массами листвы) масштабируется от корня так, чтобы влезть в высоту своей
// стадии и в ширину холста. Отдельные запасы «на крону» оказались хрупкими —
// любая правка листвы ломала проверку габаритов.
function fit(built, stage) {
  const all = [];
  Object.values(built.layers).forEach(list => list.forEach((sh) => {
    if (sh.kind === 'lens') all.push(sh.base, sh.tip, sh.c1, sh.c2); else all.push(...sh.pts);
  }));
  built.fruitEllipses.forEach(e => all.push({ x: e.cx - e.rx, y: e.cy - e.ry }, { x: e.cx + e.rx, y: e.cy + e.ry }));
  if (!all.length || stage === 0) return built;
  const b = box(all);
  const height = BASE.y - b.minY;
  const half = Math.max(BASE.x - b.minX, b.maxX - BASE.x);
  // Высота — строго под стадию (иначе широкая крона, ужатая целиком,
  // делала старшую стадию ниже младшей: дерево «усыхало»). Ширину, если
  // крона не влезает, ужимаем отдельно — она становится чуть уже, не ниже.
  const k = Math.min(1, HEIGHT[stage] / height);
  const kx = Math.min(k, (MAX_W / 2) / (half * 1));
  const f = p => ({ x: BASE.x + (p.x - BASE.x) * kx, y: BASE.y + (p.y - BASE.y) * k });
  Object.values(built.layers).forEach(list => list.forEach((sh, i) => {
    list[i] = sh.kind === 'lens'
      ? { ...sh, base: f(sh.base), tip: f(sh.tip), c1: f(sh.c1), c2: f(sh.c2) }
      : { ...sh, pts: sh.pts.map(f) };
  }));
  built.fruitEllipses.forEach((e) => {
    const c = f({ x: e.cx, y: e.cy });
    // Плоды остаются круглыми: общий масштаб — меньший из двух.
    const m = Math.min(k, kx);
    e.cx = +n(c.x); e.cy = +n(c.y); e.rx = +n(e.rx * m); e.ry = +n(e.ry * m);
  });
  return built;
}

// --- сборка в формат приложения -----------------------------------------
// Порядок слоёв: земля, дальние листья, ветви, средние листья, ближние
// листья, плоды. Прозрачность и есть глубина: один цвет схемы на всё.

const OPACITY = { mound: 0.22, grass: 0.4, back: 0.3, limbs: 0.9, mid: 0.5, front: 0.88, fruit: 1 };

function assemble(key, stage, built) {
  const g = ground(stage, key);
  const out = [];
  const push = (list, o) => {
    if (!list.length) return;
    out.push({ t: 'p', d: list.map(serialize).join(''), o });
  };
  push(g.mound, OPACITY.mound);
  push(g.grass, OPACITY.grass);
  push(built.layers.back, OPACITY.back);
  push(built.layers.limbs, OPACITY.limbs);
  push(built.layers.mid, OPACITY.mid);
  push(built.layers.front, OPACITY.front);
  push(built.layers.fruit, OPACITY.fruit);
  out.push(...built.fruitEllipses);
  return out;
}

const SPECIES = ['olive', 'date_palm', 'pomegranate', 'fig', 'sidr'];

// Габариты фигуры. Нужны дважды: проверить, что рисунок влез в холст, и
// показать маленькие стадии крупно на карточке входа — зерно во весь холст
// занимает три точки и выглядит пустым местом.
const MARGIN = 4;

function boundsOf(shapes) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (x, y) => {
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  };
  for (const s of shapes) {
    if (s.t === 'e') {
      hit(s.cx - s.rx, s.cy - s.ry); hit(s.cx + s.rx, s.cy + s.ry);
    } else {
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

const DATA = {};
const BOUNDS = {};
for (const s of SPECIES) {
  DATA[s] = [];
  BOUNDS[s] = [];
  for (let stage = 0; stage < 8; stage += 1) {
    const built = fit(stage === 0 ? seed() : s === 'date_palm' ? palm(stage) : leafy(s, stage), stage);
    DATA[s].push(assemble(`${s}/${stage}`, stage, built));
    const b = boundsOf(DATA[s][stage]);
    const { minX, minY, maxX, maxY } = b.raw;
    if (minX < 0 || minY < 0 || maxX > W || maxY > H) {
      throw new Error(`${s}, стадия ${stage}: рисунок вышел за холст — `
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
