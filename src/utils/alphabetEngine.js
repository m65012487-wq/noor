// Прогресс курса «Чтение по слогам» и сборка проверки после урока.
// Путь строго последовательный: вступление, затем буквы урока одна за другой,
// затем проверка; следующий урок открывается, когда проверка предыдущего сдана
// хотя бы на одну звезду (половина верных ответов).
import { loadJSON, saveJSON } from './helpers';
import { ALPHABET, LESSONS, letterName } from '../constants/alphabetCourse';

export { letterName };

const KEY = 'alphabetProgress';
export const QUIZ_LENGTH = 8;
const OPTIONS = 4;

function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Прогресс ----
// { intro: bool, letters: { [letterId]: true }, quiz: { [lessonIndex]: лучшие звёзды 0..3 } }
function emptyProgress() {
  return { intro: false, letters: {}, quiz: {} };
}

// Сохранённое значение могло быть повреждено или неполным — достраиваем поля.
function normalize(p) {
  const src = p && typeof p === 'object' ? p : {};
  return {
    intro: src.intro === true,
    letters: src.letters && typeof src.letters === 'object' ? src.letters : {},
    quiz: src.quiz && typeof src.quiz === 'object' ? src.quiz : {},
  };
}

export async function getAlphabetProgress() {
  return normalize(await loadJSON(KEY, emptyProgress()));
}

export async function completeIntro() {
  const p = await getAlphabetProgress();
  p.intro = true;
  await saveJSON(KEY, p);
  return p;
}

export async function completeLetter(letterId) {
  const p = await getAlphabetProgress();
  p.letters[letterId] = true;
  await saveJSON(KEY, p);
  return p;
}

// Лучший результат не затирается более слабым прохождением.
export async function completeQuiz(lessonIndex, stars) {
  const p = await getAlphabetProgress();
  const prev = p.quiz[lessonIndex];
  if (prev === undefined || stars > prev) p.quiz[lessonIndex] = stars;
  await saveJSON(KEY, p);
  return p;
}

// ---- Правила открытия ----
// Проверка сдана, если за неё есть хотя бы одна звезда.
export function isQuizPassed(p, lessonIndex) {
  return (Number(normalize(p).quiz[lessonIndex]) || 0) >= 1;
}

export function isIntroDone(p) {
  return normalize(p).intro;
}

export function isLetterOpen(p, lessonIndex, letterPos) {
  const prog = normalize(p);
  if (!prog.intro) return false;
  const lesson = LESSONS[lessonIndex];
  if (!lesson || !lesson.letters[letterPos]) return false;
  if (letterPos > 0) return !!prog.letters[lesson.letters[letterPos - 1].id];
  if (lessonIndex === 0) return true;
  return isQuizPassed(prog, lessonIndex - 1);
}

export function isQuizOpen(p, lessonIndex) {
  const prog = normalize(p);
  const lesson = LESSONS[lessonIndex];
  return !!lesson && lesson.letters.every((l) => !!prog.letters[l.id]);
}

// Куда вести кнопкой «Продолжить».
export function nextStep(p) {
  const prog = normalize(p);
  if (!prog.intro) return { type: 'intro' };
  for (const lesson of LESSONS) {
    for (const letter of lesson.letters) {
      if (!prog.letters[letter.id]) return { type: 'letter', lessonIndex: lesson.index, letterId: letter.id };
    }
    if (!isQuizPassed(prog, lesson.index)) return { type: 'quiz', lessonIndex: lesson.index };
  }
  return { type: 'done' };
}

export function lettersDone(p) {
  const prog = normalize(p);
  return ALPHABET.filter((l) => prog.letters[l.id]).length;
}

export function totalStars(p) {
  return Object.values(normalize(p).quiz).reduce((a, b) => a + (Number(b) || 0), 0);
}

// Точность (верно/всего) в 0–3 звезды.
export function starsFor(correct, total) {
  if (total <= 0) return 0;
  const acc = correct / total;
  if (acc >= 0.95) return 3;
  if (acc >= 0.75) return 2;
  if (acc >= 0.5) return 1;
  return 0;
}

// ---- Проверка после урока ----
// Все буквы, пройденные к концу урока: этот и предыдущие.
function learnedLetters(lessonIndex) {
  return LESSONS.slice(0, lessonIndex + 1).flatMap((l) => l.letters);
}

// Элементы для вопросов: сама буква вынесена в отдельные вопросы про имя.
function quizItems(letters) {
  return letters.flatMap((l) => l.items.filter((it) => it.kind !== 'letter'));
}

// Берёт из пула по одному элементу нужного вида; если такого вида не хватило,
// добирает любым неиспользованным. ar в ответах не повторяются.
function pickItems(pool, kinds, used, rng) {
  const picked = [];
  for (const kind of kinds) {
    const free = shuffle(pool.filter((it) => !used.has(it.ar)), rng);
    const it = free.find((x) => x.kind === kind) || free[0];
    if (!it) continue;
    used.add(it.ar);
    picked.push(it);
  }
  return picked;
}

function listenExercise(correct, learnedPool, rng) {
  const same = learnedPool.filter((it) => it.kind === correct.kind && it.ar !== correct.ar);
  const distractors = [];
  const seen = new Set([correct.ar]);
  for (const it of shuffle(same, rng)) {
    if (seen.has(it.ar)) continue;
    seen.add(it.ar);
    distractors.push(it);
    if (distractors.length === OPTIONS - 1) break;
  }
  return { type: 'listen_choose', correct, options: shuffle([correct, ...distractors], rng) };
}

function nameExercise(letter, learned, rng) {
  const others = shuffle(learned.filter((l) => l.id !== letter.id), rng).slice(0, OPTIONS - 1);
  return { type: 'name_choose', correct: letter, options: shuffle([letter, ...others], rng) };
}

// 8 упражнений: 5 «услышь и выбери», 2 «назови букву», 1 «соедини пары».
// У уроков после первого одно из пяти — повторение пройденного.
export function buildQuiz(lessonIndex, rng = Math.random) {
  const lesson = LESSONS[lessonIndex];
  const learned = learnedLetters(lessonIndex);
  const learnedPool = quizItems(learned);
  const used = new Set();

  // Больше слов, чем слогов и огласовок: слова — цель методики.
  let correctItems;
  if (lessonIndex === 0) {
    correctItems = pickItems(quizItems(lesson.letters), ['word', 'word', 'word', 'syllable', 'vowel'], used, rng);
  } else {
    const current = pickItems(quizItems(lesson.letters), ['word', 'word', 'syllable', 'vowel'], used, rng);
    const earlier = pickItems(quizItems(learned.filter((l) => !lesson.letters.includes(l))), ['word'], used, rng);
    correctItems = [...current, ...earlier];
  }
  const listen = shuffle(correctItems, rng).map((it) => listenExercise(it, learnedPool, rng));

  // Имена: сначала буквы урока, при нехватке — из прежних.
  const earlierLetters = learned.filter((l) => !lesson.letters.includes(l));
  const named = [...shuffle(lesson.letters, rng), ...shuffle(earlierLetters, rng)].slice(0, 2);
  const names = named.map((l) => nameExercise(l, learned, rng));

  // Пары: буквы урока, недостающие добираются из прежних уроков.
  const pairs = [...shuffle(lesson.letters, rng), ...shuffle(earlierLetters, rng)].slice(0, 4);
  const match = { type: 'match_pairs', items: pairs };

  // Чередуем виды, чтобы подряд не шли однотипные вопросы.
  return [listen[0], listen[1], names[0], listen[2], listen[3], names[1], listen[4], match].filter(Boolean);
}
