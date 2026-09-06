// Генератор обоев «резаная бумага».
//
//   node scripts/paper/build.js
//
// Отличие от сцен в scripts/scenes: те монохромные и красятся тоном схемы,
// а эти цветные и схеме не подчиняются. Иначе стиль не работает — он весь
// держится на разнице тонов между слоями и на одном горячем акценте.
//
// Что делает картинку бумажной, а не просто плоской:
//   1. У каждого слоя есть тень, падающая на слой ЗА ним. Тень сдвинута
//      вверх, а не вниз: ближний слой ниже по кадру, и его верхний срез
//      ложится тенью на то, что позади и выше.
//   2. Внутри каждого слоя идут контурные линии, повторяющие его верхний
//      край, — след от стопки нарезанных полос.
//   3. Палитра плоская: ни одного градиента внутри слоя.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { horse } = require('./horse');

const OUT = path.join(__dirname, '..', '..', 'assets', 'paper');
const W = 900;
const H = 1950;

let uid = 0;
const nid = () => `c${(uid += 1)}`;

// Лист бумаги: тень, заливка, контурная текстура внутри среза.
function paper(d, fill, { shadow = 'rgba(0,0,0,0.5)', lift = 10, texture = '' } = {}) {
  let out = '';
  if (shadow && lift) {
    out += `<g transform="translate(0,${-lift})"><path d="${d}" fill="${shadow}"/></g>`;
  }
  out += `<path d="${d}" fill="${fill}"/>`;
  if (texture) {
    const id = nid();
    out += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
    out += `<g clip-path="url(#${id})">${texture}</g>`;
  }
  return out;
}

// Облако: сплошной силуэт из дуг по верхнему краю и прямой низ. Раньше низ
// добирался отдельным прямоугольником — он вылезал из-под долек плитой.
function cloudPath(x0, baseY, lobes) {
  let d = `M ${x0} ${baseY}`;
  let x = x0;
  for (const r of lobes) {
    d += ` A ${r} ${r * 1.05} 0 0 1 ${(x + r * 2).toFixed(1)} ${baseY}`;
    x += r * 2;
  }
  return `${d} L ${x.toFixed(1)} ${baseY + 1} L ${x0} ${baseY + 1} Z`;
}

// Дольки разного радиуса: одинаковые читаются гусеницей.
function lobeSizes(n, r, seed) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1 || 1);
    return r * (0.45 + Math.sin(t * Math.PI) * 0.6 + rnd() * 0.22);
  });
}

// Облако целиком: тень, заливка, вложенные дуги внутри каждой дольки.
function cloud(x0, baseY, r, n, fill, line, seed = 3) {
  const sizes = lobeSizes(n, r, seed);
  const d = cloudPath(x0, baseY, sizes);
  const id = nid();
  let tex = '';
  let x = x0;
  for (const rr of sizes) {
    const cx = x + rr;
    for (let k = 1; k <= 5; k += 1) {
      const q = rr * (1 - k * 0.17);
      tex += `<path d="M ${(cx - q).toFixed(1)} ${baseY} A ${q.toFixed(1)} ${(q * 1.05).toFixed(1)} 0 0 1 ${(cx + q).toFixed(1)} ${baseY}"/>`;
    }
    x += rr * 2;
  }
  return paper(d, fill, {
    lift: 9,
    texture: `<g fill="none" stroke="${line}" stroke-width="2" opacity="0.6">${tex}</g>`,
  });
}

// Высота гряды в точке x. Та же формула, что внутри ridgePath: нужна, чтобы
// сажать фигуры на землю, а не на её среднюю линию.
function ridgeY(baseY, amp, period, phase, x) {
  return baseY - Math.sin((x / period + phase) * Math.PI * 2) * amp
    - Math.sin((x / (period * 0.37) + phase) * Math.PI * 2) * amp * 0.28;
}

