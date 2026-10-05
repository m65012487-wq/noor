import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import Text from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import GlassView from '../components/GlassView';
import { GlassContainer } from 'expo-glass-effect';
import { COLORS, SPACING, RADIUS, FONTS, TYPE, ARABIC } from '../constants/theme';
import { ALPHABET, INTRO, audioFor, letterName } from '../constants/alphabetCourse';
import {
  buildQuiz, completeIntro, completeLetter, completeQuiz, starsFor, getAlphabetProgress, isQuizPassed,
} from '../utils/alphabetEngine';
import { useAppearance } from '../utils/AppearanceContext';
import { playAsset, stopAudio } from '../utils/audioPlayer';
import { speakArabic, stopSpeech } from '../utils/speech';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import { ThemedBackground } from '../components/ScreenWrapper';

// Больше стольких шагов сегменты в полосе сливаются в крошки, поэтому
// вместо них рисуется сплошная полоса и счётчик.
const MAX_SEGMENTS = 12;

function LessonBg({ children }) {
  const insets = useSafeAreaInsets();
  // Dynamic Island needs real clearance; modals sometimes report 0 inset,
  // so guarantee a generous minimum.
  const topPad = Math.max(insets.top, 56);
  return (
    // Общий фон вместо собственного: раньше плеер уроков рисовал обои сам
    // и оставался с фотографией, когда выбрана узорная тема.
    <ThemedBackground>
      <View style={[styles.container, { paddingTop: topPad }]}>{children}</View>
    </ThemedBackground>
  );
}

// Запись элемента из бандла; если её нет, ничего не звучит.
function playKey(key, onFinish) {
  stopSpeech();
  const mod = audioFor(key);
  if (mod) playAsset(mod, onFinish);
}

// Верхняя полоса: закрытие, заголовок шага, прогресс и счётчик.
function TopBar({ title, step, total, onExit, accent }) {
  const segmented = total <= MAX_SEGMENTS;
  return (
    <View style={styles.topBarWrap}>
      <GlassView radius={RADIUS.md} style={styles.topBar}>
        <TouchableOpacity onPress={onExit} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.topMid}>
          <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
          {segmented ? (
            // Сегменты вместо сплошной полосы: видно, сколько всего шагов
            // и на каком идёшь. Заполненная доля этого не говорила.
            <View style={styles.progressTrack}>
              {Array.from({ length: total }).map((_, i) => (
                <View key={i} style={[styles.progressCell,
                  i < step && { backgroundColor: accent },
                  i === step && { backgroundColor: accent, opacity: 0.55 }]} />
              ))}
            </View>
          ) : (
            <View style={[styles.progressTrack, styles.progressSolid]}>
              <View style={[styles.progressBar, { backgroundColor: accent, width: `${((step + 1) / total) * 100}%` }]} />
            </View>
          )}
        </View>
        <Text style={styles.counter}>{step + 1} / {total}</Text>
      </GlassView>
    </View>
  );
}

// Крупная арабская карточка. Слова бывают длинными (اِسْتَعْظَمَ), поэтому
// текст ужимается в одну строку.
function ArCard({ text, onPress, hint }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassView azure radius={RADIUS.lg} style={styles.arCard}>
        <Text style={styles.arCardText} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.4}>{text}</Text>
        {hint && <Hint text={hint} />}
      </GlassView>
    </TouchableOpacity>
  );
}

function Hint({ text }) {
  return (
    <View style={styles.tapHintRow}>
      <Icon name="speaker" size={14} color={COLORS.textMuted} />
      <Text style={styles.tapHint}>{text}</Text>
    </View>
  );
}

