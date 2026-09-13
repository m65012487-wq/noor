// Пять стадий оливы для прототипа сада.
//
// Рисунки генерируются, а не рисуются вручную: у взрослого дерева сотни
// листьев, и расставлять их руками значит получить либо ровный узор,
// либо неделю работы. Случайность детерминированная — у каждой стадии своё
// зерно, поэтому повторный запуск даёт те же самые файлы.
//
// Все стадии в одном viewBox и с одной точкой основания ствола: экран
// меняет картинки на месте, и растение не должно прыгать при смене.
//
// Запуск из корня проекта: node scripts/garden/olive.js
// Пишет assets/garden/plants/olive/*.svg и src/garden/oliveStages.js —
// SVG-файлы остаются исходником, а модуль нужен потому, что Metro без
// отдельного трансформера не импортирует .svg, и ради пяти картинок
// заводить зависимость незачем.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_SVG = path.join(ROOT, 'assets', 'garden', 'plants', 'olive');
const OUT_JS = path.join(ROOT, 'src', 'garden', 'oliveStages.js');

const W = 240;
const H = 280;
const BASE = { x: 120, y: 252 };

// Палитра из задания: приглушённые зелёные, тёплый коричневый, камень.
const C = {
  shadow: '#4A5240',
  soil: '#8B7763',
  soilDark: '#76644F',
  pebble: '#A7A39A',
  pit: '#6E5641',
  pitLight: '#957B61',
  pitLine: '#5A4636',
  stem: '#7C8A5E',
  bark: '#6B5746',
  barkLight: '#7E6853',
  barkLine: '#56453A',
  leafBack: '#56654A',
  leafMid: '#7F9068',
  leafSage: '#9CAB86',
  leafSilver: '#BAC3AA',
  leafUnder: '#CBCFBC',
};

// ---------- утилиты ----------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v) => {
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};
const pt = (p) => `${n(p.x)} ${n(p.y)}`;

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

// Сглаженный замкнутый контур через середины отрезков: ломаная из
// выборки кривой превращается в плавную линию без видимых изломов.
function smoothClosed(pts) {
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let d = `M${pt(mid(pts[pts.length - 1], pts[0]))}`;
  for (let i = 0; i < pts.length; i += 1) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    d += `Q${pt(cur)} ${pt(mid(cur, next))}`;
  }
  return `${d}Z`;
}

// Ветка или ствол: кривая Безье с сужающейся толщиной. Кончик скруглён
// одной точкой на оси, иначе ветка обрывается срезом.
function limb(p, w0, w1, steps = 18) {
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = cubic(p[0], p[1], p[2], p[3], Math.max(0, t - 0.01));
    const b = cubic(p[0], p[1], p[2], p[3], Math.min(1, t + 0.01));
    const c = cubic(p[0], p[1], p[2], p[3], t);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.8)) / 2;
    left.push({ x: c.x + nx * w, y: c.y + ny * w });
    right.push({ x: c.x - nx * w, y: c.y - ny * w });
  }
  const tip = p[3];
  return smoothClosed([...left, tip, ...right.reverse()]);
}

// Лист оливы: узкий, заострённый с обоих концов, шире всего посередине.
function leaf(x, y, angle, len, widthRatio = 0.15) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;
  const w = len * widthRatio;
  const at = (k, s) => ({ x: x + dx * len * k + nx * w * s, y: y + dy * len * k + ny * w * s });
  const tip = { x: x + dx * len, y: y + dy * len };
  return `M${n(x)} ${n(y)}C${pt(at(0.25, 1.1))} ${pt(at(0.7, 1))} ${pt(tip)}`
    + `C${pt(at(0.7, -1))} ${pt(at(0.25, -1.1))} ${n(x)} ${n(y)}Z`;
}

