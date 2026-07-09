// Structured Quran-reading course based on the classic Noorani Qaida method.
// Progression: letters -> letter forms -> short vowels (harakat) ->
// long vowels (madd) -> sukoon -> shadda -> tanwin -> blending words.
// Each lesson is bite-sized; tap any Arabic to hear it.

export const LESSONS = [
  {
    id: 1,
    title_en: 'Lesson 1 · The Letters',
    title_ru: 'Урок 1 · Буквы',
    intro_en: 'Start here. Learn to recognize each Arabic letter and its sound. Tap a letter to hear it. Practice 3–5 a day.',
    intro_ru: 'Начните отсюда. Научитесь узнавать каждую букву и её звук. Нажмите на букву, чтобы услышать. По 3–5 в день.',
    type: 'letters',
  },
  {
    id: 2,
    title_en: 'Lesson 2 · Letter Forms',
    title_ru: 'Урок 2 · Формы букв',
    intro_en: 'Most letters change shape depending on their position in a word: beginning, middle, or end. Here are the key ones.',
    intro_ru: 'Большинство букв меняют форму в зависимости от места в слове: начало, середина, конец. Вот основные.',
    type: 'forms',
  },
  {
    id: 3,
    title_en: 'Lesson 3 · Short Vowels (Harakat)',
    title_ru: 'Урок 3 · Огласовки (Харакят)',
    intro_en: 'Three small marks give letters their vowel sound: Fatha (a), Kasra (i), Damma (u). Tap to hear each.',
    intro_ru: 'Три знака дают букве гласный звук: Фатха (а), Касра (и), Дамма (у). Нажмите, чтобы услышать.',
    type: 'harakat',
  },
  {
    id: 4,
    title_en: 'Lesson 4 · Long Vowels (Madd)',
    title_ru: 'Урок 4 · Долгие гласные (Мадд)',
    intro_en: 'Alif after Fatha = "aa" (like car). Ya after Kasra = "ee" (like see). Waw after Damma = "oo" (like moon). Count softly: one… two.',
    intro_ru: 'Алиф после фатхи = «аа» (как в «car»). Йа после касры = «ии» (как в «see»). Вав после даммы = «уу» (как в «moon»). Считайте мягко: раз… два.',
    type: 'madd',
  },
  {
    id: 5,
    title_en: 'Lesson 5 · Sukoon (no vowel)',
    title_ru: 'Урок 5 · Сукун (без гласной)',
    intro_en: 'A small circle (ْ) means the letter has no vowel — you stop the sound sharply. Used to close syllables.',
    intro_ru: 'Маленький кружок (ْ) означает, что у буквы нет гласной — звук обрывается. Закрывает слог.',
    type: 'sukoon',
  },
  {
    id: 6,
    title_en: 'Lesson 6 · Shadda (doubling)',
    title_ru: 'Урок 6 · Шадда (удвоение)',
    intro_en: 'The shadda (ّ) doubles a letter — you press on it. Hold the sound a moment longer.',
    intro_ru: 'Шадда (ّ) удваивает букву — вы нажимаете на неё. Держите звук чуть дольше.',
    type: 'shadda',
  },
  {
    id: 7,
    title_en: 'Lesson 7 · Tanwin',
    title_ru: 'Урок 7 · Танвин',
    intro_en: 'Double vowel marks add an "n" sound: an, in, un. Often at the end of words.',
    intro_ru: 'Двойные огласовки добавляют звук «н»: ан, ин, ун. Часто в конце слов.',
    type: 'tanwin',
  },
  {
    id: 8,
    title_en: 'Lesson 8 · Blending into Words',
    title_ru: 'Урок 8 · Соединяем в слова',
    intro_en: 'Now read letters together slowly, then smoothly. Start with two letters, then three. Read aloud and repeat.',
    intro_ru: 'Теперь читайте буквы вместе — медленно, потом плавно. Сначала две буквы, потом три. Читайте вслух и повторяйте.',
    type: 'words',
  },
];

// Letter forms: isolated, initial, medial, final
export const LETTER_FORMS = [
  { name: 'Ba',  isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب', say: 'باء' },
  { name: 'Jim', isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج', say: 'جيم' },
  { name: 'Sin', isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس', say: 'سين' },
  { name: 'Ayn', isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع', say: 'عين' },
  { name: 'Kaf', isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك', say: 'كاف' },
  { name: 'Mim', isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم', say: 'ميم' },
  { name: 'Ha',  isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه', say: 'هاء' },
];

export const MADD_EXAMPLES = [
  { ar: 'بَا', tr: 'baa', hint_en: 'a as in car', hint_ru: 'а как в "car"', say: 'بَا' },
  { ar: 'بِي', tr: 'bee', hint_en: 'ee as in see', hint_ru: 'и как в "see"', say: 'بِي' },
  { ar: 'بُو', tr: 'boo', hint_en: 'oo as in moon', hint_ru: 'у как в "moon"', say: 'بُو' },
  { ar: 'قَا', tr: 'qaa', hint_en: 'stretch 2 counts', hint_ru: 'тяните 2 счёта', say: 'قَا' },
  { ar: 'نُو', tr: 'noo', hint_en: 'stretch 2 counts', hint_ru: 'тяните 2 счёта', say: 'نُو' },
];

export const SUKOON_EXAMPLES = [
  { ar: 'أَبْ', tr: 'ab', say: 'أَبْ' },
  { ar: 'أَتْ', tr: 'at', say: 'أَتْ' },
  { ar: 'مِنْ', tr: 'min', say: 'مِنْ' },
  { ar: 'قُلْ', tr: 'qul', say: 'قُلْ' },
];

export const SHADDA_EXAMPLES = [
  { ar: 'بَّ', tr: 'bba', say: 'أَبَّ' },
  { ar: 'رَّ', tr: 'rra', say: 'أَرَّ' },
  { ar: 'إِنَّ', tr: 'inna', say: 'إِنَّ' },
  { ar: 'رَبَّ', tr: 'rabba', say: 'رَبَّ' },
];

export const TANWIN_EXAMPLES = [
  { ar: 'بًا', tr: 'ban', say: 'بًا' },
  { ar: 'بٍ', tr: 'bin', say: 'بٍ' },
  { ar: 'بٌ', tr: 'bun', say: 'بٌ' },
  { ar: 'كِتَابًا', tr: 'kitaaban', say: 'كِتَابًا' },
];

export const WORD_BLENDING = [
  { ar: 'بَتَ', tr: 'ba-ta', say: 'بَتَ' },
  { ar: 'تَبَ', tr: 'ta-ba', say: 'تَبَ' },
  { ar: 'كَتَبَ', tr: 'ka-ta-ba (he wrote)', say: 'كَتَبَ' },
  { ar: 'قَرَأَ', tr: 'qa-ra-a (he read)', say: 'قَرَأَ' },
  { ar: 'نَصَرَ', tr: 'na-sa-ra (he helped)', say: 'نَصَرَ' },
  { ar: 'كِتَاب', tr: 'kitaab (book)', say: 'كِتَاب' },
];
