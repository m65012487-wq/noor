// Курс «Чтение по слогам» (методика приложения Arabic alphabet).
// 28 букв идут не по алфавиту, а в учебном порядке: сначала те, из которых
// быстрее складываются слова. У каждой буквы — сама буква, три огласовки,
// слоги с сукуном и слова только из уже пройденных букв; у каждого элемента
// своя живая запись. Буквы разбиты на 7 уроков, урок в день.
import { LETTER_ITEMS, AUDIO } from './alphabetSource';

// Имена букв. В русском у трёх «Ха» и двух «Та» одно имя, а в упражнениях на
// сопоставление имена обязаны различаться, поэтому взяты имена из
// русскоязычной каиды: Хьа, Хо, То.
const NAMES = [
  ['Алиф', 'Alif'], ['Ра', 'Ra'], ['Зайн', 'Zay'], ['Мим', 'Mim'], ['Та', 'Ta'], ['Нун', 'Nun'], ['Йа', 'Ya'],
  ['Ба', 'Ba'], ['Кяф', 'Kaf'], ['Лям', 'Lam'], ['Уау', 'Waw'], ['Ха', 'Ha'], ['Фа', 'Fa'], ['Каф', 'Qaf'],
  ['Шин', 'Shin'], ['Син', 'Sin'], ['Са', 'Tha'], ['Сад', 'Ṣad'], ['То', 'Ṭa'], ['Джим', 'Jim'], ['Хо', 'Kha'],
  ['Хьа', 'Ḥa'], ['Гайн', 'Ghayn'], ['Айн', 'Ayn'], ['Даль', 'Dal'], ['Дад', 'Ḍad'], ['Заль', 'Dhal'], ['За', 'Ẓa'],
];