// Экран итога: значок, заголовок, дополнительное содержимое и выход.
function DoneScreen({ badge, title, children, accent, onExit, t, action }) {
  return (
    <LessonBg>
      <View style={styles.doneWrap}>
        <View style={[styles.bigCircle, { borderColor: accent }]}>{badge}</View>
        <Text style={styles.doneTitle}>{title}</Text>
        {children}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accent, marginTop: SPACING.xl }]}
          onPress={action ? action.onPress : onExit}>
          <Text style={styles.primaryText}>{action ? action.label : t('continue_btn')}</Text>
        </TouchableOpacity>
        {action && (
          <TouchableOpacity style={styles.textBtn} onPress={onExit}>
            <Text style={styles.secondaryText}>{t('close_btn')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </LessonBg>
  );
}

export default function LessonPlayerScreen({ step, onExit }) {
  // Звук и речь обрываются при закрытии плеера.
  useEffect(() => () => { stopAudio(); stopSpeech(); }, []);

  if (step.type === 'intro') return <IntroPlayer onExit={onExit} />;
  if (step.type === 'letter') return <LetterPlayer letterId={step.letterId} onExit={onExit} />;
  return <QuizPlayer lessonIndex={step.lessonIndex} onExit={onExit} />;
}

// ---- Введение: диалог из 13 шагов ----
function IntroPlayer({ onExit }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const s = INTRO[idx];

  // Новый шаг — тишина.
  useEffect(() => { stopAudio(); stopSpeech(); }, [idx]);

  // Записи для вступления почти нет: без неё читает синтезатор речи.
  function playStep() {
    hapticLight();
    if (audioFor(s.audio)) playKey(s.audio);
    else { stopAudio(); speakArabic(s.ar); }
  }

  function onNext() {
    if (idx + 1 < INTRO.length) { setIdx(idx + 1); return; }
    stopAudio(); stopSpeech();
    completeIntro();
    hapticSuccess();
    setDone(true);
  }

  if (done) {
    return (
      <DoneScreen accent={accent} onExit={onExit} t={t} title={t('intro_done')}
        badge={<Icon name="check" size={56} color={accent} />} />
    );
  }

  return (
    <LessonBg>
      <TopBar title={t('alphabet_intro')} step={idx} total={INTRO.length} onExit={onExit} accent={accent} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <GlassView azure radius={RADIUS.lg} style={styles.textCard}>
          <Text style={styles.dialogText}>{lang === 'ru' ? s.text_ru : s.text_en}</Text>
        </GlassView>
        {!!s.ar && <ArCard text={s.ar} onPress={playStep} hint={t('tap_to_hear_q')} />}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accent }]} onPress={onNext}>
          <Text style={styles.primaryText}>{lang === 'ru' ? s.button_ru : s.button_en}</Text>
        </TouchableOpacity>
      </View>
    </LessonBg>
  );
}

// ---- Буква: сначала читаешь сам, потом проверяешь на записи ----
function LetterPlayer({ letterId, onExit }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
  const letter = ALPHABET.find((l) => l.id === letterId);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const total = letter.items.length;
  const item = letter.items[idx];

  // Запись по умолчанию не включается: методика требует прочитать самому.
  useEffect(() => { stopAudio(); stopSpeech(); }, [idx]);

  function onNext() {
    if (idx + 1 < total) { setIdx(idx + 1); return; }
    stopAudio();
    completeLetter(letter.id);
    hapticSuccess();
    setDone(true);
  }

  if (done) {
    return (
      <DoneScreen accent={accent} onExit={onExit} t={t} title={t('letter_done')}
        badge={<Text style={[styles.doneLetter, { color: accent }]}>{letter.ar}</Text>}>
        <Text style={styles.doneScore}>{letterName(letter, lang)}</Text>
      </DoneScreen>
    );
  }

  return (
    <LessonBg>
      <TopBar title={`${letterName(letter, lang)} · ${letter.ar}`} step={idx} total={total} onExit={onExit} accent={accent} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {idx === 0 ? (
          <>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { hapticLight(); playKey(item.key); }}>
              <GlassView azure radius={RADIUS.lg} style={styles.letterCard}>
                <Text style={styles.bigLetter}>{letter.ar}</Text>
                <Text style={styles.letterNameText}>{letterName(letter, lang)}</Text>
                <Hint text={t('tap_to_hear_q')} />
              </GlassView>
            </TouchableOpacity>
            <GlassView radius={RADIUS.lg} style={styles.textCard}>
              <Text style={styles.descText}>{lang === 'ru' ? letter.desc_ru : letter.desc_en}</Text>
            </GlassView>
          </>
        ) : (
          <>
            <View style={[styles.kindChip, { borderColor: accent }]}>
              <Text style={[styles.kindText, { color: accent }]}>{t(`kind_${item.kind}`)}</Text>
            </View>
            <ArCard text={item.ar} onPress={() => { hapticLight(); playKey(item.key); }} hint={t('read_first_hint')} />
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, styles.footerRow]}>
        <TouchableOpacity
          style={[styles.secondaryBtn, idx === 0 && styles.btnDisabled]}
          disabled={idx === 0}
          onPress={() => setIdx(idx - 1)}>
          <Text style={styles.secondaryText}>{t('step_prev')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rowPrimary, { backgroundColor: accent }]} onPress={onNext}>
          <Text style={styles.primaryText}>{t('continue_btn')}</Text>
        </TouchableOpacity>
      </View>
    </LessonBg>
  );
}

