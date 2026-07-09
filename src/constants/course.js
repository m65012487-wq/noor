// Duolingo-style course for learning to read the Quran (Qaida method).
// A course = ordered UNITS. Each unit = ordered LESSONS.
// Each lesson generates EXERCISES from its item pool.
//
// Exercise types the engine understands:
//   'listen_choose'  : hear the sound, pick the matching Arabic from options
//   'name_choose'    : see Arabic, pick its name/sound (latin) from options
//   'match_pairs'    : match Arabic letters to their latin sounds
//   'read_choose'    : see Arabic (letter+vowel/word), pick how it reads
//
// Items are { ar, latin, say } where `say` is what the TTS speaks.

export const COURSE = [
  {
    id: 'u1', title_en: 'Unit 1 · First Letters', title_ru: 'Юнит 1 · Первые буквы',
    color: '#4a90d9',
    items: [
      { ar: 'ا', latin: 'Alif', say: 'أَلِف' },
      { ar: 'ب', latin: 'Ba', say: 'باء' },
      { ar: 'ت', latin: 'Ta', say: 'تاء' },
      { ar: 'ث', latin: 'Tha', say: 'ثاء' },
    ],
  },
  {
    id: 'u2', title_en: 'Unit 2 · Next Letters', title_ru: 'Юнит 2 · Следующие буквы',
    color: '#5aa0c9',
    items: [
      { ar: 'ج', latin: 'Jim', say: 'جيم' },
      { ar: 'ح', latin: 'Ḥa', say: 'حاء' },
      { ar: 'خ', latin: 'Kha', say: 'خاء' },
      { ar: 'د', latin: 'Dal', say: 'دال' },
    ],
  },
  {
    id: 'u3', title_en: 'Unit 3 · More Letters', title_ru: 'Юнит 3 · Ещё буквы',
    color: '#6ab0b9',
    items: [
      { ar: 'ذ', latin: 'Dhal', say: 'ذال' },
      { ar: 'ر', latin: 'Ra', say: 'راء' },
      { ar: 'ز', latin: 'Zay', say: 'زاي' },
      { ar: 'س', latin: 'Sin', say: 'سين' },
    ],
  },
  {
    id: 'u4', title_en: 'Unit 4 · More Letters', title_ru: 'Юнит 4 · Ещё буквы',
    color: '#7ab0a9',
    items: [
      { ar: 'ش', latin: 'Shin', say: 'شين' },
      { ar: 'ص', latin: 'Ṣad', say: 'صاد' },
      { ar: 'ض', latin: 'Ḍad', say: 'ضاد' },
      { ar: 'ط', latin: 'Ṭa', say: 'طاء' },
    ],
  },
  {
    id: 'u5', title_en: 'Unit 5 · More Letters', title_ru: 'Юнит 5 · Ещё буквы',
    color: '#8ab099',
    items: [
      { ar: 'ظ', latin: 'Ẓa', say: 'ظاء' },
      { ar: 'ع', latin: 'Ayn', say: 'عين' },
      { ar: 'غ', latin: 'Ghayn', say: 'غين' },
      { ar: 'ف', latin: 'Fa', say: 'فاء' },
    ],
  },
  {
    id: 'u6', title_en: 'Unit 6 · Last Letters', title_ru: 'Юнит 6 · Последние буквы',
    color: '#9ab089',
    items: [
      { ar: 'ق', latin: 'Qaf', say: 'قاف' },
      { ar: 'ك', latin: 'Kaf', say: 'كاف' },
      { ar: 'ل', latin: 'Lam', say: 'لام' },
      { ar: 'م', latin: 'Mim', say: 'ميم' },
      { ar: 'ن', latin: 'Nun', say: 'نون' },
      { ar: 'ه', latin: 'Ha', say: 'هاء' },
      { ar: 'و', latin: 'Waw', say: 'واو' },
      { ar: 'ي', latin: 'Ya', say: 'ياء' },
    ],
  },
  {
    id: 'u7', title_en: 'Unit 7 · Short Vowels', title_ru: 'Юнит 7 · Огласовки',
    color: '#c99a6a', vowels: true,
    items: [
      { ar: 'بَ', latin: 'ba', say: 'بَ' },
      { ar: 'بِ', latin: 'bi', say: 'بِ' },
      { ar: 'بُ', latin: 'bu', say: 'بُ' },
      { ar: 'تَ', latin: 'ta', say: 'تَ' },
      { ar: 'تِ', latin: 'ti', say: 'تِ' },
      { ar: 'تُ', latin: 'tu', say: 'تُ' },
    ],
  },
  {
    id: 'u8', title_en: 'Unit 8 · Long Vowels', title_ru: 'Юнит 8 · Долгие гласные',
    color: '#d98a8a', vowels: true,
    items: [
      { ar: 'بَا', latin: 'baa', say: 'بَا' },
      { ar: 'بِي', latin: 'bee', say: 'بِي' },
      { ar: 'بُو', latin: 'boo', say: 'بُو' },
      { ar: 'قَا', latin: 'qaa', say: 'قَا' },
      { ar: 'نُو', latin: 'noo', say: 'نُو' },
    ],
  },
  {
    id: 'u9', title_en: 'Unit 9 · Syllables I', title_ru: 'Юнит 9 · Слоги I',
    color: '#b97ac9', vowels: true,
    items: [
      { ar: 'بَ', latin: 'ba', say: 'بَ' },
      { ar: 'تُ', latin: 'tu', say: 'تُ' },
      { ar: 'سِ', latin: 'si', say: 'سِ' },
      { ar: 'مَ', latin: 'ma', say: 'مَ' },
      { ar: 'لُ', latin: 'lu', say: 'لُ' },
      { ar: 'نِ', latin: 'ni', say: 'نِ' },
    ],
  },
  {
    id: 'u10', title_en: 'Unit 10 · Syllables II', title_ru: 'Юнит 10 · Слоги II',
    color: '#a97ac9', vowels: true,
    items: [
      { ar: 'كَ', latin: 'ka', say: 'كَ' },
      { ar: 'رَ', latin: 'ra', say: 'رَ' },
      { ar: 'دُ', latin: 'du', say: 'دُ' },
      { ar: 'فِ', latin: 'fi', say: 'فِ' },
      { ar: 'حَ', latin: 'ha', say: 'حَ' },
      { ar: 'قُ', latin: 'qu', say: 'قُ' },
    ],
  },
  {
    id: 'u11', title_en: 'Unit 11 · First Words', title_ru: 'Юнит 11 · Первые слова',
    color: '#9a7ac9', vowels: true,
    items: [
      { ar: 'بَتَ', latin: 'bata', say: 'بَتَ' },
      { ar: 'كَتَبَ', latin: 'kataba', say: 'كَتَبَ' },
      { ar: 'قَرَأَ', latin: 'qaraa', say: 'قَرَأَ' },
      { ar: 'نَصَرَ', latin: 'nasara', say: 'نَصَرَ' },
      { ar: 'كِتَاب', latin: 'kitaab', say: 'كِتَاب' },
    ],
  },
  {
    id: 'u12', title_en: 'Unit 12 · Short Words I', title_ru: 'Юнит 12 · Короткие слова I',
    color: '#8a8ad9', vowels: true,
    items: [
      { ar: 'أَبْ', latin: 'ab (father)', say: 'أَبْ' },
      { ar: 'أُمّ', latin: 'umm (mother)', say: 'أُمّ' },
      { ar: 'يَدْ', latin: 'yad (hand)', say: 'يَدْ' },
      { ar: 'دَمْ', latin: 'dam (blood)', say: 'دَمْ' },
      { ar: 'بَيْت', latin: 'bayt (house)', say: 'بَيْت' },
      { ar: 'نُور', latin: 'noor (light)', say: 'نُور' },
    ],
  },
  {
    id: 'u13', title_en: 'Unit 13 · Short Words II', title_ru: 'Юнит 13 · Короткие слова II',
    color: '#7a9ad9', vowels: true,
    items: [
      { ar: 'مَاء', latin: 'maa (water)', say: 'مَاء' },
      { ar: 'نَار', latin: 'naar (fire)', say: 'نَار' },
      { ar: 'قَمَر', latin: 'qamar (moon)', say: 'قَمَر' },
      { ar: 'شَمْس', latin: 'shams (sun)', say: 'شَمْس' },
      { ar: 'كِتَاب', latin: 'kitaab (book)', say: 'كِتَاب' },
      { ar: 'قَلَم', latin: 'qalam (pen)', say: 'قَلَم' },
    ],
  },
  {
    id: 'u14', title_en: 'Unit 14 · Quran Words', title_ru: 'Юнит 14 · Слова из Корана',
    color: '#6aaad9', vowels: true,
    items: [
      { ar: 'اللَّه', latin: 'Allah', say: 'اللَّه' },
      { ar: 'رَبّ', latin: 'Rabb (Lord)', say: 'رَبّ' },
      { ar: 'رَحْمَن', latin: 'Rahman', say: 'رَحْمَٰن' },
      { ar: 'رَحِيم', latin: 'Raheem', say: 'رَحِيم' },
      { ar: 'حَمْد', latin: 'hamd (praise)', say: 'حَمْد' },
      { ar: 'دِين', latin: 'deen (faith)', say: 'دِين' },
    ],
  },
];

// How many lessons per unit (each lesson = a fixed number of exercises).
export const LESSONS_PER_UNIT = 3;
export const EXERCISES_PER_LESSON = 6;
