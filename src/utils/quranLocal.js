// Local full Quran (Tanzil text + Russian translation, bundled offline).
// Source: risan/quran-json (CC — Tanzil terms: text unchanged, attribution kept).
const QURAN_RU = require('../../assets/quran/quran_ru.json');

// Surah list metadata, instant and offline.
export function getSurahListLocal() {
  return QURAN_RU.map((s) => ({
    number: s.id,
    name: s.transliteration,
    englishName: s.transliteration,
    englishNameTranslation: s.translation,
    arabicName: s.name,
    numberOfAyahs: s.total_verses,
    revelationType: s.type,
  }));
}

// Full surah with Arabic + Russian translation, offline.
export function getSurahLocal(number) {
  const s = QURAN_RU.find((x) => x.id === Number(number));
  if (!s) return null;
  return {
    number: s.id,
    name: s.transliteration,
    arabicName: s.name,
    meaning: s.translation,
    revelationType: s.type,
    ayahs: s.verses.map((v) => ({
      number: v.id,
      ar: v.text,
      tr: '',           // transliteration not bundled; fetched online if needed
      en: v.translation, // russian translation (Kuliev-based edition)
    })),
  };
}