// У вариантов ответа разный вид: у букв есть id, у элементов — ключ записи.
const optId = (o) => (o.key !== undefined ? o.key : o.id);

// ---- Проверка после урока ----
function QuizPlayer({ lessonIndex, onExit }) {
  // Повтор проверки — новый набор вопросов, поэтому прохождение пересоздаётся.
  const [attempt, setAttempt] = useState(0);
  // Сдана ли проверка раньше: тогда слабый повтор урок не закрывает
  // и уговаривать пройти заново незачем.
  const [passedBefore, setPassedBefore] = useState(false);
  useEffect(() => {
    let alive = true;
    getAlphabetProgress().then((p) => { if (alive) setPassedBefore(isQuizPassed(p, lessonIndex)); });
    return () => { alive = false; };
  }, [lessonIndex]);
  return <QuizRun key={attempt} lessonIndex={lessonIndex} passedBefore={passedBefore}
    onExit={onExit} onRetry={() => setAttempt((a) => a + 1)} />;
}

function QuizRun({ lessonIndex, passedBefore, onExit, onRetry }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
  const [exercises] = useState(() => buildQuiz(lessonIndex));
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [matchPicks, setMatchPicks] = useState({}); // for match_pairs: { [letterId]: true }

  const ex = exercises[step];
  // Запись на карточке задания: для «услышь» — правильный элемент, для
  // «назови» — сама буква.
  const promptKey = ex.type === 'listen_choose' ? ex.correct.key
    : ex.type === 'name_choose' ? ex.correct.items[0].key : null;

  // Новый шаг — тишина; для «услышь и выбери» запись включается сама.
  useEffect(() => {
    stopAudio();
    if (ex.type === 'listen_choose') {
      const tmo = setTimeout(() => playKey(ex.correct.key), 400);
      return () => clearTimeout(tmo);
    }
  }, [ex]);

  function isCorrectAnswer() {
    if (ex.type === 'match_pairs') return ex.items.every((it) => matchPicks[it.id]);
    return selected && optId(selected) === optId(ex.correct);
  }

  function onCheck() {
    if (ex.type !== 'match_pairs' && !selected) return;
    setChecked(true);
    if (isCorrectAnswer()) { setCorrectCount((c) => c + 1); hapticLight(); }
  }

  function onContinue() {
    if (step + 1 < exercises.length) {
      setStep(step + 1); setSelected(null); setChecked(false); setMatchPicks({});
    } else {
      // finish
      stopAudio();
      completeQuiz(lessonIndex, starsFor(correctCount, exercises.length));
      hapticSuccess();
      setDone(true);
    }
  }

  if (done) {
    const stars = starsFor(correctCount, exercises.length);
    // Без звезды проверка не сдана: следующий урок закрыт, предлагаем повтор.
    const failed = stars < 1 && !passedBefore;
    return (
      <DoneScreen accent={accent} onExit={onExit} t={t} title={failed ? t('quiz_retry') : t('quiz_done')}
        action={failed ? { label: t('quiz_again'), onPress: onRetry } : null}
        badge={<Icon name={failed ? 'refresh' : 'check'} size={56} color={accent} />}>
        {failed && <Text style={styles.doneNote}>{t('quiz_need_star')}</Text>}
        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Icon key={i} name={i < stars ? 'star' : 'starOff'} size={40}
              color={i < stars ? COLORS.warning : 'rgba(255,255,255,0.3)'} style={{ marginHorizontal: 4 }} />
          ))}
        </View>
        <Text style={styles.doneScore}>{correctCount} / {exercises.length}</Text>
      </DoneScreen>
    );
  }

  return (
    <LessonBg>
      <TopBar title={`${t('lesson')} ${lessonIndex + 1} · ${t('alphabet_quiz')}`} step={step} total={exercises.length} onExit={onExit} accent={accent} />

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.prompt}>{promptFor(ex.type, t)}</Text>

        {/* Big audio button for listen exercises */}
        {ex.type === 'listen_choose' && (
          <TouchableOpacity onPress={() => playKey(promptKey)} activeOpacity={0.7}>
            <GlassView blur clip radius={48} azure noBorder={false} style={styles.speaker}>
              <Icon name="speakerHi" size={42} color={COLORS.white} />
            </GlassView>
          </TouchableOpacity>
        )}

        {/* Буква на карточке для вопроса про имя */}
        {ex.type === 'name_choose' && (
          <TouchableOpacity onPress={() => playKey(promptKey)}>
            <GlassView azure radius={RADIUS.lg} style={styles.promptCard}>
              <Text style={styles.promptAr}>{ex.correct.ar}</Text>
              <Hint text={t('tap_to_hear_q')} />
            </GlassView>
          </TouchableOpacity>
        )}

        {/* Options */}
        {ex.type === 'match_pairs'
          ? <MatchPairs ex={ex} lang={lang} picks={matchPicks} setPicks={setMatchPicks}
              onComplete={() => { setCorrectCount((c) => c + 1); setChecked(true); hapticLight(); }} />
          : (
            // Варианты собраны в GlassContainer: соседние стёкла сливаются
            // краями и список читается как одна поверхность, а не как стопка
            // отдельных плиток.
            <GlassContainer spacing={10} style={styles.options}>
              {ex.options.map((opt) => {
                const isSel = !!selected && optId(selected) === optId(opt);
                const isCorrectOpt = optId(opt) === optId(ex.correct);
                const showCorrect = checked && isCorrectOpt;
                const showWrong = checked && isSel && !isCorrectOpt;
                const showArabic = ex.type === 'listen_choose';
                const tintRgb = appearance?.tint || '150,200,225';
                // style priority: wrong > correct > selected > default
                const bgStyle = showWrong
                  ? { backgroundColor: 'rgba(192,86,63,0.35)', borderColor: COLORS.danger, borderWidth: 2 }
                  : showCorrect
                  ? { backgroundColor: 'rgba(76,175,114,0.35)', borderColor: COLORS.success, borderWidth: 2 }
                  : isSel
                  ? { backgroundColor: `rgba(${tintRgb},0.35)`, borderColor: accent, borderWidth: 2 }
                  : {};
                return (
                  <TouchableOpacity key={optId(opt)} disabled={checked} activeOpacity={0.8}
                    onPress={() => { setSelected(opt); if (showArabic) playKey(opt.key); }}>
                    <GlassView radius={RADIUS.md}
                      style={[styles.opt, bgStyle]}>
                      <Text style={[showArabic ? styles.optAr : styles.optText,
                        isSel && { fontWeight: "800", color: COLORS.white }]}>
                        {showArabic ? opt.ar : letterName(opt, lang)}
                      </Text>
                      {/* Значок исхода: одним цветом обходиться нельзя —
                          при дальтонизме верный и неверный ответ сливаются. */}
                      {checked && (showCorrect || showWrong) && (
                        <View style={styles.optMark}>
                          <Icon name={showCorrect ? "check" : "close"} size={18}
                            color={showCorrect ? COLORS.success : COLORS.danger} />
                        </View>
                      )}
                    </GlassView>
                  </TouchableOpacity>
                );
              })}
            </GlassContainer>
          )}
      </ScrollView>

      {/* Bottom feedback + action */}
      <View style={[styles.footer,
        checked && (isCorrectAnswer() ? styles.footerOk : styles.footerBad)]}>
        {checked && (
          <Text style={[styles.feedback, isCorrectAnswer() ? styles.fbOk : styles.fbBad]}>
            {isCorrectAnswer() ? `✓ ${t('correct')}` : `${t('incorrect')}`}
          </Text>
        )}
        {ex.type === 'match_pairs' && !checked ? (
          <Text style={styles.matchHint}>{t('match_hint')}</Text>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn,
              { backgroundColor: checked ? (isCorrectAnswer() ? COLORS.success : accent) : accent },
              (!checked && !selected) && styles.btnDisabled]}
            disabled={!checked && !selected}
            onPress={checked ? onContinue : onCheck}>
            <Text style={styles.primaryText}>{checked ? t('continue_btn') : t('check')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </LessonBg>
  );
}