// Гряда: пологая синусоида, замкнутая до низа кадра.
function ridgePath(baseY, amp, period, phase) {
  let d = `M 0 ${H + 40} L 0 ${baseY}`;
  for (let x = 0; x <= W; x += 8) {
    const y = baseY - Math.sin((x / period + phase) * Math.PI * 2) * amp
      - Math.sin((x / (period * 0.37) + phase) * Math.PI * 2) * amp * 0.28;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L ${W} ${H + 40} Z`;
}

// Контурные полосы: тот же срез, повторённый со сдвигом вниз. Шаг мелкий и
// линия контрастная — при бледной редкой сетке текстура пропадает совсем,
// и слой читается плоской заливкой.
function contours(d, color, count, step, width = 2.2, opacity = 0.75) {
  let out = `<g fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}">`;
  for (let i = 1; i <= count; i += 1) {
    out += `<g transform="translate(0,${i * step})"><path d="${d}"/></g>`;
  }
  return `${out}</g>`;
}

// Куст: полукруглая шапка с веером дуг. Ими добирается плотность у нижнего
// края кадра — одни пальмы там читаются сорняками.
function bush(cx, baseY, r, fill, line) {
  const sizes = lobeSizes(5, r, cx | 0);
  const d = cloudPath(cx - r * 2.2, baseY, sizes);
  let tex = '';
  for (let k = 1; k <= 6; k += 1) {
    const q = r * (1 - k * 0.14);
    tex += `<path d="M ${(cx - q * 1.4).toFixed(1)} ${baseY} Q ${cx} ${(baseY - q * 1.7).toFixed(1)} ${(cx + q * 1.4).toFixed(1)} ${baseY}"/>`;
  }
  return paper(d, fill, {
    lift: 8,
    texture: `<g fill="none" stroke="${line}" stroke-width="2" opacity="0.55">${tex}</g>`,
  });
}

// Минарет. Решающая деталь — верхний ярус между галереей и куполом: без
// него навершие садится прямо на галерею, и силуэт читается крестом. Здесь
// это критично, поэтому ярус выделен, галерея сужена, а луковица укрупнена.
function minaretPath(x, baseY, h, w) {
  const topY = baseY - h;
  const galW = w * 1.02;
  const galH = h * 0.055;
  const galY = topY + h * 0.34;
  const upW = w * 0.62;
  const upH = h * 0.15;
  const upTop = galY - galH - upH;
  const capW = w * 0.92;
  const capH = w * 2.5;
  return `M ${x - w * 0.6} ${baseY} L ${x - w * 0.42} ${galY} L ${x + w * 0.42} ${galY} `
    + `L ${x + w * 0.6} ${baseY} Z `
    + `M ${x - galW} ${galY - galH} h ${galW * 2} v ${galH} h ${-galW * 2} Z `
    + `M ${x - w * 0.7} ${galY + h * 0.1} h ${w * 1.4} v ${h * 0.02} h ${-w * 1.4} Z `
    + `M ${x - upW} ${upTop} h ${upW * 2} v ${upH} h ${-upW * 2} Z `
    + `M ${x - capW} ${upTop} `
    + `Q ${x - capW * 1.05} ${upTop - capH * 0.62} ${x - w * 0.14} ${upTop - capH * 0.9} `
    + `Q ${x} ${upTop - capH * 1.06} ${x + w * 0.14} ${upTop - capH * 0.9} `
    + `Q ${x + capW * 1.05} ${upTop - capH * 0.62} ${x + capW} ${upTop} Z `
    + `M ${x - w * 0.07} ${upTop - capH * 1.02} h ${w * 0.14} v ${-h * 0.045} h ${-w * 0.14} Z`;
}

// Купол на барабане, со шпилем: без него купол читается просто бугром.
function domePath(cx, baseY, r) {
  const drum = r * 0.85;
  const rise = r * 1.1;
  const tipY = baseY - drum - rise;
  return `M ${cx - r} ${baseY} L ${cx - r} ${baseY - drum} `
    + `A ${r} ${rise} 0 0 1 ${cx + r} ${baseY - drum} L ${cx + r} ${baseY} Z `
    + `M ${cx - r * 0.05} ${tipY} h ${r * 0.1} v ${-r * 0.34} h ${-r * 0.1} Z `
    + `M ${cx - r * 0.11} ${tipY - r * 0.34} a ${r * 0.11} ${r * 0.11} 0 1 0 ${r * 0.22} 0 `
    + `a ${r * 0.11} ${r * 0.11} 0 1 0 ${-r * 0.22} 0 Z`;
}