// Карточка буквы вместо сплошного абзаца: место в алфавите, звук одной
// строкой, подсказка к произношению и два признака — не соединяется со
// следующей буквой и твёрдая (делает гласные рядом глубже).
// [номер в алфавите, звук ru, звук en, подсказка ru, подсказка en, флаги]
// Флаги: 'n' — не соединяется со следующей, 'h' — твёрдая.
const INFO = [
  [1, 'долгое «а»', 'long "aa"', 'С огласовкой (اَ اِ اُ) читается просто «а», «и», «у». Без неё тянет гласную перед собой: بَا — «баа».', 'With a vowel mark (اَ اِ اُ) it reads simply "a", "i", "u". Without one it lengthens the vowel before it: بَا — "baa".', 'n'],
  [10, 'раскатистое «р»', 'rolled "r"', 'Энергичнее русского «р»: кончик языка дрожит у нёба.', 'More energetic than the English "r": the tongue tip trills against the palate.', 'n'],
  [11, '«з», как в «зима»', '"z", as in "zoo"', null, null, 'n'],
  [24, '«м»', '"m"', null, null, ''],
  [3, '«т», как в «том»', '"t", as in "tea"', 'Кончик языка у верхних зубов, без смягчения и придыхания: «та», а не «тя».', 'Tongue tip at the upper teeth, without a puff of air.', ''],
  [25, '«н»', '"n"', null, null, ''],
  [28, '«й»', '"y", as in "yes"', 'После кясры тянет «и»: بِي — «бии».', 'After kasra it lengthens "i": بِي — "bee".', ''],
  [2, '«б»', '"b"', null, null, ''],
  [22, '«к», как в «кепка»', 'light "k", as in "keep"', 'Произносится у переднего нёба, не путайте с глубоким Каф (ق).', 'Made at the front of the palate — not the deep Qaf (ق).', ''],
  [23, 'лёгкое «л»', 'light "l", as in "leaf"', 'Редко звучит твёрдо, как русское «л» в «лук», — например, в слове «Аллах» после «а» или «у».', 'It sounds heavy only rarely — in "Allah" after "a" or "u".', ''],
  [27, 'губное «w», как в «water»', '"w", as in "water"', 'Губы округляются, как для «у», и сразу раскрываются. После даммы тянет «у»: بُو — «буу».', 'Round the lips as for "u" and open them at once. After damma it lengthens "u": بُو — "boo".', 'n'],
  [26, 'лёгкое «h» на выдохе', 'light breathy "h"', 'Как английское «h» в «hat»: просто выдох, как при согревании рук, без хрипа.', 'As in "hat": just a breath of air, no friction.', ''],
  [20, '«ф»', '"f"', null, null, ''],
  [21, 'глубокое «к»', 'deep "q"', 'Корень языка касается самой дальней части нёба — глубже русского «к».', 'The back of the tongue touches the far end of the palate — deeper than "k".', 'h'],
  [13, 'мягкое «ш»', '"sh", as in "shoe"', 'Мягче русского «ш».', 'Soft, never harsh.', ''],
  [12, '«с»', '"s"', null, null, ''],
  [4, 'глухое межзубное «th», как в «think»', '"th", as in "think"', 'Кончик языка между зубами, без голоса.', 'Tongue tip between the teeth, no voice.', ''],
  [14, 'твёрдое «с»', 'heavy "s"', 'Опустите челюсть и отведите язык назад, как при глубоком «а» у врача.', 'Lower the jaw and pull the tongue back, as for a deep "a" at the doctor.', 'h'],
  [16, 'твёрдое «т»', 'heavy "t"', 'Язык отведён назад, челюсть опущена.', 'Tongue pulled back, jaw lowered.', 'h'],
  [5, 'мягкое «дж»', '"j", as in "jam"', null, null, ''],
  [7, 'хриплое «х»', 'rasping "kh", as in "loch"', 'Глубже русского «х», с лёгким трением в горле, как в шотландском «loch».', 'Deep in the throat with light friction, like the Scottish "loch".', 'h'],
  [6, 'сильное «h» с придыханием', 'strong breathy "ḥ"', 'Горло слегка сжато, как при сильном шёпоте, — но без хрипа.', 'Squeeze the throat slightly, like a forceful whisper — no rasp.', ''],
  [19, 'картавое «р», как во французском', 'French-style "r", deep and voiced', 'Звучит в горле, голос включён.', 'Made in the throat, with voice.', 'h'],
  [18, 'гортанный звук', 'throat sound', 'Скажите «а», сжав верх горла: голос дрожит, воздух почти перекрыт.', 'Say "a" while squeezing the top of the throat: the voice trembles, the air almost stops.', ''],
  [8, '«д»', '"d"', 'Хвостик не опускается ниже строки — в отличие от Ра (ر).', 'Its tail stays on the line — unlike Ra (ر).', 'n'],
  [15, 'твёрдое «д»', 'heavy "d"', 'Скажите «д», отведите язык назад и опустите челюсть.', 'Say "d", then pull the tongue back and lower the jaw.', 'h'],
  [9, 'звонкое межзубное «th», как в «this»', '"th", as in "this"', 'Кончик языка между зубами, с голосом. Хвостик не опускается ниже строки — в отличие от Зайн (ز).', 'Tongue tip between the teeth, with voice. Its tail stays on the line — unlike Zay (ز).', 'n'],
  [17, 'твёрдое «з»', 'heavy "ẓ"', 'Кончик языка касается верхних передних зубов — иначе выйдет обычный Зайн (ز).', 'The tongue tip touches the upper front teeth — otherwise it becomes a plain Zay (ز).', 'h'],
];

// Первая буква каждого урока (номера с единицы, как в оригинале).
const LESSON_STARTS = [1, 5, 9, 13, 17, 23, 27];

const MARKS = /[ً-ْـ]/g;
function kindOf(ar, index) {
  if (index === 0) return 'letter';
  if (index <= 3) return 'vowel';
  return ar.replace(MARKS, '').length <= 2 ? 'syllable' : 'word';
}

