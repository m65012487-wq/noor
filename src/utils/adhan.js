// Adhan (call to prayer) audio. Verified working URLs from the AlAdhan CDN.
// These stream as mp3 and can be previewed in-app.

export const ADHAN_SOUNDS = [
  { id: 'alafasy', label_en: 'Mishary Alafasy', label_ru: 'Мишари Аль-Афаси',
    url: 'https://cdn.aladhan.com/audio/adhans/a9.mp3' },
  { id: 'dubai', label_en: 'Dubai One (Alafasy)', label_ru: 'Дубай (Аль-Афаси)',
    url: 'https://cdn.aladhan.com/audio/adhans/a4.mp3' },
  { id: 'nafees', label_en: 'Ahmad al-Nafees', label_ru: 'Ахмад ан-Нафис',
    url: 'https://cdn.aladhan.com/audio/adhans/a1.mp3' },
  { id: 'ozcan', label_en: 'Hafiz Mustafa Özcan', label_ru: 'Хафиз Мустафа Озджан',
    url: 'https://cdn.aladhan.com/audio/adhans/a2.mp3' },
  { id: 'zahrani', label_en: 'Mansour Al-Zahrani', label_ru: 'Мансур Аз-Захрани',
    url: 'https://cdn.aladhan.com/audio/adhans/a11-mansour-al-zahrani.mp3' },
  { id: 'silent', label_en: 'Silent (vibrate only)', label_ru: 'Без звука (вибрация)', url: null },
];

export function getAdhan(id) {
  return ADHAN_SOUNDS.find((a) => a.id === id) || ADHAN_SOUNDS[0];
}
