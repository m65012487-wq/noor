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

  // Барханы: ряды пологих дуг со сдвигом через строку. Шаг кратен клетке,
  // поэтому гребни продолжаются через стык без разрыва.
  dunes: (u) => {
    let out = '';
    const rows = Math.ceil(TILE / (u * 0.5)) + 4;
    const cols = Math.ceil(TILE / u) + 4;
    for (let j = -2; j <= rows; j += 1) {
      const y = j * u * 0.5;
      const shift = j % 2 === 0 ? 0 : u * 0.5;
      for (let i = -2; i <= cols; i += 1) {
        const x = i * u + shift;
        out += `<path d="M ${x} ${y} q ${u * 0.5} ${-u * 0.34} ${u} 0"/>`;
      }
    }
    return out;
  },

  // Стрельчатые арки михраба: две дуги, сходящиеся в вершине, на подножках.
  arches: (u) => {
    let out = '';
    const w = u * 0.72;
    const h = u * 0.92;
    const n = Math.ceil(TILE / u) + 2;
    for (let j = -1; j <= n; j += 1) {
      for (let i = -1; i <= n; i += 1) {
        const x = i * u + (j % 2 === 0 ? 0 : u * 0.5);
        const y = j * u;
        const l = x - w / 2;
        const r = x + w / 2;
        out += `<path d="M ${l} ${y + h} L ${l} ${y + h * 0.45} Q ${x} ${y - h * 0.12} ${r} ${y + h * 0.45} L ${r} ${y + h}"/>`;
      }
    }
    return out;
  },

  // Фонари: шестигранник с дужкой сверху и кисточкой снизу.
  lanterns: (u) => {
    let out = '';
    const r = u * 0.20;
    const n = Math.ceil(TILE / u) + 2;
    for (let j = -1; j <= n; j += 1) {
      for (let i = -1; i <= n; i += 1) {
        const x = i * u + (j % 2 === 0 ? 0 : u * 0.5);
        const y = j * u;
        const pts = [];
        for (let k = 0; k < 6; k += 1) {
          const a = (Math.PI / 3) * k - Math.PI / 2;
          pts.push(`${(x + r * Math.cos(a)).toFixed(2)},${(y + r * 1.4 * Math.sin(a)).toFixed(2)}`);
        }
        out += `<polygon points="${pts.join(' ')}"/>`;
        out += `<path d="M ${x} ${y - r * 1.4} l 0 ${-r * 0.55}"/>`;
        out += `<path d="M ${x} ${y + r * 1.4} l 0 ${r * 0.45}"/>`;
      }
    }
    return out;
  },

  // Скрещённые сабли: изогнутый клинок, поперечная гарда и навершие.
  // Без гарды и навершия пара дуг читается просто как крест из линий.
  swords: (u) => {
    let out = '';
    const L = u * 0.34;
    const n = Math.ceil(TILE / u) + 2;
    for (let j = -1; j <= n; j += 1) {
      for (let i = -1; i <= n; i += 1) {
        const x = i * u + (j % 2 === 0 ? 0 : u * 0.5);
        const y = j * u;
        for (const dir of [-1, 1]) {
          const tipX = x + dir * L;
          const tipY = y - L * 0.85;
          const hiltX = x - dir * L * 0.75;
          const hiltY = y + L * 0.8;
          out += `<path d="M ${hiltX} ${hiltY} Q ${x + dir * L * 0.15} ${y - L * 0.15} ${tipX} ${tipY}"/>`;
          out += `<path d="M ${hiltX - dir * L * 0.18} ${hiltY - L * 0.18} l ${dir * L * 0.36} ${L * 0.36}"/>`;
          out += `<circle cx="${hiltX - dir * L * 0.14}" cy="${hiltY + L * 0.14}" r="${L * 0.08}"/>`;
        }
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
  await build('dunes', 3);
  // Чётное число рядов на клетку обязательно: при нечётном сдвиг через
  // строку не повторяется на стыке и шов расходится.
  await build('arches', 4);
  await build('lanterns', 4);
  // Сабли крупнее прочих: на мелкой клетке они читались абстрактными дугами.
  await build('swords', 2);
})();
