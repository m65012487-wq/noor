import { loadJSON, saveJSON } from './helpers';
import { fridayKey } from './prayerWindow';
import { publishFriday } from './widgetBridge';

// Пятничное чтение суры аль-Кахф — свой учёт, отдельно от ежедневного чтения:
// у того свои ключи (readingPos, readProgress, серия), и сура, прочитанная в
// пятницу, их не трогает. Здесь хранится только, докуда дочитано в эту пятницу.
// Новая пятница начинается с нуля сама: запись другой пятницы не считается.
export const KAHF = { number: 18, ayahs: 110, numberOfAyahs: 110, englishName: 'Al-Kahf',
  englishNameTranslation: 'The Cave', name: 'سورة الكهف' };
const KEY = 'fridayKahf:v1';

export async function loadKahf(now = new Date()) {
  const saved = await loadJSON(KEY, null);
  const friday = fridayKey(now);
  if (!saved || saved.friday !== friday) return { friday, ayah: 0, done: false };
  return { friday, ayah: Math.max(0, Math.min(KAHF.ayahs, saved.ayah | 0)), done: !!saved.done };
}

// Отмечает дочитанный аят; дальше назад не откатывается — пролистать вверх,
// чтобы перечитать, не значит потерять прогресс.
export async function saveKahfAyah(ayah, now = new Date()) {
  const current = await loadKahf(now);
  const next = Math.max(current.ayah, Math.min(KAHF.ayahs, ayah | 0));
  if (next === current.ayah && current.done === (next >= KAHF.ayahs)) return current;
  const value = { friday: current.friday, ayah: next, done: current.done || next >= KAHF.ayahs };
  await saveJSON(KEY, value);
  // Виджет показывает, докуда дочитано, — обновляем его сразу из читалки.
  publishFriday({ festive: (await loadJSON('festiveFriday', true)) !== false, ...value });
  return value;
}
