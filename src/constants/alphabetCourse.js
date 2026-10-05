// Курс «Чтение по слогам» (методика приложения Arabic alphabet).
// 28 букв идут не по алфавиту, а в учебном порядке: сначала те, из которых
// быстрее складываются слова. У каждой буквы — сама буква, три огласовки,
// слоги с сукуном и слова только из уже пройденных букв; у каждого элемента
// своя живая запись. Буквы разбиты на 7 уроков, урок в день.
import { LETTER_ITEMS, DESC_RU, INTRO_RU, AUDIO } from './alphabetSource';

// Имена букв. В русском у трёх «Ха» и двух «Та» одно имя, а в упражнениях на
// сопоставление имена обязаны различаться, поэтому взяты имена из
// русскоязычной каиды: Хьа, Хо, То.
const NAMES = [
  ['Алиф', 'Alif'], ['Ра', 'Ra'], ['Зайн', 'Zay'], ['Мим', 'Mim'], ['Та', 'Ta'], ['Нун', 'Nun'], ['Йа', 'Ya'],
  ['Ба', 'Ba'], ['Кяф', 'Kaf'], ['Лям', 'Lam'], ['Уау', 'Waw'], ['Ха', 'Ha'], ['Фа', 'Fa'], ['Каф', 'Qaf'],
  ['Шин', 'Shin'], ['Син', 'Sin'], ['Са', 'Tha'], ['Сад', 'Ṣad'], ['То', 'Ṭa'], ['Джим', 'Jim'], ['Хо', 'Kha'],
  ['Хьа', 'Ḥa'], ['Гайн', 'Ghayn'], ['Айн', 'Ayn'], ['Даль', 'Dal'], ['Дад', 'Ḍad'], ['Заль', 'Dhal'], ['За', 'Ẓa'],
];

const DESC_EN = [
  'Alif is the 1st letter. A long vowel, pronounced as a long "a". Depending on the consonant before it, it can sound closer to a long "e". Does not join the next letter.',
  'Ra is the 10th letter. A rolled "r", more energetic than in English. Does not join the next letter.',
  'Zay is the 11th letter. Pronounced like "z" in "zoo". Does not join the next letter.',
  'Mim is the 24th letter. Pronounced like "m".',
  'Ta is the 3rd letter. Pronounced like "t".',
  'Nun is the 25th letter. Pronounced like "n".',
  'Ya is the 28th letter. Pronounced like "y" in "yes".',
  'Ba is the 2nd letter. Pronounced like "b".',
  'Kaf is the 22nd letter. Pronounced like "k", soft, as in "keep".',
  'Lam is the 23rd letter. A light "l", as in "leaf". Only rarely is it pronounced heavy.',
  'Waw is the 27th letter. A rounded "w", as in "water". Does not join the next letter.',
  'Ha is the 26th letter. A light breathy "h", as in "hat" — just voiced breath.',
  'Fa is the 20th letter. Pronounced like "f".',
  'Qaf is the 21st letter. Like "k", but much deeper in the throat — between the back of the tongue and the deepest part of the soft palate. A heavy consonant that deepens the vowels next to it.',
  'Shin is the 13th letter. Pronounced like "sh" in "shoe", softly.',
  'Sin is the 12th letter. Pronounced like "s".',
  'Tha is the 4th letter. Pronounced like the soft "th" in "think".',
  'Ṣad is the 14th letter. A heavy "s". Say a long, deep "a", as when a doctor checks your throat — that puts the tongue in place for ṣad. It deepens the vowels next to it.',
  'Ṭa is the 16th letter. A heavy "t" with the tongue pulled back and the jaw lowered. It deepens the vowels next to it.',
  'Jim is the 5th letter. Pronounced like "j" in "jam", softly.',
  'Kha is the 7th letter. A deep, rasping "kh", like "ch" in Scottish "loch".',
  'Ḥa is the 6th letter. A strong, breathy "h" with the throat slightly squeezed, like a forceful whisper.',
  'Ghayn is the 19th letter. Very close to the French rolled "r".',
  'Ayn is the 18th letter. Try to say "a" while squeezing the top of the throat so the air almost stops and the voice trembles.',
  'Dal is the 8th letter. Pronounced like "d". Does not join the next letter. Its tail does not drop below the line, unlike Ra.',
  'Ḍad is the 15th letter. Say "d", then pull the tongue back and lower the jaw. It deepens the vowels next to it.',
  'Dhal is the 9th letter. Pronounced like the hard "th" in "this". Does not join the next letter. Its tail does not drop below the line, unlike Zay.',
  'Ẓa is the 17th letter. A heavy, energetic "z" with the tongue tip touching the upper front teeth — otherwise it turns into an ordinary "z", which is Zay. It deepens the vowels next to it.',
];

