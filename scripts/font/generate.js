// Build a dot-matrix TTF ("NoorDot") from PT Sans Bold: rasterize each glyph to
// a grid, then emit a round dot for every "on" cell. Full Cyrillic + Latin.
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

const src = opentype.loadSync(path.join(__dirname, 'ptsans-bold.ttf'));
const upm = src.unitsPerEm;
const capH = (src.tables.os2 && src.tables.os2.sCapHeight) || Math.round(upm * 0.7);

const CAP_ROWS = 9, ABOVE = 1, BELOW = 2;
const ROWS = CAP_ROWS + ABOVE + BELOW;
const cell = capH / CAP_ROWS;
const yTop = capH + ABOVE * cell;
const SUB = 3, THRESH = 4;

const seg = 6;
function contours(glyph) {
  const cmds = glyph.path.commands, cs = []; let cur = null, sx = 0, sy = 0, px = 0, py = 0;
  const quad = (x0,y0,cx,cy,x1,y1)=>{for(let i=1;i<=seg;i++){const t=i/seg,u=1-t;cur.push([u*u*x0+2*u*t*cx+t*t*x1,u*u*y0+2*u*t*cy+t*t*y1]);}};
  const cube=(x0,y0,ax,ay,bx,by,x1,y1)=>{for(let i=1;i<=seg;i++){const t=i/seg,u=1-t;cur.push([u*u*u*x0+3*u*u*t*ax+3*u*t*t*bx+t*t*t*x1,u*u*u*y0+3*u*u*t*ay+3*u*t*t*by+t*t*t*y1]);}};
  for (const c of cmds) {
    if (c.type==='M'){cur=[[c.x,c.y]];cs.push(cur);sx=px=c.x;sy=py=c.y;}
    else if (c.type==='L'){cur.push([c.x,c.y]);px=c.x;py=c.y;}
    else if (c.type==='Q'){quad(px,py,c.x1,c.y1,c.x,c.y);px=c.x;py=c.y;}
    else if (c.type==='C'){cube(px,py,c.x1,c.y1,c.x2,c.y2,c.x,c.y);px=c.x;py=c.y;}
    else if (c.type==='Z'){px=sx;py=sy;}
  }
  return cs;
}
function inside(cs,x,y){let w=false;for(const p of cs){for(let i=0,j=p.length-1;i<p.length;j=i++){const[xi,yi]=p[i],[xj,yj]=p[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))w=!w;}}return w;}

function grid(ch) {
  const g = src.charToGlyph(ch);
  const cs = contours(g);
  const adv = g.advanceWidth || cell * 5;
  const cols = Math.max(1, Math.round(adv / cell));
  const on = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < cols; c++) {
    let hit = 0;
    for (let a = 0; a < SUB; a++) for (let b = 0; b < SUB; b++) {
      const x = (c + (b + 0.5) / SUB) * cell;
      const y = yTop - (r + (a + 0.5) / SUB) * cell;
      if (inside(cs, x, y)) hit++;
    }
    if (hit >= THRESH) on.push([r, c]);
  }
  return { cols, on };
}

// --- TTF coordinate system ---
const PITCH = 100;                 // font units per grid cell
const R = 41;                      // dot radius (leaves a ~18u gap)
const K = 0.5522847498 * R;
const baseRowsFromTop = ABOVE + CAP_ROWS; // rows above the baseline
const GAP_COLS = 1;                // empty columns between letters

function circle(pathObj, cx, cy) {
  pathObj.moveTo(cx + R, cy);
  pathObj.curveTo(cx + R, cy + K, cx + K, cy + R, cx, cy + R);
  pathObj.curveTo(cx - K, cy + R, cx - R, cy + K, cx - R, cy);
  pathObj.curveTo(cx - R, cy - K, cx - K, cy - R, cx, cy - R);
  pathObj.curveTo(cx + K, cy - R, cx + R, cy - K, cx + R, cy);
  pathObj.close();
}
function buildPath(gr) {
  const p = new opentype.Path();
  for (const [r, c] of gr.on) {
    const cx = (c + 0.5) * PITCH;
    const cy = (baseRowsFromTop - (r + 0.5)) * PITCH;
    circle(p, cx, cy);
  }
  return p;
}
function makeGlyph(unicode, gr, p) {
  return new opentype.Glyph({
    name: 'u' + unicode.toString(16), unicode,
    advanceWidth: (gr.cols + GAP_COLS) * PITCH, path: p || buildPath(gr),
  });
}

const UP_LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LO_LAT = 'abcdefghijklmnopqrstuvwxyz';
const UP_CYR = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
const LO_CYR = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const DIGITS = '0123456789';
const PUNCT = '.,:;!?()-·/№%';

const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 5 * PITCH, path: new opentype.Path() })];

function addLetter(up, lo) {
  const gr = grid(up);          // rasterize the uppercase shape
  const p1 = buildPath(gr);
  const p2 = buildPath(gr);     // separate Path object per glyph
  glyphs.push(makeGlyph(up.codePointAt(0), gr, p1));
  glyphs.push(makeGlyph(lo.codePointAt(0), gr, p2)); // lowercase reuses uppercase shape
}
for (let i = 0; i < UP_LAT.length; i++) addLetter(UP_LAT[i], LO_LAT[i]);
for (let i = 0; i < UP_CYR.length; i++) addLetter(UP_CYR[i], LO_CYR[i]);
for (const ch of DIGITS + PUNCT) {
  const gr = grid(ch);
  glyphs.push(makeGlyph(ch.codePointAt(0), gr));
}
// space
glyphs.push(new opentype.Glyph({ name: 'space', unicode: 0x20, advanceWidth: 4 * PITCH, path: new opentype.Path() }));

const font = new opentype.Font({
  familyName: 'NoorDot', styleName: 'Regular',
  unitsPerEm: 1000, ascender: baseRowsFromTop * PITCH, descender: -BELOW * PITCH,
  glyphs,
});
const out = path.join(__dirname, 'NoorDot.ttf');
font.download(out);
console.log('glyphs:', glyphs.length, '-> wrote', out, fs.statSync(out).size + 'b');

// sanity: re-parse and check a few chars resolve to non-notdef
const re = opentype.loadSync(out);
for (const ch of ['А','Я','Ж','ё','A','9',':']) {
  const g = re.charToGlyph(ch);
  console.log(ch, '->', g.name, 'dots=' + (g.path.commands.filter(c=>c.type==='M').length));
}
