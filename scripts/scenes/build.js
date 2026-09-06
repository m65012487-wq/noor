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

// Минарет: ствол, широкий балкон и вытянутое навершие.
//
// Форма подбиралась дважды. Треугольный шатёр читался копьём, а купольный
// верх шире балкона — грибом. Работает только такое сочетание: балкон шире
// ствола, навершие уже балкона и выше своей ширины.
function minaret(x, baseY, h, w) {
  const topY = baseY - h;
  const balconyW = w * 1.5;
  const balconyH = h * 0.045;
  const balconyY = topY + h * 0.22;
  const capW = w * 0.78;
  const capH = w * 1.5;
  const capBase = balconyY;

  return `<rect x="${x - w / 2}" y="${balconyY}" width="${w}" height="${baseY - balconyY}"/>`
    + `<rect x="${x - balconyW}" y="${balconyY - balconyH}" width="${balconyW * 2}" height="${balconyH}"/>`
    + `<path d="M ${x - capW} ${capBase - balconyH} `
    + `Q ${x - capW} ${capBase - balconyH - capH * 0.75} ${x} ${capBase - balconyH - capH} `
    + `Q ${x + capW} ${capBase - balconyH - capH * 0.75} ${x + capW} ${capBase - balconyH} Z"/>`
    + `<rect x="${x - w * 0.06}" y="${capBase - balconyH - capH - h * 0.05}" `
    + `width="${w * 0.12}" height="${h * 0.05}"/>`;
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
const SCENES = {
  // Город: три ряда куполов и минаретов, уходящих в дымку.
  city: () => [
    layer(0.07, stars(90, H * 0.45, 7)),
    layer(0.08, `<circle cx="${W * 0.72}" cy="${H * 0.20}" r="${W * 0.12}"/>`),
    layer(0.09, ridge(H * 0.62, 22, 520, 0.2)
      + dome(W * 0.18, H * 0.64, 52) + minaret(W * 0.34, H * 0.64, 132, 14)
      + dome(W * 0.54, H * 0.64, 44) + minaret(W * 0.70, H * 0.64, 116, 13)
      + dome(W * 0.88, H * 0.64, 48)),
    layer(0.15, ridge(H * 0.75, 26, 430, 0.7)
      + dome(W * 0.28, H * 0.78, 84) + minaret(W * 0.08, H * 0.78, 190, 20)
      + minaret(W * 0.54, H * 0.78, 205, 21) + dome(W * 0.76, H * 0.78, 70)),
    layer(0.24, ridge(H * 0.90, 28, 360, 0.1)
      + dome(W * 0.50, H * 0.94, 132) + minaret(W * 0.17, H * 0.94, 270, 30)
      + minaret(W * 0.83, H * 0.94, 255, 29)),
  ].join(''),

  // Барханы: гряды песка со сдвигом фазы и низкая луна.
  desert: () => [
    layer(0.07, stars(60, H * 0.40, 21)),
    layer(0.11, `<circle cx="${W * 0.30}" cy="${H * 0.24}" r="${W * 0.10}"/>`),
    layer(0.07, ridge(H * 0.58, 34, 700, 0.0)),
    layer(0.11, ridge(H * 0.68, 42, 560, 0.35)),
    layer(0.16, ridge(H * 0.78, 48, 470, 0.8)),
    layer(0.22, ridge(H * 0.88, 54, 390, 0.15)),
    layer(0.30, ridge(H * 0.97, 44, 320, 0.6)),
  ].join(''),

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
      layer(0.07, stars(70, H * 0.32, 5)),
      strokeLayer(0.09, 2.5, row(H * 0.50, 92, 150, 5)),
      strokeLayer(0.14, 3, row(H * 0.66, 128, 215, 4)),
      strokeLayer(0.20, 3.5, row(H * 0.83, 186, 300, 3)),
      strokeLayer(0.28, 4, row(H * 1.02, 300, 430, 2)),
    ].join('');
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
      layer(0.34, moon),
      strokeLayer(0.10, 2, `<circle cx="${cx}" cy="${cy}" r="${r * 1.7}"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${r * 2.4}"/>`),
      layer(0.13, ridge(H * 0.76, 30, 600, 0.4)),
      layer(0.21, ridge(H * 0.88, 40, 450, 0.9)),
      layer(0.30, ridge(H * 0.98, 34, 340, 0.2)),
    ].join('');
  },
};


(async () => {
  for (const [name, make] of Object.entries(SCENES)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${make()}</svg>`;
    const file = path.join(OUT, `${name}.png`);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
    console.log(name.padEnd(10), W + 'x' + H, (fs.statSync(file).size / 1024).toFixed(0) + ' КБ');
  }
})();
