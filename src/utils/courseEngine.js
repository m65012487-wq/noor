// Generates exercises for a lesson and tracks course progress.
import { loadJSON, saveJSON } from './helpers';
import { COURSE, EXERCISES_PER_LESSON, LESSONS_PER_UNIT } from '../constants/course';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(pool, correct, n) {
  return shuffle(pool.filter((x) => x.ar !== correct.ar)).slice(0, n);
}

// Build a list of exercises for one lesson of a unit.
export function buildLesson(unit, lessonIndex) {
  const pool = unit.items;
  const types = unit.vowels
    ? ['listen_choose', 'read_choose', 'name_choose', 'match_pairs']
    : ['listen_choose', 'name_choose', 'match_pairs', 'read_choose'];

  const exercises = [];
  for (let i = 0; i < EXERCISES_PER_LESSON; i++) {
    const type = types[i % types.length];
    if (type === 'match_pairs') {
      const four = shuffle(pool).slice(0, Math.min(4, pool.length));
      exercises.push({ type, items: four });
    } else {
      const correct = pool[(lessonIndex * EXERCISES_PER_LESSON + i) % pool.length];
      const distractors = pickDistractors(pool, correct, 3);
      const options = shuffle([correct, ...distractors]);
      exercises.push({ type, correct, options });
    }
  }
  return exercises;
}

// ---- Progress ----
// courseProgress: { 'u1': lessonsCompleted, ... }
// lessonStars:   { 'u1:0': 3, 'u1:1': 2, ... }  (best stars per lesson)
export async function getCourseProgress() {
  return await loadJSON('courseProgress', {});
}
export async function getLessonStars() {
  return await loadJSON('lessonStars', {});
}

// Convert accuracy (correct/total) to 0–3 stars.
export function starsFor(correct, total) {
  if (total <= 0) return 0;
  const acc = correct / total;
  if (acc >= 0.95) return 3;
  if (acc >= 0.75) return 2;
  if (acc >= 0.5) return 1;
  return 0;
}

export async function completeLesson(unitId, lessonIndex, stars) {
  const prog = await loadJSON('courseProgress', {});
  const done = prog[unitId] || 0;
  if (lessonIndex + 1 > done) prog[unitId] = lessonIndex + 1;
  await saveJSON('courseProgress', prog);
  // Keep the best star score for this lesson.
  const starsMap = await loadJSON('lessonStars', {});
  const key = `${unitId}:${lessonIndex}`;
  if (!starsMap[key] || stars > starsMap[key]) starsMap[key] = stars;
  await saveJSON('lessonStars', starsMap);
  return { prog, starsMap };
}

// Total stars earned across the whole course (for a headline number).
export function totalStars(starsMap) {
  return Object.values(starsMap || {}).reduce((a, b) => a + b, 0);
}

// Is a given unit unlocked? Unit N unlocks when previous unit fully done.
export function isUnitUnlocked(unitIndex, progress) {
  if (unitIndex === 0) return true;
  const prev = COURSE[unitIndex - 1];
  return (progress[prev.id] || 0) >= LESSONS_PER_UNIT;
}

export function unitLessonsDone(unitId, progress) {
  return progress[unitId] || 0;
}
