// Генератор векторных обоев с глубиной.
//
//   node scripts/scenes/build.js
//
// Сцены рисуются белым по прозрачному фону, а цвет задаётся в приложении
// через tintColor. Поэтому одна картинка работает со всеми цветовыми
// схемами, а глубина держится не на цвете, а на прозрачности слоёв.
//
// Объём даёт воздушная перспектива: дальние планы бледнее, выше по кадру
// и проще по форме; ближние плотнее, ниже и детальнее. Тот же приём, каким
// на гравюрах показывают дымку над горами.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', '..', 'assets', 'scenes');
const W = 900;
const H = 1950;

// Купол на высоком барабане. Барабан нужен не для красоты: без него купол
// тонет в гряде холмов и читается просто бугром.
function dome(cx, baseY, r, spire = true) {
  const drum = r * 0.9;
  const rise = r * 1.05;
  let out = `<path d="M ${cx - r} ${baseY} L ${cx - r} ${baseY - drum} `
    + `A ${r} ${rise} 0 0 1 ${cx + r} ${baseY - drum} L ${cx + r} ${baseY} Z"/>`;
  if (spire) {
    const tipY = baseY - drum - rise;
    out += `<rect x="${cx - r * 0.045}" y="${tipY - r * 0.4}" width="${r * 0.09}" height="${r * 0.4}"/>`;
    out += `<circle cx="${cx}" cy="${tipY - r * 0.45}" r="${r * 0.1}"/>`;
  }
  return out;
}

// Минарет: сужающийся ствол, галерея и крупное луковичное навершие.
//
// Форма подбиралась четырежды. Треугольный шатёр читался копьём; купольный
// верх шире балкона — грибом; тонкий балкон с маленьким навершием на дальних
// планах складывался в крест — в приложении про намаз это недопустимо.
//
// Против креста работают три вещи разом: у галереи есть высота, а не одна
// линия; ниже неё идёт второй поясок, поэтому горизонталь не одна; навершие
// крупное и явно луковичное, так что вертикаль заканчивается куполом.
function minaret(x, baseY, h, w) {
  const topY = baseY - h;
  const galW = w * 1.34;
  const galH = h * 0.075;
  const galY = topY + h * 0.30;
  const beltY = galY + h * 0.13;
  const capW = w * 0.98;
  const capH = w * 2.2;
  const capBase = galY - galH;

  // Ствол сужается кверху: прямая труба читается столбом, а не башней.
  const shaft = `<path d="M ${x - w * 0.62} ${baseY} L ${x - w * 0.44} ${galY} `
    + `L ${x + w * 0.44} ${galY} L ${x + w * 0.62} ${baseY} Z"/>`;
  const gallery = `<rect x="${x - galW}" y="${galY - galH}" width="${galW * 2}" height="${galH}"/>`;
  const belt = `<rect x="${x - w * 0.72}" y="${beltY}" width="${w * 1.44}" height="${h * 0.022}"/>`;
  // Верхний ярус между галереей и куполом — он же цоколь навершия.
  const drum = `<rect x="${x - capW * 0.62}" y="${capBase - capH * 0.16}" `
    + `width="${capW * 1.24}" height="${capH * 0.16}"/>`;
  const cap = `<path d="M ${x - capW} ${capBase - capH * 0.16} `
    + `Q ${x - capW * 1.02} ${capBase - capH * 0.78} ${x} ${capBase - capH} `
    + `Q ${x + capW * 1.02} ${capBase - capH * 0.78} ${x + capW} ${capBase - capH * 0.16} Z"/>`;
  const finial = `<circle cx="${x}" cy="${capBase - capH - h * 0.028}" r="${w * 0.2}"/>`;

  return shaft + belt + gallery + drum + cap + finial;
}