function ellipse(cx, cy, rx, ry, fill, extra = '') {
  return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${extra}/>`;
}

const shape = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;

// Мягкая тень под растением: два эллипса вместо размытия — фильтры
// react-native-svg рендерит не везде одинаково.
function shadow(rx) {
  return ellipse(BASE.x, BASE.y + 2, rx, rx * 0.17, C.shadow, ' fill-opacity="0.10"')
    + ellipse(BASE.x, BASE.y + 2, rx * 0.62, rx * 0.11, C.shadow, ' fill-opacity="0.12"');
}

// ---------- крона ----------

// Группа листьев вокруг кончика ветки. Листья смотрят наружу от центра
// группы с разбросом, поэтому силуэт получается неровным, как у живого
// дерева, а не шаром. Тон зависит от положения: свет сверху слева.
function crown(clusters, seed, box) {
  const r = rng(seed);
  const layers = { back: [], mid: [], sage: [], silver: [], under: [] };
  for (const cl of clusters) {
    for (let i = 0; i < cl.n; i += 1) {
      const ang = r() * Math.PI * 2;
      const dist = Math.sqrt(r());
      const x = cl.x + Math.cos(ang) * cl.rx * dist;
      const y = cl.y + Math.sin(ang) * cl.ry * dist;
      // Направление листа: наружу от центра, с уклоном вверх и случайным поворотом.
      let dir = Math.atan2(y - cl.y - cl.ry * 0.5, x - cl.x);
      dir += (r() - 0.5) * 1.3;
      const len = cl.len[0] + r() * (cl.len[1] - cl.len[0]);
      const d = leaf(x, y, dir, len, 0.13 + r() * 0.04);

      const v = (y - box.top) / (box.bottom - box.top);
      const h = (x - box.left) / (box.right - box.left);
      const light = (1 - v) * 0.6 + (1 - h) * 0.25 + r() * 0.45;
      if (r() < 0.3) layers.back.push(d);
      else if (r() < 0.05) layers.under.push(d);
      else if (light > 0.85) layers.silver.push(d);
      else if (light > 0.55) layers.sage.push(d);
      else layers.mid.push(d);
    }
  }
  return {
    back: shape(layers.back.join(''), C.leafBack),
    front: shape(layers.mid.join(''), C.leafMid)
      + shape(layers.sage.join(''), C.leafSage)
      + shape(layers.silver.join(''), C.leafSilver)
      + (layers.under.length ? shape(layers.under.join(''), C.leafUnder) : ''),
  };
}

// ---------- стадии ----------

function seedStage() {
  const cx = 118;
  const cy = 245;
  const rot = -18;
  const tf = ` transform="rotate(${rot} ${cx} ${cy})"`;
  return [
    shadow(26),
    // Холмик рыхлой земли, в который положена косточка.
    shape(`M${BASE.x - 30} ${BASE.y + 2}C${BASE.x - 20} ${BASE.y - 9} ${BASE.x + 18} ${BASE.y - 11} ${BASE.x + 30} ${BASE.y + 2}Z`, C.soil),
    // Косточка оливы: вытянутый овал с продольной бороздкой и бликом.
    `<g${tf}>`
      + ellipse(cx, cy, 10, 6, C.pit)
      + ellipse(cx - 2, cy - 2.2, 5.5, 1.8, C.pitLight, ' fill-opacity="0.7"')
      + `<path d="M${cx - 8} ${cy + 0.8}Q${cx} ${cy + 2.6} ${cx + 8} ${cy + 0.4}" fill="none" stroke="${C.pitLine}" stroke-width="0.9" stroke-linecap="round"/>`
      + '</g>',
    // Земля, присыпавшая низ косточки: без неё семя лежит на холмике, а не в нём.
    shape(`M${BASE.x - 22} ${BASE.y + 1}C${BASE.x - 12} ${BASE.y - 5} ${BASE.x + 6} ${BASE.y - 6} ${BASE.x + 22} ${BASE.y + 1}Z`, C.soilDark),
    ellipse(BASE.x - 16, BASE.y - 1, 1.6, 1.2, C.pebble),
    ellipse(BASE.x + 19, BASE.y - 0.5, 1.2, 0.9, C.pebble),
  ].join('');
}

function sproutStage() {
  const stemTop = { x: 123, y: 212 };
  const parts = [
    shadow(20),
    shape(`M${BASE.x - 22} ${BASE.y + 2}C${BASE.x - 14} ${BASE.y - 5} ${BASE.x + 14} ${BASE.y - 6} ${BASE.x + 22} ${BASE.y + 2}Z`, C.soil),
    // Половинка расколотой косточки рядом с ростком.
    `<path d="M${BASE.x + 9} ${BASE.y - 1}Q${BASE.x + 14} ${BASE.y - 7} ${BASE.x + 19} ${BASE.y - 2}Z" fill="${C.pit}"/>`,
    shape(limb([{ x: 120, y: 250 }, { x: 117, y: 236 }, { x: 125, y: 226 }, stemTop], 2.6, 1.5), C.stem),
    // Семядоли шире настоящих листьев — так росток и узнаётся.
    shape(leaf(stemTop.x, stemTop.y + 1, -Math.PI * 0.86, 17, 0.27), C.leafSage),
    shape(leaf(stemTop.x, stemTop.y + 1, -Math.PI * 0.16, 16, 0.27), C.leafMid),
    // Первая пара настоящих листьев только проклюнулась.
    shape(leaf(stemTop.x, stemTop.y, -Math.PI * 0.58, 8, 0.18)
      + leaf(stemTop.x, stemTop.y, -Math.PI * 0.42, 7.5, 0.18), C.leafSilver),
    ellipse(BASE.x - 15, BASE.y - 0.5, 1.4, 1, C.pebble),
  ];
  return parts.join('');
}

function youngStage() {
  const stem = [{ x: 120, y: 251 }, { x: 122, y: 222 }, { x: 113, y: 196 }, { x: 117, y: 166 }];
  const twig = [{ x: 118, y: 202 }, { x: 126, y: 197 }, { x: 134, y: 192 }, { x: 142, y: 184 }];
  const back = [];
  const front = [];
  const silver = [];
  // Листья у оливы супротивные: парами из одного узла.
  const pairAlong = (p, ts, len0, len1, spread, into) => {
    ts.forEach((t, i) => {
      const a = cubic(p[0], p[1], p[2], p[3], t - 0.01);
      const b = cubic(p[0], p[1], p[2], p[3], t + 0.01);
      const c = cubic(p[0], p[1], p[2], p[3], t);
      const dir = Math.atan2(b.y - a.y, b.x - a.x);
      const len = len0 + (len1 - len0) * (i / Math.max(1, ts.length - 1));
      const s = spread - i * 0.06;
      (i % 2 ? into[0] : into[1]).push(leaf(c.x, c.y, dir - s, len));
      (i % 2 ? into[1] : into[0]).push(leaf(c.x, c.y, dir + s, len * 0.95));
    });
  };
  pairAlong(stem, [0.42, 0.56, 0.69, 0.81, 0.92], 19, 12, 1.0, [front, back]);
  pairAlong(twig, [0.45, 0.8], 13, 10, 0.9, [silver, front]);
  const top = stem[3];
  silver.push(leaf(top.x, top.y + 1, -Math.PI * 0.6, 9, 0.16), leaf(top.x, top.y + 1, -Math.PI * 0.4, 8, 0.16));

  return [
    shadow(26),
    shape(`M${BASE.x - 16} ${BASE.y + 2}C${BASE.x - 9} ${BASE.y - 3} ${BASE.x + 9} ${BASE.y - 3} ${BASE.x + 16} ${BASE.y + 2}Z`, C.soil),
    shape(back.join(''), C.leafBack),
    shape(limb(stem, 3.6, 1.2), C.barkLight),
    shape(limb(twig, 1.5, 0.8), C.barkLight),
    shape(front.join(''), C.leafMid),
    shape(silver.join(''), C.leafSage),
  ].join('');
}

function youngTreeStage() {
  const trunk = [{ x: 120, y: 252 }, { x: 116, y: 218 }, { x: 125, y: 186 }, { x: 119, y: 150 }];
  const branches = [
    [[{ x: 120, y: 176 }, { x: 108, y: 160 }, { x: 96, y: 140 }, { x: 84, y: 118 }], 3, 1],
    [[{ x: 120, y: 164 }, { x: 134, y: 150 }, { x: 146, y: 130 }, { x: 156, y: 108 }], 2.8, 1],
    [[{ x: 119, y: 152 }, { x: 118, y: 130 }, { x: 125, y: 112 }, { x: 121, y: 88 }], 3, 1],
    [[{ x: 121, y: 196 }, { x: 132, y: 186 }, { x: 142, y: 178 }, { x: 150, y: 170 }], 1.6, 0.7],
  ];
  const clusters = [
    { x: 84, y: 112, rx: 22, ry: 14, n: 34, len: [9, 13] },
    { x: 157, y: 102, rx: 22, ry: 14, n: 34, len: [9, 13] },
    { x: 121, y: 82, rx: 20, ry: 16, n: 40, len: [9, 13] },
    { x: 104, y: 132, rx: 12, ry: 9, n: 14, len: [8, 12] },
    { x: 140, y: 128, rx: 11, ry: 8, n: 12, len: [8, 12] },
    { x: 152, y: 168, rx: 9, ry: 6, n: 9, len: [8, 11] },
    // Листья и по длине веток, а не только на кончиках: иначе крона
    // висит отдельными шапками над голыми прутьями.
    { x: 96, y: 140, rx: 9, ry: 8, n: 10, len: [8, 11] },
    { x: 146, y: 132, rx: 9, ry: 8, n: 10, len: [8, 11] },
    { x: 122, y: 112, rx: 10, ry: 10, n: 14, len: [8, 12] },
  ];
  const cr = crown(clusters, 11, { top: 60, bottom: 175, left: 60, right: 180 });
  return [
    shadow(50),
    cr.back,
    ...branches.map(([p, w0, w1]) => shape(limb(p, w0, w1), C.bark)),
    shape(limb(trunk, 7, 3.2), C.bark),
    // Светлая грань ствола со стороны света.
    shape(limb([{ x: 118, y: 246 }, { x: 114, y: 216 }, { x: 122, y: 188 }, { x: 117, y: 158 }], 1.6, 0.6), C.barkLight),
    cr.front,
  ].join('');
}

function matureStage() {
  // Ствол из двух переплетённых жил — так выглядит старая олива.
  const strandA = [{ x: 108, y: 253 }, { x: 127, y: 214 }, { x: 107, y: 180 }, { x: 117, y: 140 }];
  const strandB = [{ x: 134, y: 253 }, { x: 115, y: 214 }, { x: 130, y: 178 }, { x: 122, y: 140 }];
  const branches = [
    [[{ x: 116, y: 150 }, { x: 94, y: 134 }, { x: 72, y: 122 }, { x: 44, y: 104 }], 6, 1.4],
    [[{ x: 116, y: 144 }, { x: 102, y: 118 }, { x: 88, y: 96 }, { x: 74, y: 66 }], 5, 1.3],
    [[{ x: 120, y: 142 }, { x: 128, y: 112 }, { x: 114, y: 80 }, { x: 118, y: 42 }], 5.5, 1.3],
    [[{ x: 122, y: 144 }, { x: 142, y: 116 }, { x: 156, y: 96 }, { x: 166, y: 62 }], 5, 1.3],
    [[{ x: 123, y: 152 }, { x: 150, y: 140 }, { x: 172, y: 128 }, { x: 198, y: 108 }], 6, 1.4],
    [[{ x: 72, y: 122 }, { x: 64, y: 110 }, { x: 60, y: 96 }, { x: 58, y: 82 }], 2, 0.8],
    [[{ x: 158, y: 132 }, { x: 170, y: 118 }, { x: 180, y: 100 }, { x: 186, y: 82 }], 2, 0.8],
  ];
  // Крона компактная, но с просветами и неровным краем: группы разного
  // размера, справа выше, чем слева.
  const clusters = [
    { x: 42, y: 100, rx: 22, ry: 15, n: 42, len: [9, 13] },
    { x: 60, y: 76, rx: 20, ry: 16, n: 40, len: [9, 13] },
    { x: 80, y: 58, rx: 22, ry: 16, n: 44, len: [9, 13] },
    { x: 116, y: 38, rx: 24, ry: 16, n: 50, len: [9, 13] },
    { x: 100, y: 64, rx: 18, ry: 14, n: 32, len: [9, 13] },
    { x: 140, y: 58, rx: 20, ry: 16, n: 40, len: [9, 13] },
    { x: 168, y: 56, rx: 22, ry: 17, n: 44, len: [9, 13] },
    { x: 188, y: 80, rx: 20, ry: 15, n: 38, len: [9, 13] },
    { x: 200, y: 104, rx: 18, ry: 13, n: 32, len: [9, 12] },
    { x: 118, y: 88, rx: 26, ry: 16, n: 46, len: [9, 13] },
    { x: 78, y: 112, rx: 20, ry: 11, n: 30, len: [8, 12] },
    { x: 162, y: 116, rx: 22, ry: 11, n: 30, len: [8, 12] },
    { x: 96, y: 96, rx: 12, ry: 10, n: 16, len: [8, 12] },
    { x: 146, y: 90, rx: 14, ry: 10, n: 18, len: [8, 12] },
  ];
  const cr = crown(clusters, 21, { top: 18, bottom: 128, left: 20, right: 220 });
  const barkLines = [
    'M114 246C124 226 118 208 110 192',
    'M128 244C120 222 126 204 131 186',
    'M112 176C109 164 114 152 117 144',
  ].map((d) => `<path d="${d}" fill="none" stroke="${C.barkLine}" stroke-width="1" stroke-linecap="round" stroke-opacity="0.55"/>`).join('');
  return [
    shadow(82),
    cr.back,
    ...branches.map(([p, w0, w1]) => shape(limb(p, w0, w1), C.bark)),
    // Прикорневое утолщение: у старого дерева ствол расходится у земли.
    shape(`M96 254C108 250 112 238 114 226L130 226C132 238 138 250 150 254Z`, C.bark),
    shape(limb(strandB, 12, 7), C.barkLight),
    shape(limb(strandA, 13, 7), C.bark),
    barkLines,
    cr.front,
  ].join('');
}

// ---------- запись ----------

const STAGES = [
  { id: 'seed', file: 'olive_seed.svg', build: seedStage },
  { id: 'sprout', file: 'olive_sprout.svg', build: sproutStage },
  { id: 'young', file: 'olive_young.svg', build: youngStage },
  { id: 'tree_young', file: 'olive_tree_young.svg', build: youngTreeStage },
  { id: 'tree_mature', file: 'olive_tree_mature.svg', build: matureStage },
];

fs.mkdirSync(OUT_SVG, { recursive: true });
fs.mkdirSync(path.dirname(OUT_JS), { recursive: true });

const entries = STAGES.map((s) => {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s.build()}</svg>`;
  fs.writeFileSync(path.join(OUT_SVG, s.file), `${xml}\n`);
  console.log(`${s.file}: ${(xml.length / 1024).toFixed(1)} KB`);
  return { id: s.id, xml };
});

const js = `// Сгенерировано scripts/garden/olive.js — не править вручную.
// Исходники: assets/garden/plants/olive/*.svg.
// Metro не импортирует .svg без трансформера, поэтому разметка встроена строками.

export const OLIVE_VIEWBOX = { width: ${W}, height: ${H} };

export const OLIVE_STAGES = [
${entries.map((e) => `  { id: '${e.id}', xml: ${JSON.stringify(e.xml)} },`).join('\n')}
];
`;
fs.writeFileSync(OUT_JS, js);
console.log(`src/garden/oliveStages.js: ${(js.length / 1024).toFixed(1)} KB`);
