// Build offline word-by-word Russian asset for the Quran reader.
//
//   input:  scripts/wbw/wbw_base.json   { surah: { ayah: [[ar, en], ...] } }
//           scripts/wbw/dict_ru.tsv     English gloss  \t  Russian gloss
//   output: assets/quran/quran_wbw_ru.json  { surah: { ayah: [[ar, ru], ...] } }
//
// Each word's Russian gloss is resolved from the dictionary (exact match first,
// then a normalized fallback). Words with no known translation get an empty
// string so the reader shows the Arabic word without a misleading English gloss.
//
// Re-run this whenever dict_ru.tsv grows:  node scripts/wbw/build.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'wbw_base.json'), 'utf8'));
const dictRaw = fs.readFileSync(path.join(__dirname, 'dict_ru.tsv'), 'utf8');

const norm = (g) =>
  g.toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\b(and|the|of|to|for|a|is|are|was|were)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const exact = new Map();
const normed = new Map();
for (const line of dictRaw.split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [en, ru] = line.split('\t');
  if (!en || !ru) continue;
  exact.set(en.trim(), ru.trim());
  const nk = norm(en);
  if (nk && !normed.has(nk)) normed.set(nk, ru.trim());
}

const resolve = (en) => {
  const e = (en || '').trim();
  if (!e) return '';
  if (exact.has(e)) return exact.get(e);
  const nk = norm(e);
  if (nk && normed.has(nk)) return normed.get(nk);
  return '';
};

let total = 0;
let glossed = 0;
const out = {};
for (const s of Object.keys(base)) {
  out[s] = {};
  for (const a of Object.keys(base[s])) {
    out[s][a] = base[s][a].map(([ar, en]) => {
      total++;
      const ru = resolve(en);
      if (ru) glossed++;
      return [ar, ru];
    });
  }
}

const outPath = path.join(ROOT, 'assets', 'quran', 'quran_wbw_ru.json');
fs.writeFileSync(outPath, JSON.stringify(out));
const bytes = fs.statSync(outPath).size;
console.log(`words: ${total}, glossed: ${glossed} (${(glossed / total * 100).toFixed(1)}%)`);
console.log(`dict entries: ${exact.size} exact, ${normed.size} normalized`);
console.log(`wrote ${outPath} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