const INTRO_EN = [
  { text: 'The Arabic alphabet has 28 letters. They are written from right to left, and there are no capital letters.\nLetters change shape slightly depending on where they stand in a word. Most letters join the previous one with a small connecting stroke.', button: 'Ok.' },
  { text: 'When the exact sound of a word matters (in the Quran and in dictionaries), short vowels are marked with signs:\n- A slanted stroke above a letter (fatha) means the sound "a".\n- A stroke below the letter (kasra) means "i".\n- A small hook above, like a tiny comma (damma), means "u".\n- A small circle above (sukun) means no vowel.', button: "I didn't get it, but let's go on." },
  { text: 'This is the letter B.', button: 'Ok.' },
  { text: 'Put a stroke above it and you get "Ba".', button: 'Ok.' },
  { text: 'Put the stroke below and you get "Bi".', button: 'Ok.' },
  { text: 'Put a comma above and you get "Bu".', button: 'Ok.' },
  { text: 'Add one more B and you get "Bab".', button: 'Ok.' },
  { text: '"Baba".', button: 'Ok.' },
  { text: 'Now try it yourself.', button: 'I read it!' },
  { text: 'Right, "babi". Once more.', button: 'I read it!' },
  { text: 'Correct, "bubi". Got the idea?', button: 'Got it. So how does the course work?' },
  { text: 'Words will appear on the screen — read each one yourself first. Then tap the word to hear it and check that you read it right.\nDon\'t try to memorise the letters, just read.', button: 'Deal.' },
  { text: 'All the letters are split into 7 lessons. Take one lesson a day, and before a new lesson quickly review the letters you already know.', button: "Let's start." },
];

// Первая буква каждого урока (номера с единицы, как в оригинале).
const LESSON_STARTS = [1, 5, 9, 13, 17, 23, 27];

const MARKS = /[ً-ْـ]/g;
function kindOf(ar, index) {
  if (index === 0) return 'letter';
  if (index <= 3) return 'vowel';
  return ar.replace(MARKS, '').length <= 2 ? 'syllable' : 'word';
}

export const ALPHABET = LETTER_ITEMS.map((items, i) => ({
  id: i + 1,
  ar: items[0],
  name_ru: NAMES[i][0],
  name_en: NAMES[i][1],
  desc_ru: DESC_RU[i],
  desc_en: DESC_EN[i],
  items: items.map((ar, k) => ({ ar, key: `${i + 1}-${k}`, kind: kindOf(ar, k) })),
}));

export const LESSONS = LESSON_STARTS.map((start, li) => {
  const end = li + 1 < LESSON_STARTS.length ? LESSON_STARTS[li + 1] : ALPHABET.length + 1;
  return { index: li, letters: ALPHABET.slice(start - 1, end - 1) };
});

// Записей для вступления в оригинале нет; совпадающие слоги буквы Ба озвучены
// её же записями, остальные — синтезатором речи.
const BA = ALPHABET[7];
const INTRO_AUDIO = { 'ب': BA.items[0].key, 'بَ': BA.items[1].key, 'بِ': BA.items[2].key, 'بُ': BA.items[3].key };

export const INTRO = INTRO_RU.map((step, i) => ({
  text_ru: step.text,
  button_ru: step.button,
  text_en: INTRO_EN[i].text,
  button_en: INTRO_EN[i].button,
  ar: step.ar,
  audio: INTRO_AUDIO[step.ar] || null,
}));

export function audioFor(key) {
  return key ? AUDIO[key] || null : null;
}

export function letterName(letter, lang) {
  return lang === 'ru' ? letter.name_ru : letter.name_en;
}