// Пальма: ствол и веер листьев. Листья — вытянутые дольки от одной точки.
function palm(x, baseY, h, dir, fill, line) {
  const topX = x + dir * h * 0.13;
  const topY = baseY - h;
  let out = `<path d="M ${x - h * 0.055} ${baseY} Q ${x + dir * h * 0.05} ${baseY - h * 0.5} `
    + `${topX} ${topY} L ${topX + h * 0.075} ${topY + h * 0.02} `
    + `Q ${x + dir * h * 0.09} ${baseY - h * 0.5} ${x + h * 0.075} ${baseY} Z" fill="${fill}"/>`;
  const fronds = 9;
  for (let i = 0; i < fronds; i += 1) {
    const a = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
    const len = h * (0.36 + Math.sin(a) * 0.16);
    const ex = topX - Math.cos(a) * len;
    const ey = topY - Math.sin(a) * len * 0.62 + len * 0.30;
    const mx = (topX + ex) / 2;
    const my = (topY + ey) / 2 - len * 0.30;
    out += `<path d="M ${topX} ${topY} Q ${mx} ${my} ${ex.toFixed(1)} ${ey.toFixed(1)} `
      + `Q ${mx} ${my + len * 0.14} ${topX} ${topY + h * 0.02} Z" fill="${fill}"/>`;
    out += `<path d="M ${topX} ${topY} Q ${mx} ${my + len * 0.05} ${ex.toFixed(1)} ${ey.toFixed(1)}" `
      + `fill="none" stroke="${line}" stroke-width="1.6" opacity="0.6"/>`;
  }
  return out;
}

// Палитра плоская и намеренно тесная: в резаной бумаге объём даёт разница
// соседних тонов, а не количество цветов. Один горячий акцент на всю сцену.
const PAL = {
  sky: ['#151b25', '#26313f'],
  moon: '#e2a244',
  moonLine: '#c98a30',
  cloudFar: '#aeb9c6',
  cloudFarLine: '#8b97a6',
  cloudMid: '#7d8896',
  cloudMidLine: '#616c7a',
  hillFar: '#3c4655',
  hillFarLine: '#2f3846',
  hillMid: '#2c3542',
  hillMidLine: '#222933',
  build: '#1e2530',
  buildLine: '#161c25',
  near: '#1b222c',
  nearLine: '#121821',
  // Листва темнее гряды, на которой стоит: в один тон с ней она пропадала
  // целиком — пальмы были нарисованы, но их не было видно.
  leaf: '#0b0f16',
  leafLine: '#05080c',
  glow: '#e2a244',
  // Дорога приглушена относительно луны: она приходится на панель вкладок
  // и нижние строки списка, и в полную яркость перетягивала внимание.
  road: '#b07f36',
  roadLine: '#c99a4c',
};

