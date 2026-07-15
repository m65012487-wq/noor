// Offline word-by-word Russian glosses, bundled asset.
// Built by scripts/wbw/build.js from the English word segmentation + dict_ru.tsv.
// Shape on disk: { [surah]: { [ayah]: [[arabic, russian], ...] } }  (russian may be '').
//
// Lazily required so the ~2 MB asset is only loaded when the reader actually
// turns word-by-word on, keeping app startup fast.
let WBW_RU = null;
function load() {
  if (!WBW_RU) WBW_RU = require('../../assets/quran/quran_wbw_ru.json');
  return WBW_RU;
}

// Returns { [ayahNumber]: [{ ar, ru }] } for a surah, or null if unavailable.
export function getWordByWordRuLocal(surahNumber) {
  try {
    const data = load();
    const surah = data[String(surahNumber)];
    if (!surah) return null;
    const out = {};
    for (const ayah of Object.keys(surah)) {
      out[Number(ayah)] = surah[ayah].map(([ar, ru]) => ({ ar, ru }));
    }
    return out;
  } catch {
    return null;
  }
}
