import AsyncStorage from '@react-native-async-storage/async-storage';

// AlQuran Cloud — free, no key, no rate limit. Base:
const BASE = 'https://api.alquran.cloud/v1';

// CDN for verse audio (reciter). {reciter}/{ayahNumber}.mp3
// We instead use the audio URL returned inside the surah audio edition.

// Sensible default editions (verified identifiers).
export const DEFAULTS = {
  arabic: 'quran-uthmani',
  transliteration: 'en.transliteration',
  audio: 'ar.alafasy', // Mishary Alafasy
};

// Translation choices shown in the picker. Identifier -> label.
export const TRANSLATIONS = {
  en: [
    { id: 'en.sahih', label: 'Saheeh International' },
    { id: 'en.asad', label: 'Muhammad Asad' },
    { id: 'en.pickthall', label: 'Pickthall' },
    { id: 'en.yusufali', label: 'Yusuf Ali' },
    { id: 'en.hilali', label: 'Hilali & Khan' },
    { id: 'en.arberry', label: 'Arberry' },
    { id: 'en.maududi', label: 'Maududi' },
    { id: 'en.transliteration', label: 'Transliteration' },
  ],
  ru: [
    { id: 'ru.kuliev', label: 'Эльмир Кулиев' },
    { id: 'ru.osmanov', label: 'Магомед-Нури Османов' },
    { id: 'ru.porokhova', label: 'Иман Порохова' },
    { id: 'ru.krachkovsky', label: 'Игнатий Крачковский' },
    { id: 'ru.muntahab', label: 'Аль-Мунтахаб' },
    { id: 'ru.abuadel', label: 'Абу Адель' },
  ],
};

// Popular reciters for the audio picker (verified AlQuran Cloud editions).
export const RECITERS = [
  { id: 'ar.alafasy', label: 'Mishary Alafasy' },
  { id: 'ar.abdulbasitmurattal', label: 'Abdul Basit (Murattal)' },
  { id: 'ar.husary', label: 'Mahmoud Al-Husary' },
  { id: 'ar.minshawi', label: 'Al-Minshawi' },
  { id: 'ar.abdurrahmaansudais', label: 'Abdurrahman As-Sudais' },
  { id: 'ar.shaatree', label: 'Abu Bakr Ash-Shaatree' },
  { id: 'ar.hudhaify', label: 'Ali Al-Hudhaify' },
  { id: 'ar.mahermuaiqly', label: 'Maher Al-Muaiqly' },
  { id: 'ar.muhammadayyoub', label: 'Muhammad Ayyoub' },
  { id: 'ar.muhammadjibreel', label: 'Muhammad Jibreel' },
  { id: 'ar.saoodshuraym', label: 'Saood Ash-Shuraym' },
  { id: 'ar.ahmedajamy', label: 'Ahmed Al-Ajamy' },
];

async function cachedFetch(url, cacheKey) {
  // Try cache first (Quran text never changes -> cache forever).
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error ' + res.status);
  const json = await res.json();
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(json));
  } catch {}
  return json;
}

// Retry a fetch a couple of times before giving up (handles flaky networks).
async function fetchWithRetry(url, cacheKey, tries = 2) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await cachedFetch(url, cacheKey);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// List all 114 surahs (metadata only). Local-first (instant, offline).
export async function getSurahList() {
  try {
    const { getSurahListLocal } = require('./quranLocal');
    const local = getSurahListLocal();
    if (local && local.length === 114) return local;
  } catch {}
  const json = await fetchWithRetry(`${BASE}/surah`, 'quran:surahList');
  return json.data;
}

