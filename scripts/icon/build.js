// Генератор иконок приложения.
//
//   node scripts/icon/build.js
//
// Иконка строится кодом, а не лежит готовой картинкой: так её можно
// пересобрать под другой размер или подправить палитру, не открывая редактор.
//
// Мотив — «руб-эль-хизб», восьмиконечная звезда из двух наложенных квадратов.
// Знак традиционный, читается на мелком размере и не содержит изображений
// живых существ.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', '..', 'assets');

// Палитра совпадает с темой приложения (src/constants/theme.js).
const NAVY = '#16263b';
const NAVY_DEEP = '#0b1523';
const ACCENT = '#bcd3e0';
const AZURE = '#7fb4cc';

// Квадрат со стороной side, повёрнутый на angle вокруг центра.
function square(cx, cy, side, angle) {
  const h = side / 2;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [[-h, -h], [h, -h], [h, h], [-h, h]]
    .map(([x, y]) => `${(cx + x * cos - y * sin).toFixed(2)},${(cy + x * sin + y * cos).toFixed(2)}`)
    .join(' ');
}

/**
 * @param {number} size    сторона холста
 * @param {number} scale   доля холста под мотив (у Android своя безопасная зона)
 * @param {boolean} opaque заливать ли фон (iOS не принимает прозрачность)
 */
function svg(size, scale, opaque) {
  const c = size / 2;
  const side = size * scale;
  // Сердцевина вырезается фоном: она задаёт звезде толщину лучей.
  // Кольца и точки внутри на 60 пикселях сливались в «объектив камеры».
  const core = side * 0.20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
    <linearGradient id="star" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ACCENT}"/>
      <stop offset="1" stop-color="${AZURE}"/>
    </linearGradient>
  </defs>
  ${opaque ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>` : ''}
  <g fill="url(#star)" stroke="none">
    <polygon points="${square(c, c, side, 0)}"/>
    <polygon points="${square(c, c, side, 45)}"/>
  </g>
  <circle cx="${c}" cy="${c}" r="${core / 2}" fill="${NAVY_DEEP}"/>
</svg>`;
}

async function write(name, size, scale, opaque) {
  const buffer = Buffer.from(svg(size, scale, opaque));
  let pipeline = sharp(buffer).png();
  // iOS отвергает иконку с альфа-каналом, поэтому фон подкладывается явно.
  if (opaque) pipeline = pipeline.flatten({ background: NAVY_DEEP });
  await pipeline.toFile(path.join(OUT, name));
  const stat = fs.statSync(path.join(OUT, name));
  console.log(name.padEnd(22), size + 'x' + size, (stat.size / 1024).toFixed(0) + ' КБ');
}

(async () => {
  // Масштаб задаёт сторону квадрата, а видимый размер даёт диагональ повёрнутого:
  // она в 1.41 раза больше. При 0.62 мотив занимал 92% холста и упирался в маску.
  // 0.50 даёт около 73% — привычная для иконок плотность.
  await write('icon.png', 1024, 0.50, true);
  // Android: безопасная зона адаптивной иконки — внутренние 66%. Берём с запасом,
  // потому что лаунчеры обрезают её по-разному: кругом, скруглённым квадратом, каплей.
  await write('adaptive-icon.png', 1024, 0.38, false);
})();
