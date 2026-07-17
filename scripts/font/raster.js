const opentype = require('opentype.js');
const path = require('path');

const SRC = path.join(__dirname, 'ptsans-bold.ttf');
const font = opentype.loadSync(SRC);
const upm = font.unitsPerEm;
const capH = (font.tables.os2 && font.tables.os2.sCapHeight) || Math.round(upm * 0.7);

const CAP_ROWS = 9;           // vertical dots across the cap height
const ABOVE = 1;              // extra rows above cap (Й breve, Ё dots)
const BELOW = 2;              // extra rows below baseline (Ц Щ Д tails)
const ROWS = CAP_ROWS + ABOVE + BELOW;
const cell = capH / CAP_ROWS; // font units per cell
const yTop = capH + ABOVE * cell;
const SUB = 3;                // subsamples per axis
const THRESH = 4;             // >= this many of SUB*SUB subpoints inside -> dot

// Flatten a glyph path (font units, y-up) into polygon contours.
function contours(glyph) {
  const cmds = glyph.path.commands;
  const cs = [];
  let cur = null, sx = 0, sy = 0, px = 0, py = 0;
  const seg = 6;
  const quad = (x0, y0, cx, cy, x1, y1) => {
    for (let i = 1; i <= seg; i++) { const t = i / seg, u = 1 - t;
      cur.push([u*u*x0 + 2*u*t*cx + t*t*x1, u*u*y0 + 2*u*t*cy + t*t*y1]); }
  };
  const cube = (x0, y0, c1x, c1y, c2x, c2y, x1, y1) => {
    for (let i = 1; i <= seg; i++) { const t = i / seg, u = 1 - t;
      cur.push([u*u*u*x0 + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*x1,
                u*u*u*y0 + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*y1]); }
  };
  for (const c of cmds) {
    if (c.type === 'M') { cur = [[c.x, c.y]]; cs.push(cur); sx = px = c.x; sy = py = c.y; }
    else if (c.type === 'L') { cur.push([c.x, c.y]); px = c.x; py = c.y; }
    else if (c.type === 'Q') { quad(px, py, c.x1, c.y1, c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'C') { cube(px, py, c.x1, c.y1, c.x2, c.y2, c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'Z') { px = sx; py = sy; }
  }
  return cs;
}

function inside(cs, x, y) {
  let win = false;
  for (const poly of cs) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) win = !win;
    }
  }
  return win;
}

// Rasterize a character into a { w, rows: [bitstrings] } grid.
function raster(ch) {
  const glyph = font.charToGlyph(ch);
  const cs = contours(glyph);
  const adv = glyph.advanceWidth || Math.round(cell * 5);
  const cols = Math.max(1, Math.round(adv / cell));
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      let hit = 0;
      for (let sy = 0; sy < SUB; sy++) for (let sx = 0; sx < SUB; sx++) {
        const x = (c + (sx + 0.5) / SUB) * cell;
        const y = yTop - (r + (sy + 0.5) / SUB) * cell;
        if (inside(cs, x, y)) hit++;
      }
      line += hit >= THRESH ? '#' : '.';
    }
    rows.push(line);
  }
  return { w: cols, rows };
}

const test = process.argv[2] || 'АБВГДЕЖЗИЙ';
for (const ch of test) {
  if (ch === ' ') continue;
  const g = raster(ch);
  console.log(`\n[${ch}] w=${g.w}`);
  console.log(g.rows.join('\n').replace(/#/g, '●').replace(/\./g, '·'));
}
