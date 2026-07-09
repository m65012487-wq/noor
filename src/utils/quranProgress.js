// Tracks last-read position, bookmarks, and reading font size.
import { loadJSON, saveJSON } from './helpers';

export async function getLastRead() {
  return await loadJSON('quranLastRead', null); // { surahNumber, name, ayah }
}
export async function setLastRead(info) {
  await saveJSON('quranLastRead', info);
}

export async function getBookmarks() {
  return await loadJSON('quranBookmarks', []); // [{ surahNumber, name, ayah }]
}
export async function toggleBookmark(item) {
  const list = await getBookmarks();
  const i = list.findIndex(
    (b) => b.surahNumber === item.surahNumber && b.ayah === item.ayah
  );
  if (i >= 0) list.splice(i, 1);
  else list.unshift(item);
  await saveJSON('quranBookmarks', list);
  return list;
}
export async function isBookmarked(surahNumber, ayah) {
  const list = await getBookmarks();
  return list.some((b) => b.surahNumber === surahNumber && b.ayah === ayah);
}

export async function getFontScale() {
  return await loadJSON('quranFontScale', 1);
}
export async function setFontScale(v) {
  await saveJSON('quranFontScale', v);
}