// Композиция подчинена интерфейсу, а не картинке. Луна уведена вправо и
// вверх: по центру она попадает точно под кольцо обратного отсчёта. Середина
// кадра держится спокойной и тёмной — там идёт список времён. Вся плотность
// собрана у нижнего края, где стоит панель вкладок.
function night() {
  const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${PAL.sky[0]}"/>`
    + `<stop offset="1" stop-color="${PAL.sky[1]}"/></linearGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;

  // Луна: диск и неровные пятна морей. Концентрические кольца, с которых
  // я начал, читались годовыми кольцами спила, а не поверхностью.
  const mx = W * 0.70;
  const my = H * 0.165;
  const mr = W * 0.195;
  const mid = nid();
  const seas = [
    [-0.34, -0.28, 0.36, 0.27], [0.22, -0.42, 0.26, 0.18],
    [0.30, 0.30, 0.30, 0.23], [-0.20, 0.44, 0.22, 0.15],
    [-0.52, 0.12, 0.18, 0.26],
  ].map(([dx, dy, rx, ry]) =>
    `<ellipse cx="${(mx + mr * dx).toFixed(1)}" cy="${(my + mr * dy).toFixed(1)}" `
    + `rx="${(mr * rx).toFixed(1)}" ry="${(mr * ry).toFixed(1)}"/>`).join('');
  const moon = `<circle cx="${mx}" cy="${my}" r="${mr}" fill="${PAL.moon}"/>`
    + `<clipPath id="${mid}"><circle cx="${mx}" cy="${my}" r="${mr}"/></clipPath>`
    + `<g clip-path="url(#${mid})" fill="${PAL.moonLine}" opacity="0.55">${seas}</g>`
    + `<g clip-path="url(#${mid})" fill="none" stroke="${PAL.moonLine}" `
    + `stroke-width="2.4" opacity="0.5">${seas}</g>`
    + `<g clip-path="url(#${mid})" fill="none" stroke="${PAL.moonLine}" stroke-width="3" opacity="0.35">`
    + `<circle cx="${mx + mr * 0.22}" cy="${my + mr * 0.1}" r="${mr * 0.88}"/></g>`;

  const farD = ridgePath(H * 0.505, 26, 620, 0.2);
  const far = [
    sky, moon,
    cloud(-60, H * 0.315, 92, 5, PAL.cloudFar, PAL.cloudFarLine, 11),
    cloud(W * 0.60, H * 0.375, 78, 4, PAL.cloudFar, PAL.cloudFarLine, 29),
    paper(farD, PAL.hillFar, { lift: 12, texture: contours(farD, PAL.hillFarLine, 11, 15) }),
  ].join('');

  // Мечеть стоит на собственной площадке над средней грядой: посаженная
  // прямо на гряду, она наполовину тонет в её гребне.
  const baseY = H * 0.595;
  const hallX = W * 0.255;
  const hallW = W * 0.44;
  const hallY = baseY - 104;
  const arches = Array.from({ length: 5 }, (_, i) => {
    const w = hallW / 7;
    const x = hallX + hallW * 0.09 + i * (hallW * 0.166);
    return `<path d="M ${x} ${baseY - 6} L ${x} ${hallY + 54} `
      + `Q ${x + w / 2} ${hallY + 12} ${x + w} ${hallY + 54} L ${x + w} ${baseY - 6} Z"/>`;
  }).join('');
  const mosque = `<path d="${domePath(W * 0.475, hallY + 6, 112)}" fill="${PAL.build}"/>`
    + `<path d="${domePath(W * 0.30, hallY + 10, 52)}" fill="${PAL.build}"/>`
    + `<path d="${domePath(W * 0.65, hallY + 10, 52)}" fill="${PAL.build}"/>`
    + `<rect x="${hallX}" y="${hallY}" width="${hallW}" height="${baseY - hallY}" fill="${PAL.build}"/>`
    + `<g fill="${PAL.glow}" opacity="0.5">${arches}</g>`
    + `<path d="${minaretPath(W * 0.175, baseY, 282, 33)}" fill="${PAL.build}"/>`
    + `<path d="${minaretPath(W * 0.795, baseY, 256, 31)}" fill="${PAL.build}"/>`;

  const midD = ridgePath(H * 0.63, 22, 460, 0.75);
  const mid2 = [
    cloud(W * 0.12, H * 0.465, 70, 6, PAL.cloudMid, PAL.cloudMidLine, 47),
    mosque,
    paper(midD, PAL.hillMid, { lift: 12, texture: contours(midD, PAL.hillMidLine, 12, 17) }),
  ].join('');

  // Дорога строится по средней линии с растущей полушириной: два бегущих
  // навстречу безье давали не ленту, а парус.
  const roadTop = H * 0.628;
  let left = '';
  let right = '';
  const N = 40;
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const y = roadTop + (H + 60 - roadTop) * t;
    const cx = W * 0.485 + Math.sin(t * Math.PI * 1.5) * W * 0.11 - t * W * 0.03;
    const hw = 8 + t * t * 74;
    left += ` L ${(cx - hw).toFixed(1)} ${y.toFixed(1)}`;
    right = ` L ${(cx + hw).toFixed(1)} ${y.toFixed(1)}` + right;
  }
  const roadD = `M ${(W * 0.485).toFixed(1)} ${roadTop}${left}${right} Z`;
  const road = paper(roadD, PAL.road, {
    shadow: null,
    texture: contours(roadD, PAL.roadLine, 11, 24, 2.2, 0.5),
  });

  // Порядок в ближнем плане важен: сначала гряда, потом дорога поверх неё,
  // и только затем листва. Дорога, положенная под гряду, обрывалась на
  // середине и висела в воздухе.
  const nearD = ridgePath(H * 0.785, 30, 380, 0.15);
  const near = [
    paper(nearD, PAL.near, { lift: 14, texture: contours(nearD, PAL.nearLine, 14, 19) }),
    road,
    bush(W * 0.16, H * 0.885, 66, PAL.leaf, PAL.leafLine),
    bush(W * 0.86, H * 0.895, 58, PAL.leaf, PAL.leafLine),
    palm(W * 0.13, H * 1.02, 600, -1, PAL.leaf, PAL.leafLine),
    palm(W * 0.89, H * 1.03, 650, 1, PAL.leaf, PAL.leafLine),
    palm(W * 0.31, H * 1.06, 400, -1, PAL.leaf, PAL.leafLine),
    palm(W * 0.70, H * 1.07, 360, 1, PAL.leaf, PAL.leafLine),
  ].join('');

  return [far, mid2, near];
}

