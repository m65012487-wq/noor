// Генератор бесшовных плиток для узорных тем.
//
//   node scripts/patterns/build.js
//
// Плитки рисуются белым по прозрачному фону: цвет задаётся уже в приложении
// через tintColor. Поэтому один файл обслуживает все цветовые схемы, а не
// плодит комбинации «узор × цвет».
//
// Бесшовность обеспечивается механически: узор рисуется на поле 3×3 плитки,
// после чего вырезается центральная клетка. Всё, что уходит за её край,
// имеет двойника с противоположной стороны.
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', '..', 'assets', 'patterns');
const TILE = 256;
const STROKE = 2.2;

// Восьмиконечная звезда из двух квадратов — тот же мотив, что в иконке.
function star(cx, cy, r) {
  const pts = (angle) => {
    const rad = (angle * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    return [[-r, -r], [r, -r], [r, r], [-r, r]]
      .map(([x, y]) => `${(cx + x * c - y * s).toFixed(2)},${(cy + x * s + y * c).toFixed(2)}`)
      .join(' ');
  };
  return `<polygon points="${pts(0)}"/><polygon points="${pts(45)}"/>`;
}

const MOTIFS = {
  // Сетка восьмиконечных звёзд — классический хатам.
  stars: (u) => {
    let out = '';
    for (let i = -1; i <= 3; i += 1) {
      for (let j = -1; j <= 3; j += 1) {
        out += star(i * u, j * u, u * 0.30);
        out += star((i + 0.5) * u, (j + 0.5) * u, u * 0.12);
      }
    }
    return out;
  },
  // Пересекающиеся окружности — «цветок жизни».
  bloom: (u) => {
    let out = '';
    const r = u * 0.5;
    for (let i = -1; i <= 3; i += 1) {
      for (let j = -1; j <= 3; j += 1) {
        out += `<circle cx="${i * u}" cy="${j * u}" r="${r}"/>`;
        out += `<circle cx="${(i + 0.5) * u}" cy="${(j + 0.5) * u}" r="${r}"/>`;
      }
    }
    return out;
  },
  // Гирих: диагональная решётка с ромбами в узлах.
  girih: (u) => {
    let out = '';
    const span = u * 4;
    for (let k = -4; k <= 8; k += 1) {
      out += `<line x1="${-span}" y1="${k * u - span}" x2="${span * 2}" y2="${k * u + span * 2}"/>`;
      out += `<line x1="${-span}" y1="${k * u + span}" x2="${span * 2}" y2="${k * u - span * 2}"/>`;
    }
    for (let i = -1; i <= 3; i += 1) {
      for (let j = -1; j <= 3; j += 1) {
        out += star(i * u, j * u, u * 0.16);
      }
    }
    return out;
  },
  // Чешуя — ряды дуг, мотив куполов и мукарн.
  scales: (u) => {
    let out = '';
    const r = u * 0.5;
    // Диапазон считается от размера плитки, а не подбирается на глаз:
    // при -1..4 дуги обрывались на y=170 и внизу оставалась пустая полоса.
    const rows = Math.ceil(TILE / r) + 4;
    const cols = Math.ceil(TILE / u) + 4;
    for (let j = -2; j <= rows; j += 1) {
      const shift = j % 2 === 0 ? 0 : r;
      for (let i = -2; i <= cols; i += 1) {
        const cx = i * u + shift;
        const cy = j * r;
        out += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"/>`;
      }
    }
    return out;
  },
};

async function build(name, unit) {
  const u = TILE / unit;
  const big = TILE * 3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${big}" height="${big}" viewBox="${-TILE} ${-TILE} ${big} ${big}">
  <g fill="none" stroke="#ffffff" stroke-width="${STROKE}" stroke-linejoin="round" stroke-linecap="round">
    ${MOTIFS[name](u)}
  </g>
</svg>`;

  // Вырезаем центральную клетку поля 3×3: её края гарантированно стыкуются.
  await sharp(Buffer.from(svg))
    .extract({ left: TILE, top: TILE, width: TILE, height: TILE })
    .png()
    .toFile(path.join(OUT, `${name}.png`));
  console.log(name.padEnd(10), TILE + 'x' + TILE);
}

(async () => {
  await build('stars', 2);
  await build('bloom', 2);
  await build('girih', 3);
  await build('scales', 3);
})();