// Гряда холмов: пологая синусоида, замкнутая до низа кадра.
function ridge(baseY, amp, period, phase) {
  const step = 8;
  let d = `M 0 ${H} L 0 ${baseY}`;
  for (let x = 0; x <= W; x += step) {
    const y = baseY - Math.sin((x / period + phase) * Math.PI * 2) * amp
      - Math.sin((x / (period * 0.37) + phase) * Math.PI * 2) * amp * 0.25;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `<path d="${d} L ${W} ${H} Z"/>`;
}

// Звёзды: разреженные точки с разной яркостью и предсказуемым разбросом,
// чтобы пересборка давала ту же картинку.
function stars(count, maxY, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const x = rnd() * W;
    const y = rnd() * maxY;
    const r = 0.8 + rnd() * 1.8;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" opacity="${(0.2 + rnd() * 0.5).toFixed(2)}"/>`;
  }
  return out;
}

// --- помощники сцен «горы», «оазис», «сад», «мечеть у воды» ---------------

// Детерминированная случайность: пересборка даёт ту же картинку.
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

// Горный хребет: ломаная из вершин и седловин, замкнутая до низа кадра.
// Возвращает путь и вершины — по ним кладутся снежные шапки.
function range(baseY, count, minH, maxH, seed) {
  const rnd = seeded(seed);
  const pts = [{ x: -40, y: baseY }];
  const step = (W + 80) / count;
  const tops = [];
  for (let i = 0; i < count; i += 1) {
    const x = -40 + step * (i + 0.5) + (rnd() - 0.5) * step * 0.4;
    const h = minH + rnd() * (maxH - minH);
    // Между вершинами — седловина с парой изломов: гладкий зубец читался пилой.
    const saddle = baseY - h * (0.25 + rnd() * 0.2);
    pts.push({ x: x - step * 0.32, y: saddle + (rnd() - 0.5) * 18 });
    pts.push({ x: x - step * 0.12, y: baseY - h * (0.7 + rnd() * 0.15) });
    pts.push({ x, y: baseY - h });
    pts.push({ x: x + step * 0.14, y: baseY - h * (0.78 + rnd() * 0.1) });
    tops.push({ x, y: baseY - h, h, w: step });
  }
  pts.push({ x: W + 40, y: baseY });
  const d = `M -40 ${H} ` + pts.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ` L ${W + 40} ${H} Z`;
  return { path: `<path d="${d}"/>`, tops };
}

// Снежная шапка: неровный «воротник» под вершиной.
function snowcaps(tops, depth, seed) {
  const rnd = seeded(seed);
  return tops.map((t) => {
    const dh = t.h * depth;
    const w = t.w * 0.22 * (0.8 + rnd() * 0.4);
    const y2 = t.y + dh;
    return `<path d="M ${t.x} ${t.y} L ${t.x - w} ${y2} L ${t.x - w * 0.55} ${y2 - dh * 0.25} `
      + `L ${t.x - w * 0.2} ${y2 + dh * 0.1} L ${t.x + w * 0.15} ${y2 - dh * 0.3} L ${t.x + w * 0.5} ${y2 + dh * 0.05} `
      + `L ${t.x + w * 0.8} ${y2 - dh * 0.15} Z"/>`;
  }).join('');
}

// Ель: ярусы треугольников на тонком стволе.
function pine(x, baseY, h) {
  const w = h * 0.32;
  let out = `<rect x="${x - h * 0.025}" y="${baseY - h * 0.16}" width="${h * 0.05}" height="${h * 0.16}"/>`;
  for (let i = 0; i < 4; i += 1) {
    const top = baseY - h + i * h * 0.2;
    const bot = top + h * 0.38;
    const ww = w * (0.45 + i * 0.2);
    out += `<path d="M ${x} ${top} L ${x - ww} ${bot} L ${x + ww} ${bot} Z"/>`;
  }
  return out;
}

// Кипарис: высокое узкое «пламя».
function cypress(x, baseY, h, w) {
  return `<path d="M ${x} ${baseY - h} Q ${x + w * 0.9} ${baseY - h * 0.55} ${x + w * 0.55} ${baseY - h * 0.08} `
    + `L ${x + w * 0.12} ${baseY} L ${x - w * 0.12} ${baseY} L ${x - w * 0.55} ${baseY - h * 0.08} `
    + `Q ${x - w * 0.9} ${baseY - h * 0.55} ${x} ${baseY - h} Z"/>`;
}

