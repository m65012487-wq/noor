// Обои «Табун»: три ряда скачущих лошадей внахлёст.
//
//   node scripts/paper/herd.js
//
// В отличие от scripts/paper/build.js здесь ничего не рисуется вектором.
// Силуэты вырезаны из раскадровки галопа (scripts/paper/horses), и сцена
// собирается композитингом: так фигуры остаются настоящими лошадьми, а не
// параметрической схемой, которая при всех стараниях читалась condensed.
//
// Слои те же три, что у остальных параллаксных тем: дальний почти стоит,
// ближний уезжает заметно.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', '..', 'assets', 'paper');
const SRC = path.join(__dirname, 'horses');
const W = 900;
const H = 1950;

const PAL = {
  sky: ['#1a212c', '#36434f'],
  far: '#4d5968',
  mid: '#3a4657',
  near: '#121820',
  haze: '#7b8899',
};

// Силуэт в нужном цвете и размере: сплошная заливка, обрезанная по альфе
// исходной картинки. Красить приходится так, потому что вырезки чёрные,
// а ряды обязаны различаться по светлоте — иначе нахлёст не читается.
async function tinted(file, width, color, flip) {
  let img = sharp(path.join(SRC, file)).resize({ width, kernel: 'lanczos3' });
  if (flip) img = img.flop();
  const mask = await img.png().toBuffer();
  const meta = await sharp(mask).metadata();
  return {
    buf: await sharp({
      create: { width: meta.width, height: meta.height, channels: 4, background: color },
    }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer(),
    w: meta.width,
    h: meta.height,
  };
}

// Дымка под рядом: мягкая полоса вместо жёсткой гряды. Ряды и так спорят
// за внимание с текстом, а сплошная земля под каждым добавляла ещё три
// горизонтали поперёк экрана.
function haze(y, height, opacity) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${PAL.haze}" stop-opacity="0"/>`
    + `<stop offset="0.75" stop-color="${PAL.haze}" stop-opacity="${opacity}"/>`
    + `<stop offset="1" stop-color="${PAL.haze}" stop-opacity="0"/></linearGradient></defs>`
    + `<rect x="0" y="${y - height}" width="${W}" height="${height * 1.3}" fill="url(#g)"/></svg>`);
}

// Ряды подняты так, чтобы ближний целиком помещался над панелью вкладок:
// опущенный к самому низу, он уходил ногами под неё.
//
// Ряд: кадры галопа берутся разные, иначе ряд читается одной фигурой,
// размноженной под копирку.
const RANKS = [
  {
    frames: ['h03.png', 'h07.png', 'h11.png', 'h05.png', 'h09.png'],
    width: 232, step: 178, x0: -66, baseY: H * 0.685, color: PAL.far,
    hazeH: 130, hazeOp: 0.13, jitter: 9,
  },
  {
    frames: ['h12.png', 'h02.png', 'h08.png', 'h06.png'],
    width: 334, step: 252, x0: -84, baseY: H * 0.795, color: PAL.mid,
    hazeH: 180, hazeOp: 0.11, jitter: 13,
  },
  {
    frames: ['h10.png', 'h04.png', 'h01.png'],
    width: 472, step: 344, x0: -118, baseY: H * 0.900, color: PAL.near,
    hazeH: 240, hazeOp: 0.09, jitter: 17,
  },
];

async function rank(r, seed) {
  const comp = [{ input: haze(r.baseY, r.hazeH, r.hazeOp), left: 0, top: 0 }];
  for (let i = 0; i < r.frames.length; i += 1) {
    const w = Math.round(r.width * (0.94 + ((i * 29 + seed) % 4) * 0.03));
    const { buf, w: iw, h: ih } = await tinted(r.frames[i], w, r.color, false);
    const left = Math.round(r.x0 + i * r.step);
    const top = Math.round(r.baseY - ih + ((i * 53 + seed) % 3) * r.jitter);
    // Композитинг режет всё, что вылезает за холст, поэтому крайние фигуры
    // приходится обрезать вручную: sharp на отрицательный left ругается.
    if (left >= 0 && left + iw <= W) {
      comp.push({ input: buf, left, top });
    } else {
      const cropL = Math.max(0, -left);
      const cropW = Math.min(iw - cropL, W - Math.max(0, left));
      if (cropW <= 0) continue;
      const piece = await sharp(buf)
        .extract({ left: cropL, top: 0, width: cropW, height: ih }).png().toBuffer();
      comp.push({ input: piece, left: Math.max(0, left), top });
    }
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: '#00000000' } })
    .composite(comp).png().toBuffer();
}

(async () => {
  const sky = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
    + `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${PAL.sky[0]}"/>`
    + `<stop offset="1" stop-color="${PAL.sky[1]}"/></linearGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#s)"/></svg>`);

  const planes = [
    await sharp(sky).composite([{ input: await rank(RANKS[0], 1) }]).png().toBuffer(),
    await rank(RANKS[1], 5),
    await rank(RANKS[2], 9),
  ];

  for (let i = 0; i < planes.length; i += 1) {
    const file = path.join(OUT, `herd-${i + 1}.png`);
    await sharp(planes[i]).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(file);
    console.log(`herd-${i + 1}`.padEnd(10), (fs.statSync(file).size / 1024).toFixed(0) + ' КБ');
  }
})();