function promptFor(type, t) {
  return { listen_choose: t('ex_listen'), name_choose: t('ex_name'), match_pairs: t('ex_match') }[type];
}

// Пары «буква — имя». picks хранит id уже соединённых букв.
function MatchPairs({ ex, lang, picks, setPicks, onComplete }) {
  const [activeLeft, setActiveLeft] = useState(null); // id выбранной буквы
  const [wrongPair, setWrongPair] = useState(null); // {left, right} briefly red
  const rights = React.useMemo(() => [...ex.items].sort(() => Math.random() - 0.5), [ex]);

  function pickLeft(it) {
    if (picks[it.id]) return; // already matched
    setActiveLeft(it.id);
  }
  function pickRight(rt) {
    if (!activeLeft) return;
    if (picks[rt.id]) return; // already used
    if (activeLeft === rt.id) {
      const next = { ...picks, [activeLeft]: true };
      setPicks(next);
      setActiveLeft(null);
      hapticLight();
      if (Object.keys(next).length === ex.items.length) {
        setTimeout(() => onComplete && onComplete(), 350);
      }
    } else {
      // wrong: flash red, then reset selection
      setWrongPair({ left: activeLeft, right: rt.id });
      setTimeout(() => { setWrongPair(null); setActiveLeft(null); }, 450);
    }
  }

  return (
    <View style={styles.matchRow}>
      <View style={styles.matchCol}>
        {ex.items.map((it) => {
          const matched = !!picks[it.id];
          const wrong = wrongPair && wrongPair.left === it.id;
          return (
            <TouchableOpacity key={it.id} onPress={() => pickLeft(it)} disabled={matched}>
              <GlassView radius={RADIUS.md} azure={activeLeft === it.id}
                style={[styles.matchCell, matched && styles.matchOk, wrong && styles.matchWrong]}>
                <Text style={styles.matchAr}>{it.ar}</Text>
              </GlassView>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.matchCol}>
        {rights.map((it) => {
          const used = !!picks[it.id];
          const wrong = wrongPair && wrongPair.right === it.id;
          return (
            <TouchableOpacity key={it.id} onPress={() => pickRight(it)} disabled={used}>
              <GlassView radius={RADIUS.md}
                style={[styles.matchCell, used && styles.matchOk, wrong && styles.matchWrong]}>
                <Text style={styles.matchText}>{letterName(it, lang)}</Text>
              </GlassView>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBarWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm },
  closeBtn: { padding: 6 },
  topMid: { flex: 1, marginHorizontal: SPACING.sm },
  topTitle: { ...TYPE.caption, color: COLORS.text, fontWeight: '700', marginBottom: SPACING.xs },
  progressTrack: { flexDirection: 'row', gap: 3 },
  progressCell: { flex: 1, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.16)' },
  // Сплошная полоса для длинных шагов: заливка растёт слева направо.
  progressSolid: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden', alignItems: 'stretch' },
  progressBar: { height: 6, borderRadius: 3 },
  counter: { ...TYPE.caption, color: COLORS.textMuted, minWidth: 44, textAlign: 'right', marginRight: SPACING.xs },
  prompt: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700', marginBottom: SPACING.lg, textAlign: 'center', letterSpacing: 0.2 },
  speaker: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, marginTop: SPACING.xs },
  starsRow: { flexDirection: 'row', marginTop: SPACING.md, marginBottom: SPACING.sm },
  promptCard: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg, marginHorizontal: SPACING.xl },
  promptAr: { ...ARABIC.xl, color: COLORS.white, fontFamily: FONTS.arabic },
  tapHint: { ...TYPE.caption, color: COLORS.textMuted, marginLeft: SPACING.xs, flexShrink: 1, textAlign: 'center' },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm },
  kindChip: { alignSelf: 'center', borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, marginBottom: SPACING.md },
  kindText: { ...TYPE.overline },
  textCard: { padding: SPACING.lg, marginBottom: SPACING.lg },
  dialogText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '500', lineHeight: 26 },
  descText: { ...TYPE.body, color: COLORS.text, lineHeight: 23 },
  // Читаемый элемент — главное на экране: крупно и по центру карточки.
  arCard: { alignItems: 'center', justifyContent: 'center', minHeight: 240, paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  arCardText: { fontSize: 64, lineHeight: 120, color: COLORS.white, fontFamily: FONTS.arabic, alignSelf: 'stretch', textAlign: 'center' },
  letterCard: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg },
  bigLetter: { fontSize: 96, lineHeight: 150, color: COLORS.white, fontFamily: FONTS.arabic },
  letterNameText: { ...TYPE.heading, color: COLORS.white, marginTop: SPACING.xs },
  options: { gap: SPACING.sm },
  opt: { paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  // Значок прижат к правому краю и не сдвигает текст с центра.
  optMark: { position: 'absolute', right: SPACING.md, top: 0, bottom: 0,
    justifyContent: 'center' },
  optAr: { ...ARABIC.lg, color: COLORS.white, fontFamily: FONTS.arabic },
  optText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '600' },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  matchCol: { flex: 1, gap: SPACING.sm },
  matchCell: { height: 60, alignItems: 'center', justifyContent: 'center' },
  matchOk: { opacity: 0.55, backgroundColor: 'rgba(76,175,114,0.28)', borderColor: COLORS.success, borderWidth: 1.5 },
  matchWrong: { borderColor: COLORS.danger, borderWidth: 2 },
  matchHint: { ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md },
  matchAr: { ...ARABIC.md, color: COLORS.white, fontFamily: FONTS.arabic },
  matchText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '600' },
  footer: { padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceStrong },
  footerRow: { flexDirection: 'row', gap: SPACING.sm },
  footerOk: { backgroundColor: 'rgba(76,175,114,0.12)' },
  footerBad: { backgroundColor: 'rgba(192,86,63,0.12)' },
  feedback: { ...TYPE.body, fontWeight: '700', marginBottom: SPACING.sm },
  fbOk: { color: COLORS.success },
  fbBad: { color: COLORS.danger },
  primaryBtn: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, width: '100%' },
  // В ряду кнопок «Назад» уже, «Дальше» занимает остаток.
  secondaryBtn: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, flex: 1,
    backgroundColor: COLORS.surfaceStrong },
  rowPrimary: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, flex: 2 },
  // Цвета схем светлые, поэтому текст на основной кнопке тёмный, как в тасбихе.
  primaryText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '800', textAlign: 'center' },
  secondaryText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700', textAlign: 'center' },
  textBtn: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, marginTop: SPACING.xs },
  btnDisabled: { opacity: 0.4 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  bigCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.lg },
  doneLetter: { fontSize: 64, lineHeight: 100, fontFamily: FONTS.arabic },
  doneTitle: { ...TYPE.title, color: COLORS.white, fontWeight: '800', textAlign: 'center' },
  doneScore: { ...TYPE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  doneNote: { ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm, maxWidth: 300 },
});
