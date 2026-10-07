import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import Text from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../components/Icon';
import GlassView from '../components/GlassView';
import { COLORS, SPACING, RADIUS, FONTS, TYPE } from '../constants/theme';
import { ALPHABET, LESSONS, INTRO, letterName } from '../constants/alphabetCourse';
import {
  getAlphabetProgress, isIntroDone, isLetterOpen, isQuizOpen, isQuizPassed, nextStep, lettersDone, totalStars,
} from '../utils/alphabetEngine';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { loadJSON, saveJSON } from '../utils/helpers';
import { SproutSays } from '../components/SproutGuide';

const stepKey = (s) => `${s.type}:${s.lessonIndex}:${s.letterId}`;

// Вложен во вкладку «Коран» (сегмент «Учиться»). Сверху сводка и кнопка
// «Продолжить», ниже вступление и уроки: каждый урок — карточка с сеткой
// своих букв и проверкой внизу. Закрытые уроки свёрнуты в одну строку.
export default function CoursePathScreen({ onOpen, refreshKey }) {
  const { t, lang } = useLang();
  const { accent, tint } = useAppearance();
  const tintRgba = (a) => `rgba(${tint || '190,205,220'},${a})`;
  const [progress, setProgress] = useState(null);
  // Урок, пройденный с прошлого раза: росток радуется ему, пока следующий
  // шаг тот же, что был в момент радости, — дальше зовёт к новому шагу.
  const [cheer, setCheer] = useState(null);

  const reload = useCallback(() => {
    (async () => {
      const p = await getAlphabetProgress();
      setProgress(p);
      // Число пройденных уроков запоминается, поэтому радость — один раз на
      // урок. При первом запуске ничего не празднуем, только запоминаем.
      const passed = LESSONS.filter((l) => isQuizPassed(p, l.index));
      const seen = await loadJSON('sproutCheered', null);
      if (seen !== null && passed.length > seen) {
        setCheer({ lesson: passed[passed.length - 1].index, at: stepKey(nextStep(p)) });
      }
      if (seen !== passed.length) await saveJSON('sproutCheered', passed.length);
    })();
  }, []);

  useFocusEffect(reload);
  React.useEffect(() => { reload(); }, [refreshKey, reload]);

  if (!progress) return null;

  const next = nextStep(progress);
  const introDone = isIntroDone(progress);
  const learned = lettersDone(progress);
  const isNext = (s) => next.type === s.type && next.lessonIndex === s.lessonIndex && next.letterId === s.letterId;

  // Что говорит росток: радуется пройденному или зовёт к следующему шагу.
  const cheering = !!cheer && cheer.at === stepKey(next);
  let speech;
  let mood = 'idle';
  if (next.type === 'done') { speech = t('sprout_course_done'); mood = 'happy'; }
  else if (cheering) { speech = t('sprout_lesson_done').replace('{n}', String(cheer.lesson + 1)); mood = 'happy'; }
  else if (next.type === 'intro') speech = t('sprout_hello');
  else if (next.type === 'quiz') speech = t('sprout_go_quiz');
  else {
    const letter = ALPHABET.find((l) => l.id === next.letterId);
    speech = t('sprout_go_letter').replace('{name}', letterName(letter, lang));
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
      <SproutSays text={speech} mood={mood} cheerKey={cheering ? cheer.lesson : undefined}
        style={styles.says} />
      <Summary t={t} lang={lang} accent={accent} tintRgba={tintRgba} next={next}
        learned={learned} stars={totalStars(progress)} onOpen={onOpen} />

      {/* Вступление — строка, а не узел: к нему возвращаются редко. */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => onOpen({ type: 'intro' })}>
        <GlassView radius={RADIUS.md} style={[styles.card, isNext({ type: 'intro' }) && { borderColor: accent, borderWidth: 1.5 }]}>
          <View style={styles.row}>
            <View style={[styles.badge, introDone ? { backgroundColor: accent } : { borderColor: accent, borderWidth: 1.5 }]}>
              <Icon name={introDone ? 'check' : 'info'} size={18} color={introDone ? COLORS.navy : accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>{t('alphabet_intro')}</Text>
              <Text style={styles.cardSub}>{t('intro_sub')} · {INTRO.length} {t('steps_short')}</Text>
            </View>
            <Icon name="forward" size={18} color={COLORS.textMuted} />
          </View>
        </GlassView>
      </TouchableOpacity>

      <Text style={styles.section}>{t('lessons_title')}</Text>

      {LESSONS.map((lesson) => (
        <LessonCard key={lesson.index} lesson={lesson} progress={progress} t={t} lang={lang}
          accent={accent} tintRgba={tintRgba} isNext={isNext} onOpen={onOpen} />
      ))}
    </ScrollView>
  );
}

// Сводка: что дальше, полоса прогресса и кнопка «Продолжить».
function Summary({ t, lang, accent, tintRgba, next, learned, stars, onOpen }) {
  const total = ALPHABET.length;
  let nextLabel = t('course_finished');
  if (next.type === 'intro') nextLabel = t('alphabet_intro');
  if (next.type === 'letter') {
    const letter = ALPHABET.find((l) => l.id === next.letterId);
    nextLabel = `${t('lesson')} ${next.lessonIndex + 1} · ${letterName(letter, lang)}  ${letter.ar}`;
  }
  if (next.type === 'quiz') nextLabel = `${t('lesson')} ${next.lessonIndex + 1} · ${t('alphabet_quiz')}`;

  return (
    <GlassView azure radius={RADIUS.lg} style={styles.summary}>
      <Text style={[styles.overline, { color: tintRgba(0.9) }]}>{t('course_name')}</Text>
      <Text style={styles.nextLabel} numberOfLines={1}>{nextLabel}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(learned / total) * 100}%`, backgroundColor: accent }]} />
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{learned} / {total} {t('letters_short')}</Text>
        <View style={styles.statStars}>
          <Icon name="star" size={14} color={COLORS.warning} />
          <Text style={styles.stat}> {stars}</Text>
        </View>
      </View>
      {next.type !== 'done' && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => onOpen(next)}
          style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <Text style={styles.primaryText}>{t('course_continue')}</Text>
        </TouchableOpacity>
      )}
    </GlassView>
  );
}

function LessonCard({ lesson, progress, t, lang, accent, tintRgba, isNext, onOpen }) {
  const open = isLetterOpen(progress, lesson.index, 0);
  const passed = isQuizPassed(progress, lesson.index);
  const quizOpen = isQuizOpen(progress, lesson.index);
  const stars = progress.quiz[lesson.index] || 0;
  const done = lesson.letters.filter((l) => progress.letters[l.id]).length;
  const current = open && !passed;
  // Шесть букв укладываются в два ряда по три, остальные уроки — в ряд по четыре.
  const cols = lesson.letters.length === 6 ? 3 : 4;
  const quizStep = { type: 'quiz', lessonIndex: lesson.index };

  return (
    <GlassView radius={RADIUS.lg} style={[styles.card, current && { borderColor: accent, borderWidth: 1.5 }]}>
      {/* Шапка урока: номер, состояние и буквы строкой */}
      <View style={styles.row}>
        <View style={[styles.badge,
          passed ? { backgroundColor: accent } : open ? { borderColor: accent, borderWidth: 1.5 } : styles.badgeLocked]}>
          {passed ? <Icon name="check" size={18} color={COLORS.navy} />
            : open ? <Text style={[styles.badgeNum, { color: accent }]}>{lesson.index + 1}</Text>
            : <Icon name="lock" size={15} color={COLORS.textMuted} />}
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.cardTitle, !open && styles.dim]}>{t('lesson')} {lesson.index + 1}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {open ? `${done} / ${lesson.letters.length} ${t('letters_short')}`
              : lesson.index === 0 ? t('lesson_after_intro') : t('lesson_locked')}
          </Text>
        </View>
        {passed ? <Stars n={stars} /> : (
          <Text style={[styles.lettersLine, !open && styles.dim]}>
            {lesson.letters.map((l) => l.ar).join(' ')}
          </Text>
        )}
      </View>

      {open && (
        <>
          <View style={styles.grid}>
            {lesson.letters.map((letter, pos) => {
              const letterOpen = isLetterOpen(progress, lesson.index, pos);
              const letterDone = !!progress.letters[letter.id];
              const step = { type: 'letter', lessonIndex: lesson.index, letterId: letter.id };
              const here = isNext(step);
              return (
                <View key={letter.id} style={{ width: `${100 / cols}%`, padding: SPACING.xs }}>
                  <TouchableOpacity disabled={!letterOpen} activeOpacity={0.85} onPress={() => onOpen(step)}
                    style={[styles.tile,
                      letterDone && { backgroundColor: tintRgba(0.16) },
                      here && { borderColor: accent, borderWidth: 1.5, backgroundColor: tintRgba(0.12) },
                      !letterOpen && styles.tileLocked]}>
                    <Text style={styles.tileAr}>{letter.ar}</Text>
                    <Text style={styles.tileName} numberOfLines={1}>{letterName(letter, lang)}</Text>
                    {letterDone && (
                      <View style={[styles.tileCheck, { backgroundColor: accent }]}>
                        <Icon name="check" size={10} color={COLORS.navy} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Проверка урока */}
          <TouchableOpacity disabled={!quizOpen} activeOpacity={0.85} onPress={() => onOpen(quizStep)}
            style={[styles.quizRow, isNext(quizStep) && { borderColor: accent, backgroundColor: tintRgba(0.12) },
              !quizOpen && styles.dim]}>
            <Icon name={quizOpen ? 'star' : 'lock'} size={16} color={quizOpen ? COLORS.warning : COLORS.textMuted} />
            <Text style={styles.quizText}>{t('quiz_lesson')}</Text>
            {quizOpen ? <Stars n={stars} /> : <Text style={styles.cardSub}>{t('quiz_after_letters')}</Text>}
          </TouchableOpacity>
        </>
      )}
    </GlassView>
  );
}

function Stars({ n }) {
  return (
    <View style={styles.stars}>
      {[0, 1, 2].map((s) => (
        <Icon key={s} name={n > s ? 'star' : 'starOff'} size={13}
          color={n > s ? COLORS.warning : 'rgba(255,255,255,0.28)'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  says: { marginBottom: SPACING.md, marginTop: SPACING.xs },
  summary: { padding: SPACING.md, marginBottom: SPACING.md },
  overline: { ...TYPE.overline },
  nextLabel: { ...TYPE.heading, color: COLORS.white, marginTop: SPACING.xs },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden',
    marginTop: SPACING.md },
  fill: { height: 6, borderRadius: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  stat: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: '600' },
  statStars: { flexDirection: 'row', alignItems: 'center' },
  primaryBtn: { borderRadius: RADIUS.pill, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.md },
  // Цвета схем светлые, поэтому текст на кнопке тёмный, как в тасбихе.
  primaryText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '700' },

  section: { ...TYPE.overline, color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: SPACING.sm,
    marginLeft: SPACING.xs },
  card: { padding: SPACING.md, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, marginLeft: SPACING.md },
  cardTitle: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  cardSub: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badgeLocked: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: COLORS.hairline, borderWidth: 1 },
  badgeNum: { ...TYPE.callout, fontWeight: '800' },
  lettersLine: { fontSize: 20, lineHeight: 34, color: COLORS.text, fontFamily: FONTS.arabic, marginLeft: SPACING.sm },
  dim: { opacity: 0.45 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm, marginHorizontal: -SPACING.xs },
  tile: { alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm, paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.hairline },
  tileLocked: { opacity: 0.35 },
  tileAr: { fontSize: 30, lineHeight: 52, color: COLORS.white, fontFamily: FONTS.arabic },
  tileName: { ...TYPE.caption, color: COLORS.textMuted, marginTop: -SPACING.xs, marginBottom: SPACING.xxs },
  tileCheck: { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center' },

  quizRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.hairline },
  quizText: { ...TYPE.callout, color: COLORS.white, fontWeight: '600', flex: 1, marginLeft: SPACING.sm },
  stars: { flexDirection: 'row', gap: 2 },
});