export const ALPHABET = LETTER_ITEMS.map((items, i) => {
  const [order, soundRu, soundEn, tipRu, tipEn, flags] = INFO[i];
  return {
    id: i + 1,
    ar: items[0],
    name_ru: NAMES[i][0],
    name_en: NAMES[i][1],
    order,
    sound_ru: soundRu,
    sound_en: soundEn,
    tip_ru: tipRu,
    tip_en: tipEn,
    joinsNext: !flags.includes('n'),
    heavy: flags.includes('h'),
    items: items.map((ar, k) => ({ ar, key: `${i + 1}-${k}`, kind: kindOf(ar, k) })),
  };
});

export const LESSONS = LESSON_STARTS.map((start, li) => {
  const end = li + 1 < LESSON_STARTS.length ? LESSON_STARTS[li + 1] : ALPHABET.length + 1;
  return { index: li, letters: ALPHABET.slice(start - 1, end - 1) };
});

// Записей для вступления в оригинале нет. Синтезатор речи здесь не звучит:
// буква и слоги озвучены записями буквы Ба, сукун — записью «аб» (اَبْ) из её
// же урока, а связки «ба-ба», «ба-би», «бу-би» собраны из записей слогов тем
// же диктором (scripts/alphabet/build_intro_audio.py).
const BA = ALPHABET[7];
const INTRO_FILES = {
  'intro-baba': require('../../assets/alphabet/intro-baba.m4a'),
  'intro-babi': require('../../assets/alphabet/intro-babi.m4a'),
  'intro-bubi': require('../../assets/alphabet/intro-bubi.m4a'),
};
const INTRO_AUDIO = {
  'ب': BA.items[0].key, 'بَ': BA.items[1].key, 'بِ': BA.items[2].key, 'بُ': BA.items[3].key,
  'اَبْ': BA.items[4].key,
  'بَبَ': 'intro-baba', 'بَبِ': 'intro-babi', 'بُبِ': 'intro-bubi',
};

// Вступление: короткие шаги вместо абзацев. У шага может быть заголовок,
// текст, пункты списком, таблица огласовок и арабская карточка для чтения.
const step = (s) => ({
  title_ru: null, title_en: null, points: null, marks: null, ar: '', ...s,
  audio: s.ar ? INTRO_AUDIO[s.ar] || null : null,
});

