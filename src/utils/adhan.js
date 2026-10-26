// Adhan (call to prayer) audio. Verified working URLs from the AlAdhan CDN.
// These stream as mp3 and can be previewed in-app.

export const ADHAN_SOUNDS = [
  { id: 'alafasy', label_en: 'Mishary Alafasy', label_tr: 'Mishary Alafasy', label_id: 'Mishary Alafasy', label_fr: 'Mishary Alafasy', label_de: 'Mishary Alafasy', label_es: 'Mishary Alafasy', label_ru: 'Мишари Аль-Афаси',
    url: 'https://cdn.aladhan.com/audio/adhans/a9.mp3' },
  { id: 'dubai', label_en: 'Dubai One (Alafasy)', label_tr: 'Dubai One (Alafasy)', label_id: 'Dubai One (Alafasy)', label_fr: 'Dubaï One (Alafasy)', label_de: 'Dubai One (Alafasy)', label_es: 'Dubái One (Alafasy)', label_ru: 'Дубай (Аль-Афаси)',
    url: 'https://cdn.aladhan.com/audio/adhans/a4.mp3' },
  { id: 'nafees', label_en: 'Ahmad al-Nafees', label_tr: 'Ahmad al-Nafees', label_id: 'Ahmad al-Nafees', label_fr: 'Ahmad al-Nafees', label_de: 'Ahmad al-Nafees', label_es: 'Ahmad al-Nafees', label_ru: 'Ахмад ан-Нафис',
    url: 'https://cdn.aladhan.com/audio/adhans/a1.mp3' },
  { id: 'ozcan', label_en: 'Hafiz Mustafa Özcan', label_tr: 'Hafız Mustafa Özcan', label_id: 'Hafiz Mustafa Özcan', label_fr: 'Hafiz Mustafa Özcan', label_de: 'Hafiz Mustafa Özcan', label_es: 'Hafiz Mustafa Özcan', label_ru: 'Хафиз Мустафа Озджан',
    url: 'https://cdn.aladhan.com/audio/adhans/a2.mp3' },
  { id: 'zahrani', label_en: 'Mansour Al-Zahrani', label_tr: 'Mansour Al-Zahrani', label_id: 'Mansour Al-Zahrani', label_fr: 'Mansour Al-Zahrani', label_de: 'Mansour Al-Zahrani', label_es: 'Mansour Al-Zahrani', label_ru: 'Мансур Аз-Захрани',
    url: 'https://cdn.aladhan.com/audio/adhans/a11-mansour-al-zahrani.mp3' },
  { id: 'silent', label_en: 'Silent (vibrate only)', label_tr: 'Sessiz (yalnızca titreşim)', label_id: 'Senyap (hanya getar)', label_fr: 'Silencieux (vibration seule)', label_de: 'Lautlos (nur Vibration)', label_es: 'Silencio (solo vibración)', label_ru: 'Без звука (вибрация)', url: null },
];

export function getAdhan(id) {
  return ADHAN_SOUNDS.find((a) => a.id === id) || ADHAN_SOUNDS[0];
}