// Палитра табуна: холодная ночь и низкое тёплое солнце у горизонта. Лошади
// на каждом плане темнее своего фона — иначе силуэт пропадает.
const HERD = {
  sky: ['#161c26', '#334053'],
  sun: '#d08b3c',
  sunLine: '#b5742c',
  haze: '#8a94a4',
  groundFar: '#414c5c',
  groundFarLine: '#333c49',
  groundMid: '#2c3543',
  groundMidLine: '#222935',
  groundNear: '#1d2530',
  groundNearLine: '#131922',
  horseFar: '#2f3846',
  horseMid: '#1b2029',
  horseNear: '#05080c',
  dust: '#6b788a',
};

// Табун. Лошади идут тремя планами, и весь эффект бега держится на том, что
// планы разнесены по глубине: при наклоне телефона ближний ряд уезжает
// втрое сильнее дальнего, и табун будто обгоняет фон.
//
// Внутри плана лошади различаются фазой галопа. Одна фаза на всех читается
// шеренгой одинаковых фигур — движения не возникает, сколько их ни ставь.
function herd() {
  const sky = `<defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${HERD.sky[0]}"/>`
    + `<stop offset="0.62" stop-color="${HERD.sky[1]}"/>`
    + `<stop offset="1" stop-color="${HERD.sky[1]}"/></linearGradient>`
    + `<linearGradient id="hglow" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${HERD.sun}" stop-opacity="0"/>`
    + `<stop offset="1" stop-color="${HERD.sun}" stop-opacity="0.34"/></linearGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#hsky)"/>`
    + `<rect x="0" y="${H * 0.34}" width="${W}" height="${H * 0.24}" fill="url(#hglow)"/>`;

  // Низкое солнце: диск наполовину за грядой, лошади дальнего плана идут
  // по нему силуэтами. Кольца внутри — та же нарезка, что у остальных слоёв.
  const sx = W * 0.60;
  const sy = H * 0.545;
  const sr = W * 0.19;
  const sid = nid();
  let sun = `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${HERD.sun}"/>`
    + `<clipPath id="${sid}"><circle cx="${sx}" cy="${sy}" r="${sr}"/></clipPath>`
    + `<g clip-path="url(#${sid})" fill="none" stroke="${HERD.sunLine}" stroke-width="7" opacity="0.45">`;
  // Полосы, а не кольца: концентрические окружности внутри диска читаются
  // спилом дерева. Горизонтальная нарезка — это садящееся сквозь дымку
  // солнце, и она же перекликается с полосами гряды.
  for (let k = -3; k <= 3; k += 1) {
    const yy = (sy + k * sr * 0.27).toFixed(1);
    sun += `<path d="M ${sx - sr} ${yy} h ${sr * 2}"/>`;
  }
  sun += `</g>`;

  // Пыль: вытянутые клубы у самых копыт.
  const dust = (x, y, w, h, op, fill) => {
    let out = `<g fill="${fill}" opacity="${op}">`;
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      out += `<ellipse cx="${(x + t * w).toFixed(1)}" cy="${(y - Math.sin(t * Math.PI) * h * 0.4).toFixed(1)}" `
        + `rx="${(w * 0.09).toFixed(1)}" ry="${(h * (0.3 + Math.sin(t * Math.PI) * 0.5)).toFixed(1)}"/>`;
    }
    return `${out}</g>`;
  };

  // Ряд лошадей. Копыта сажаются на саму гряду, а не на её среднюю линию:
  // земля волнистая, и лошадь, поставленная на среднюю, то висит в воздухе,
  // то уходит в грунт по колено.
  //
  // Позиции, размеры и фазы разведены детерминированно, чтобы пересборка
  // давала ту же картинку.
  const row = (baseY, amp, period, phase, L, count, x0, step, fill, seed) => {
    let out = '';
    for (let i = 0; i < count; i += 1) {
      const x = x0 + i * step + ((i * 37 + seed) % 11) * (L * 0.03);
      const scale = L * (0.9 + ((i * 29 + seed) % 5) * 0.05);
      const y = ridgeY(baseY, amp, period, phase, x) - scale * 0.72;
      out += horse(x, y, scale, -1, i * 3 + seed, fill);
    }
    return out;
  };

  // Порядок внутри плана: земля, пыль, лошади. Гряда, положенная поверх,
  // срезала ногам копыта и колени — лошади стояли по брюхо в земле.
  const farD = ridgePath(H * 0.575, 10, 700, 0.3);
  const far = [
    sky, sun,
    paper(farD, HERD.groundFar, { lift: 10, texture: contours(farD, HERD.groundFarLine, 9, 15) }),
    row(H * 0.575, 10, 700, 0.3, 78, 7, W * 0.06, W * 0.145, HERD.horseFar, 1),
  ].join('');

  const midD = ridgePath(H * 0.745, 16, 520, 0.8);
  const mid = [
    paper(midD, HERD.groundMid, { lift: 12, texture: contours(midD, HERD.groundMidLine, 11, 17) }),
    dust(W * 0.02, H * 0.754, W * 1.0, 40, 0.26, HERD.dust),
    row(H * 0.745, 16, 520, 0.8, 150, 5, W * 0.02, W * 0.215, HERD.horseMid, 2),
  ].join('');

  const nearD = ridgePath(H * 0.905, 18, 420, 0.2);
  const near = [
    paper(nearD, HERD.groundNear, { lift: 14, texture: contours(nearD, HERD.groundNearLine, 12, 19) }),
    dust(-W * 0.05, H * 0.918, W * 1.12, 72, 0.30, HERD.dust),
    row(H * 0.905, 18, 420, 0.2, 250, 4, -W * 0.06, W * 0.315, HERD.horseNear, 3),
  ].join('');

  return [far, mid, near];
}

const SCENES = { night, herd };

(async () => {
  for (const [name, make] of Object.entries(SCENES)) {
    const planes = make();
    for (let i = 0; i < planes.length; i += 1) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" `
        + `viewBox="0 0 ${W} ${H}">${planes[i]}</svg>`;
      const file = path.join(OUT, `${name}-${i + 1}.png`);
      // Палитра вместо полного цвета: в резаной бумаге тонов десятки, а не
      // тысячи, и квантование режет вес втрое без видимой потери.
      await sharp(Buffer.from(svg))
        .png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(file);
      console.log(`${name}-${i + 1}`.padEnd(12), (fs.statSync(file).size / 1024).toFixed(0) + ' КБ');
    }
  }
})();