export const INTRO = [
  step({
    title_ru: 'Арабский алфавит', title_en: 'The Arabic alphabet',
    text_ru: '28 букв — и вот что о них важно знать:', text_en: '28 letters — here is what matters:',
    points: [
      { ru: 'Пишутся и читаются справа налево.', en: 'Written and read from right to left.' },
      { ru: 'Заглавных букв нет.', en: 'There are no capital letters.' },
      { ru: 'Большинство букв соединяются со следующей и от этого слегка меняют форму.', en: 'Most letters join the next one and change shape slightly.' },
    ],
    button_ru: 'Понятно', button_en: 'Got it',
  }),
  step({
    title_ru: 'Огласовки', title_en: 'Vowel marks',
    text_ru: 'Короткие гласные не пишутся буквами — их ставят значком над буквой или под ней. Нажмите на строку, чтобы услышать.',
    text_en: 'Short vowels are not letters — they are marks above or below a letter. Tap a row to hear it.',
    marks: [
      { ar: 'بَ', name_ru: 'Фатха', name_en: 'Fatha', where_ru: 'чёрточка сверху', where_en: 'stroke above', sound: 'а', sound_en: 'a' },
      { ar: 'بِ', name_ru: 'Кясра', name_en: 'Kasra', where_ru: 'чёрточка снизу', where_en: 'stroke below', sound: 'и', sound_en: 'i' },
      { ar: 'بُ', name_ru: 'Дамма', name_en: 'Damma', where_ru: 'запятая сверху', where_en: 'small hook above', sound: 'у', sound_en: 'u' },
      // Согласный без гласной отдельно не произносится, поэтому образец
      // сукуна — слог «аб»: Алиф с фатхой даёт «а», Ба с сукуном его закрывает.
      { ar: 'اَبْ', name_ru: 'Сукун', name_en: 'Sukun', where_ru: 'кружок сверху — гласной нет', where_en: 'small circle above — no vowel', sound: 'аб', sound_en: 'ab' },
    ].map((m) => ({ ...m, audio: INTRO_AUDIO[m.ar] || null })),
    button_ru: 'Дальше', button_en: 'Next',
  }),
  step({ text_ru: 'Это буква Ба — звук «б».', text_en: 'This is the letter Ba — the sound "b".', ar: 'ب', button_ru: 'Дальше', button_en: 'Next' }),
  step({ text_ru: 'Фатха сверху — читаем «ба».', text_en: 'Fatha above — it reads "ba".', ar: 'بَ', button_ru: 'Дальше', button_en: 'Next' }),
  step({ text_ru: 'Кясра снизу — читаем «би».', text_en: 'Kasra below — it reads "bi".', ar: 'بِ', button_ru: 'Дальше', button_en: 'Next' }),
  step({ text_ru: 'Дамма сверху — читаем «бу».', text_en: 'Damma above — it reads "bu".', ar: 'بُ', button_ru: 'Дальше', button_en: 'Next' }),
  step({ text_ru: 'Кружок — сукун: после буквы гласной нет. Алиф с фатхой даёт «а», Ба с сукуном закрывает слог: «аб».', text_en: 'The small circle is sukun: no vowel after the letter. Alif with fatha gives "a", Ba with sukun closes the syllable: "ab".', ar: 'اَبْ', button_ru: 'Дальше', button_en: 'Next' }),
  step({ text_ru: 'Две буквы, у обеих фатха: «ба-ба».', text_en: 'Two letters, both with fatha: "ba-ba".', ar: 'بَبَ', button_ru: 'Дальше', button_en: 'Next' }),
  step({ text_ru: 'Теперь сами: прочитайте вслух по слогам, потом нажмите на карточку и сверьте.', text_en: 'Now you: read it aloud syllable by syllable, then tap the card to check.', ar: 'بَبِ', button_ru: 'Я прочитал', button_en: 'I read it' }),
  step({ text_ru: 'Это «ба-би». Ещё одно:', text_en: 'That was "ba-bi". One more:', ar: 'بُبِ', button_ru: 'Я прочитал', button_en: 'I read it' }),
  step({ text_ru: 'Верно — «бу-би». Принцип понятен: буква даёт согласный, огласовка — гласный.', text_en: 'Right — "bu-bi". That is the whole idea: the letter gives the consonant, the mark gives the vowel.', button_ru: 'Как устроен курс?', button_en: 'How does the course work?' }),
  step({
    title_ru: 'Как заниматься', title_en: 'How to practise',
    points: [
      { ru: 'По одной появляются огласовки, слоги и слова.', en: 'Vowels, syllables and words appear one at a time.' },
      { ru: 'Сначала прочитайте вслух сами.', en: 'Read each one aloud yourself first.' },
      { ru: 'Потом нажмите на карточку и сверьте с записью.', en: 'Then tap the card and check against the recording.' },
      { ru: 'Буквы не заучивайте — просто читайте.', en: 'Don\'t memorise letters — just read.' },
    ],
    button_ru: 'Дальше', button_en: 'Next',
  }),
  step({
    title_ru: '7 уроков', title_en: '7 lessons',
    points: [
      { ru: 'В уроке несколько новых букв и проверка в конце.', en: 'Each lesson has a few new letters and a quiz at the end.' },
      { ru: 'Один урок в день.', en: 'One lesson a day.' },
      { ru: 'Перед новым уроком бегло повторите прошлые буквы.', en: 'Before a new lesson, quickly review the letters you know.' },
    ],
    button_ru: 'Начать', button_en: 'Start',
  }),
];

export function audioFor(key) {
  return key ? AUDIO[key] || INTRO_FILES[key] || null : null;
}

export function letterName(letter, lang) {
  return lang === 'ru' ? letter.name_ru : letter.name_en;
}