// Get a surah in several editions at once: arabic + translation + transliteration.
// Returns merged ayahs joined by ayah number.
export async function getSurah(surahNumber, translationId, withTransliteration = true) {
  // Local-first: Russian translations are bundled offline (Tanzil text).
  // Any ru.* choice serves the bundled RU edition instantly; other languages use the API.
  if (translationId && translationId.startsWith('ru.')) {
    try {
      const { getSurahLocal } = require('./quranLocal');
      const local = getSurahLocal(surahNumber);
      if (local) {
        // Optionally enrich with transliteration from API in the background-free way:
        if (withTransliteration) {
          try {
            const cacheKey = `quran:translit:${surahNumber}`;
            const json = await fetchWithRetry(
              `${BASE}/surah/${surahNumber}/editions/${DEFAULTS.transliteration}`,
              cacheKey
            );
            const tl = json.data[0].ayahs;
            local.ayahs = local.ayahs.map((a, i) => ({ ...a, tr: tl[i] ? tl[i].text : '' }));
          } catch {} // offline: show without transliteration
        }
        return local;
      }
    } catch {}
  }
  const editions = [DEFAULTS.arabic, translationId];
  if (withTransliteration) editions.push(DEFAULTS.transliteration);
  const editionStr = editions.join(',');
  const cacheKey = `quran:surah:${surahNumber}:${editionStr}`;
  const json = await fetchWithRetry(
    `${BASE}/surah/${surahNumber}/editions/${editionStr}`,
    cacheKey
  );

  const data = json.data; // array, one entry per edition, same order as requested
  const arabic = data[0].ayahs;
  const translation = data[1].ayahs;
  const translit = withTransliteration ? data[2].ayahs : null;

  const merged = arabic.map((a, i) => ({
    number: a.numberInSurah,
    ar: a.text,
    tr: translit ? translit[i].text : '',
    en: translation[i].text,
  }));

  return {
    number: data[0].number,
    name: data[0].englishName,
    arabicName: data[0].name,
    meaning: data[0].englishNameTranslation,
    revelationType: data[0].revelationType,
    ayahs: merged,
  };
}

// Build audio URL list for a surah from an audio edition. Cached.
export async function getSurahAudio(surahNumber, reciterId) {
  const cacheKey = `quran:audio:${surahNumber}:${reciterId}`;
  const json = await fetchWithRetry(
    `${BASE}/surah/${surahNumber}/${reciterId}`,
    cacheKey
  );
  // Each ayah has an 'audio' field with the mp3 URL.
  const map = {};
  json.data.ayahs.forEach((a) => {
    map[a.numberInSurah] = a.audio;
  });
  return map; // { 1: url, 2: url, ... }
}

// Search the Quran text (Arabic or translation) for a keyword.
// Uses AlQuran Cloud search endpoint. Returns up to `limit` matches.
export async function searchAyahs(keyword, editionId, limit = 20) {
  if (!keyword || keyword.trim().length < 2) return [];
  const kw = encodeURIComponent(keyword.trim());
  // 'all' surahs, given edition (translation or arabic).
  const url = `${BASE}/search/${kw}/all/${editionId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.data || !json.data.matches) return [];
    return json.data.matches.slice(0, limit).map((m) => ({
      surahNumber: m.surah.number,
      surahName: m.surah.englishName,
      ayah: m.numberInSurah,
      text: m.text,
    }));
  } catch (e) { return []; }
}

// ---- Word-by-word (quran.com API v4, cached forever) ----
// Returns { [ayahNumber]: [{ar, ru}] }. Requires network on first load per surah.
export async function getWordByWord(surahNumber, lang = 'ru') {
  const cacheKey = `quran:wbw:${surahNumber}:${lang}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}` +
    `?words=true&language=${lang}&word_fields=text_uthmani&per_page=300&fields=verse_key`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('wbw ' + res.status);
  const json = await res.json();
  const map = {};
  for (const v of json.verses || []) {
    const n = Number(v.verse_key.split(':')[1]);
    map[n] = (v.words || [])
      .filter((w) => w.char_type_name === 'word')
      .map((w) => ({ ar: w.text_uthmani || w.text, ru: (w.translation && w.translation.text) || '' }));
  }
  try { await AsyncStorage.setItem(cacheKey, JSON.stringify(map)); } catch {}
  return map;
}
