// Download whole-Quran editions for offline use.
// Stored in AsyncStorage under 'qdl:<editionId>' as a {surah:{ayah:text}} map.
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://api.alquran.cloud/v1';

export async function isTranslationDownloaded(editionId) {
  try { return (await AsyncStorage.getItem(`qdl:${editionId}`)) != null; }
  catch { return false; }
}

// Fetch the entire edition (all 6236 ayahs) in one request, store compactly.
export async function downloadTranslation(editionId) {
  try {
    const res = await fetch(`${BASE}/quran/${editionId}`);
    if (!res.ok) return false;
    const json = await res.json();
    const surahs = json.data.surahs;
    const map = {};
    surahs.forEach((s) => {
      map[s.number] = {};
      s.ayahs.forEach((a) => { map[s.number][a.numberInSurah] = a.text; });
    });
    await AsyncStorage.setItem(`qdl:${editionId}`, JSON.stringify(map));
    return true;
  } catch (e) { return false; }
}

export async function getDownloaded(editionId) {
  try {
    const raw = await AsyncStorage.getItem(`qdl:${editionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function removeDownload(editionId) {
  try { await AsyncStorage.removeItem(`qdl:${editionId}`); } catch {}
}

// Get a single ayah from a downloaded edition (or null if not downloaded).
export async function getDownloadedAyah(editionId, surah, ayah) {
  const map = await getDownloaded(editionId);
  if (!map) return null;
  return map[surah]?.[ayah] ?? null;
}

// ---- Reciter download ----
// Downloads the per-ayah audio URL index for a reciter (lightweight — URLs only,
// the mp3s still stream but are instantly addressable & cached by the OS).
export async function isReciterDownloaded(reciterId) {
  try { return (await AsyncStorage.getItem(`qdlrec:${reciterId}`)) != null; }
  catch { return false; }
}

export async function downloadReciter(reciterId, onProgress) {
  try {
    const res = await fetch(`${BASE}/quran/${reciterId}`);
    if (!res.ok) return false;
    const json = await res.json();
    const map = {};
    json.data.surahs.forEach((s) => {
      map[s.number] = {};
      s.ayahs.forEach((a) => { if (a.audio) map[s.number][a.numberInSurah] = a.audio; });
    });
    await AsyncStorage.setItem(`qdlrec:${reciterId}`, JSON.stringify(map));
    return true;
  } catch (e) { return false; }
}

export async function removeReciter(reciterId) {
  try { await AsyncStorage.removeItem(`qdlrec:${reciterId}`); } catch {}
}