// Круглый куст.
function shrub(x, baseY, r) {
  return `<path d="M ${x - r} ${baseY} Q ${x - r * 1.05} ${baseY - r * 1.2} ${x - r * 0.3} ${baseY - r * 1.25} `
    + `Q ${x} ${baseY - r * 1.7} ${x + r * 0.4} ${baseY - r * 1.2} Q ${x + r * 1.1} ${baseY - r * 1.1} ${x + r} ${baseY} Z"/>`;
}

// Финиковая пальма: изогнутый сужающийся ствол и веер листьев.
function palmTree(x, baseY, h, lean, seed) {
  const rnd = seeded(seed);
  const tx = x + lean; const ty = baseY - h;
  const w0 = h * 0.045; const w1 = h * 0.025;
  let out = `<path d="M ${x - w0} ${baseY} Q ${x + lean * 0.2 - w0} ${baseY - h * 0.5} ${tx - w1} ${ty} `
    + `L ${tx + w1} ${ty} Q ${x + lean * 0.2 + w0} ${baseY - h * 0.5} ${x + w0} ${baseY} Z"/>`;
  // Вайя — черешок дугой и перья-листочки по обе стороны, к концу короче:
  // сплошной лепесток на таком размере читался перьями страуса, не пальмой.
  const fronds = 9;
  for (let i = 0; i < fronds; i += 1) {
    const a = ((-150 + (i / (fronds - 1)) * 300 + (rnd() - 0.5) * 14) * Math.PI) / 180;
    const len = h * (0.42 + rnd() * 0.12);
    const droop = Math.abs(Math.sin(a)) * len * 0.5;
    const ex = tx + Math.sin(a) * len; const ey = ty - Math.cos(a) * len * 0.55 + droop;
    const cx = tx + Math.sin(a) * len * 0.55; const cy = ty - Math.cos(a) * len * 0.5 - len * 0.14;
    const at = (t) => ({
      x: (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex,
      y: (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey,
    });
    const rw = Math.max(1.2, h * 0.006);
    out += `<path d="M ${tx} ${ty - rw} Q ${cx} ${cy - rw} ${ex} ${ey} Q ${cx} ${cy + rw} ${tx} ${ty + rw} Z"/>`;
    const leaflets = 11;
    for (let k = 1; k < leaflets; k += 1) {
      const t = k / leaflets;
      const p0 = at(t); const p1 = at(Math.min(1, t + 0.02));
      const dir = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const l = len * 0.24 * (1 - t * 0.65);
      const w = l * 0.16;
      for (const side of [-1, 1]) {
        const ang = dir + side * 0.95;
        const tipx = p0.x + Math.cos(ang) * l; const tipy = p0.y + Math.sin(ang) * l + l * 0.25;
        const nx = -Math.sin(ang) * w; const ny = Math.cos(ang) * w;
        const mx = (p0.x + tipx) / 2; const my = (p0.y + tipy) / 2;
        out += `<path d="M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${tipx.toFixed(1)} ${tipy.toFixed(1)} `
          + `Q ${(mx - nx).toFixed(1)} ${(my - ny).toFixed(1)} ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Z"/>`;
      }
    }
  }
  out += `<circle cx="${tx}" cy="${ty}" r="${h * 0.035}"/>`;
  return out;
}

// Мечеть: главный купол на барабане, два малых купола и пара минаретов.
function mosque(cx, baseY, s) {
  return `<rect x="${cx - 150 * s}" y="${baseY - 70 * s}" width="${300 * s}" height="${70 * s}"/>`
    + dome(cx, baseY - 70 * s, 78 * s)
    + dome(cx - 112 * s, baseY - 70 * s, 34 * s) + dome(cx + 112 * s, baseY - 70 * s, 34 * s)
    + minaret(cx - 190 * s, baseY, 300 * s, 16 * s) + minaret(cx + 190 * s, baseY, 300 * s, 16 * s);
}

// Отражение в воде: та же фигура вверх ногами, порезанная штрихами ряби.
function reflection(body, axisY, id) {
  let ripples = '';
  for (let y = axisY; y < H; y += 9) ripples += `<rect x="0" y="${y}" width="${W}" height="5" fill="#fff"/>`;
  return `<mask id="${id}"><rect width="${W}" height="${H}" fill="#000"/>${ripples}</mask>`
    + `<g mask="url(#${id})"><g transform="translate(0 ${axisY * 2}) scale(1 -1)">${body}</g></g>`;
}

// Полумесяц маской: разность двух кругов.
function crescentMoon(cx, cy, r, id) {
  return `<mask id="${id}"><rect width="${W}" height="${H}" fill="#000"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>`
    + `<circle cx="${cx + r * 0.42}" cy="${cy - r * 0.2}" r="${r * 0.88}" fill="#000"/></mask>`
    + `<rect width="${W}" height="${H}" fill="#fff" mask="url(#${id})"/>`;
}

// Слой: всё внутри рисуется одним уровнем прозрачности. Именно чередование
// этих уровней и создаёт ощущение глубины.
function layer(opacity, body) {
  return `<g fill="#fff" stroke="none" opacity="${opacity}">${body}</g>`;
}

function strokeLayer(opacity, width, body) {
  return `<g fill="none" stroke="#fff" stroke-width="${width}" `
    + `stroke-linecap="round" opacity="${opacity}">${body}</g>`;
}

// Плотность слоёв намеренно низкая: это фон под текстом, а не картинка
// сама по себе. Верхний предел около трети — дальше содержимое начинает
// спорить с обоями за внимание.
//
// Каждая сцена возвращает три плана — дальний, средний, ближний. Они
// сохраняются отдельными файлами, потому что в приложении сдвигаются
// с разной скоростью при наклоне телефона. Разбивка не косметическая:
// параллакс работает ровно настолько, насколько разнесены планы по
// глубине, поэтому в дальний план идёт небо и всё выше линии горизонта,
// а в ближний — только то, что стоит у нижнего края кадра.
const SCENES = {
  // Горы: три хребта в дымке, снег на вершинах, ели у нижнего края.
  mountains: () => {
    const far = range(H * 0.56, 6, 150, 260, 3);
    const mid = range(H * 0.68, 5, 170, 300, 11);
    const pines = [0.06, 0.15, 0.24, 0.78, 0.88, 0.96]
      .map((k, i) => pine(W * k, H * (0.87 + (i % 2) * 0.02), 150 + (i % 3) * 40)).join('');
    return [
      layer(0.07, stars(80, H * 0.40, 41))
        + layer(0.10, `<circle cx="${W * 0.74}" cy="${H * 0.17}" r="${W * 0.07}"/>`)
        + layer(0.08, far.path) + layer(0.10, snowcaps(far.tops, 0.22, 5)),
      layer(0.12, mid.path) + layer(0.16, snowcaps(mid.tops, 0.25, 9)),
      layer(0.20, ridge(H * 0.86, 30, 520, 0.3) + pines)
        + layer(0.28, ridge(H * 0.96, 22, 380, 0.7)),
    ];
  },

  // Оазис: дюны, вода и финиковые пальмы.
  oasis: () => {
    const water = `<path d="M ${W * 0.18} ${H * 0.735} Q ${W * 0.5} ${H * 0.715} ${W * 0.84} ${H * 0.735} `
      + `Q ${W * 0.5} ${H * 0.76} ${W * 0.18} ${H * 0.735} Z"/>`;
    return [
      layer(0.07, stars(70, H * 0.42, 17))
        + layer(0.11, `<circle cx="${W * 0.26}" cy="${H * 0.26}" r="${W * 0.08}"/>`)
        + layer(0.07, ridge(H * 0.62, 26, 720, 0.1)),
      layer(0.11, ridge(H * 0.71, 30, 600, 0.55))
        + layer(0.16, water)
        + layer(0.13, palmTree(W * 0.30, H * 0.725, 150, 14, 3) + palmTree(W * 0.40, H * 0.725, 120, -10, 4)
          + palmTree(W * 0.70, H * 0.725, 140, -12, 5)),
      layer(0.24, palmTree(W * 0.10, H * 0.95, 420, 40, 7) + palmTree(W * 0.88, H * 0.96, 380, -36, 8))
        + layer(0.28, ridge(H * 0.93, 40, 440, 0.25)),
    ];
  },

  // Сад: стена с арками вдали, ряд кипарисов, кусты и пруд с фонтаном.
  garden: () => {
    const wallY = H * 0.66;
    let arches = '';
    for (let i = 0; i < 7; i += 1) {
      const cx = ((i + 0.5) * W) / 7; const aw = (W / 7) * 0.56;
      arches += `M ${cx - aw / 2} ${wallY} L ${cx - aw / 2} ${wallY - 70} Q ${cx} ${wallY - 140} ${cx + aw / 2} ${wallY - 70} L ${cx + aw / 2} ${wallY} Z `;
    }
    const wall = `<path fill-rule="evenodd" d="M 0 ${wallY - 160} L ${W} ${wallY - 160} L ${W} ${wallY} L 0 ${wallY} Z ${arches}"/>`;
    const pool = `<path d="M ${W * 0.3} ${H * 0.86} Q ${W * 0.5} ${H * 0.84} ${W * 0.7} ${H * 0.86} Q ${W * 0.5} ${H * 0.885} ${W * 0.3} ${H * 0.86} Z"/>`;
    const jet = `<path d="M ${W * 0.5} ${H * 0.858} Q ${W * 0.5} ${H * 0.81} ${W * 0.5} ${H * 0.802}"/>`
      + `<path d="M ${W * 0.5} ${H * 0.802} Q ${W * 0.47} ${H * 0.81} ${W * 0.455} ${H * 0.845}"/>`
      + `<path d="M ${W * 0.5} ${H * 0.802} Q ${W * 0.53} ${H * 0.81} ${W * 0.545} ${H * 0.845}"/>`;
    const row = [0.08, 0.2, 0.32, 0.68, 0.8, 0.92].map((k, i) => cypress(W * k, H * 0.76, 230 + (i % 2) * 50, 46)).join('');
    const bushes = [0.14, 0.26, 0.5, 0.74, 0.86].map(k => shrub(W * k, H * 0.765, 34)).join('');
    return [
      layer(0.07, stars(70, H * 0.40, 29))
        + layer(0.10, crescentMoon(W * 0.68, H * 0.2, W * 0.07, 'gm'))
        + layer(0.08, wall),
      layer(0.13, row) + layer(0.11, bushes)
        + layer(0.10, `<rect x="0" y="${H * 0.76}" width="${W}" height="${H * 0.24}"/>`),
      layer(0.22, pool) + strokeLayer(0.26, 3, jet)
        + layer(0.24, cypress(W * 0.06, H, 620, 110) + cypress(W * 0.94, H, 560, 100))
        + layer(0.26, shrub(W * 0.2, H * 0.99, 70) + shrub(W * 0.8, H * 0.99, 64)),
    ];
  },

  // Мечеть у воды: силуэт с отражением, полумесяц и звёзды.
  mosque: () => {
    const axis = H * 0.72;
    const body = mosque(W * 0.5, axis, 1.15);
    return [
      layer(0.08, stars(120, H * 0.50, 53))
        + layer(0.30, crescentMoon(W * 0.5, H * 0.17, W * 0.055, 'mm')),
      layer(0.15, body) + layer(0.06, reflection(body, axis, 'mr'))
        + layer(0.08, `<rect x="0" y="${axis}" width="${W}" height="3"/>`),
      layer(0.22, ridge(H * 0.95, 18, 300, 0.4)),
    ];
  },

  // Барханы: гряды песка со сдвигом фазы и низкая луна.
  desert: () => [
    layer(0.07, stars(60, H * 0.40, 21))
      + layer(0.11, `<circle cx="${W * 0.30}" cy="${H * 0.24}" r="${W * 0.10}"/>`)
      + layer(0.07, ridge(H * 0.58, 34, 700, 0.0)),
    layer(0.11, ridge(H * 0.68, 42, 560, 0.35))
      + layer(0.16, ridge(H * 0.78, 48, 470, 0.8)),
    layer(0.22, ridge(H * 0.88, 54, 390, 0.15))
      + layer(0.30, ridge(H * 0.97, 44, 320, 0.6)),
  ],

  // Аркада: ряды стрельчатых арок, уходящих вглубь.
  // Контуром, а не заливкой: сплошные арки читались надгробиями, потому что
  // у аркады главное — проёмы, а не простенки.
  arcade: () => {
    const arch = (cx, baseY, w, h) => `M ${cx - w / 2} ${baseY} `
      + `L ${cx - w / 2} ${baseY - h * 0.5} Q ${cx} ${baseY - h * 1.18} ${cx + w / 2} ${baseY - h * 0.5} `
      + `L ${cx + w / 2} ${baseY}`;
    const row = (baseY, w, h, n) => Array.from({ length: n }, (_, i) =>
      `<path d="${arch(((i + 0.5) * W) / n, baseY, w, h)}"/>`).join('')
      + `<path d="M 0 ${baseY} L ${W} ${baseY}"/>`;
    return [
      layer(0.07, stars(70, H * 0.32, 5))
        + strokeLayer(0.09, 2.5, row(H * 0.50, 92, 150, 5)),
      strokeLayer(0.14, 3, row(H * 0.66, 128, 215, 4))
        + strokeLayer(0.20, 3.5, row(H * 0.83, 186, 300, 3)),
      strokeLayer(0.28, 4, row(H * 1.02, 300, 430, 2)),
    ];
  },

  // Полумесяц над барханами: минималистичная сцена с одним акцентом.
  crescent: () => {
    const cx = W * 0.5;
    const cy = H * 0.28;
    const r = W * 0.19;
    // Полумесяц — разность двух кругов, поэтому рисуется маской.
    const moon = `<mask id="m"><rect width="${W}" height="${H}" fill="#000"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>`
      + `<circle cx="${cx + r * 0.42}" cy="${cy - r * 0.20}" r="${r * 0.88}" fill="#000"/></mask>`
      + `<rect width="${W}" height="${H}" fill="#fff" mask="url(#m)"/>`;
    return [
      layer(0.07, stars(110, H * 0.55, 33)),
      layer(0.34, moon)
        + strokeLayer(0.10, 2, `<circle cx="${cx}" cy="${cy}" r="${r * 1.7}"/>`
          + `<circle cx="${cx}" cy="${cy}" r="${r * 2.4}"/>`)
        + layer(0.13, ridge(H * 0.76, 30, 600, 0.4)),
      layer(0.21, ridge(H * 0.88, 40, 450, 0.9))
        + layer(0.30, ridge(H * 0.98, 34, 340, 0.2)),
    ];
  },
};

(async () => {
  // Аркада оставлена в коде как заготовка, но в приложение не подключена —
  // её кадры не пишем, чтобы не плодить неиспользуемые файлы.
  for (const [name, make] of Object.entries(SCENES).filter(([id]) => id !== 'arcade')) {
    const planes = make();
    for (let i = 0; i < planes.length; i += 1) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" `
        + `viewBox="0 0 ${W} ${H}">${planes[i]}</svg>`;
      const file = path.join(OUT, `${name}-${i + 1}.png`);
      await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
      console.log(`${name}-${i + 1}`.padEnd(12), W + 'x' + H,
        (fs.statSync(file).size / 1024).toFixed(0) + ' КБ');
    }
  }
})();
