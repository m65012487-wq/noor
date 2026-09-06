import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Animated } from 'react-native';
import Text from '../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import GlassView from '../components/GlassView';
import { GlassContainer } from 'expo-glass-effect';
import { COLORS, SPACING, RADIUS, FONTS, TYPE, ARABIC } from '../constants/theme';
import { COURSE } from '../constants/course';
import { buildLesson, completeLesson, starsFor } from '../utils/courseEngine';
import { useAppearance } from '../utils/AppearanceContext';
import { speakArabic, stopSpeech } from '../utils/speech';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import { ThemedBackground } from '../components/ScreenWrapper';

function LessonBg({ children }) {
  const insets = useSafeAreaInsets();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
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

export default function LessonPlayerScreen({ unitIndex, lessonIndex, onExit }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
  const unit = COURSE[unitIndex];
  const [exercises] = useState(() => buildLesson(unit, lessonIndex));
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [matchPicks, setMatchPicks] = useState({}); // for match_pairs

  const ex = exercises[step];
  const progress = (step / exercises.length);

  // Auto-play the sound for listen exercises.
  useEffect(() => {
    if (ex && ex.type === 'listen_choose' && ex.correct) {
      const tmo = setTimeout(() => speakArabic(ex.correct.say), 400);
      return () => clearTimeout(tmo);
    }
  }, [step]);

  // Stop any speech when the lesson unmounts.
  useEffect(() => () => stopSpeech(), []);

  function isCorrectAnswer() {
    if (ex.type === 'match_pairs') {
      return ex.items.every((it) => matchPicks[it.ar] === it.latin);
    }
    return selected && selected.ar === ex.correct.ar;
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
      const stars = starsFor(correctCount, exercises.length);
      completeLesson(unit.id, lessonIndex, stars);
      hapticSuccess();
      setDone(true);
    }
  }

  if (done) {
    const stars = starsFor(correctCount, exercises.length);
    return (
      <LessonBg>
        <View style={styles.doneWrap}>
          <View style={[styles.bigCircle, { borderColor: accent }]}>
            <Icon name="check" size={56} color={accent} />
          </View>
          <Text style={styles.doneTitle}>{t('lesson_done')}</Text>
          <View style={styles.starsRow}>
            {[0, 1, 2].map((i) => (
              <Icon key={i} name={i < stars ? 'star' : 'starOff'} size={40}
                color={i < stars ? COLORS.warning : 'rgba(255,255,255,0.3)'} style={{ marginHorizontal: 4 }} />
            ))}
          </View>
          <Text style={styles.doneScore}>{correctCount} / {exercises.length}</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accent }]} onPress={onExit}>
            <Text style={styles.primaryText}>{t('continue_btn')}</Text>
          </TouchableOpacity>
        </View>
      </LessonBg>
    );
  }

  return (
    <LessonBg>
      {/* Top bar: close + progress — lowered and on a glass strip */}
      <View style={styles.topBarWrap}>
        <GlassView radius={RADIUS.pill} style={styles.topBar}>
          <TouchableOpacity onPress={onExit} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          {/* Сегменты вместо сплошной полосы: видно, сколько всего вопросов
              и на каком идёшь. Заполненная доля этого не говорила. */}
          <View style={styles.progressTrack}>
            {exercises.map((_, i) => (
              <View key={i} style={[styles.progressCell,
                i < step && { backgroundColor: accent },
                i === step && { backgroundColor: accent, opacity: 0.55 }]} />
            ))}
          </View>
        </GlassView>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.prompt}>{promptFor(ex.type, t)}</Text>

        {/* Big audio button for listen exercises */}
        {ex.type === 'listen_choose' && (
          <TouchableOpacity onPress={() => speakArabic(ex.correct.say)} activeOpacity={0.7}>
            <GlassView blur clip radius={48} azure noBorder={false} style={styles.speaker}>
              <Icon name="speakerHi" size={42} color={COLORS.white} />
            </GlassView>
          </TouchableOpacity>
        )}

        {/* Show Arabic prompt for name/read exercises */}
        {(ex.type === 'name_choose' || ex.type === 'read_choose') && (
          <TouchableOpacity onPress={() => speakArabic(ex.correct.say)}>
            <GlassView azure radius={RADIUS.lg} style={styles.promptCard}>
              <Text style={styles.promptAr}>{ex.correct.ar}</Text>
              <View style={styles.tapHintRow}>
                <Icon name="speaker" size={15} color={COLORS.textMuted} />
                <Text style={styles.tapHint}>  {t('tap_to_hear_q')}</Text>
              </View>
            </GlassView>
          </TouchableOpacity>
        )}

        {/* Options */}
        {ex.type === 'match_pairs'
          ? <MatchPairs ex={ex} picks={matchPicks} setPicks={setMatchPicks}
              onComplete={() => { setCorrectCount((c) => c + 1); setChecked(true); hapticLight(); }} />
          : (
            // Варианты собраны в GlassContainer: соседние стёкла сливаются
            // краями и список читается как одна поверхность, а не как стопка
            // отдельных плиток.
            <GlassContainer spacing={10} style={styles.options}>
              {ex.options.map((opt, i) => {
                const isSel = selected?.ar === opt.ar;
                const isCorrectOpt = opt.ar === ex.correct.ar;
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
                  <TouchableOpacity key={i} disabled={checked} activeOpacity={0.8}
                    onPress={() => { setSelected(opt); if (showArabic) speakArabic(opt.say); }}>
                    <GlassView radius={RADIUS.md}
                      style={[styles.opt, bgStyle]}>
                      <Text style={[showArabic ? styles.optAr : styles.optText,
                        isSel && { fontWeight: "800", color: COLORS.white }]}>
                        {showArabic ? opt.ar : opt.latin}
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
  return { listen_choose: t('ex_listen'), name_choose: t('ex_name'),
    read_choose: t('ex_read'), match_pairs: t('ex_match') }[type];
}

function MatchPairs({ ex, picks, setPicks, onComplete }) {
  const [activeLeft, setActiveLeft] = useState(null);
  const [wrongPair, setWrongPair] = useState(null); // {ar, latin} briefly red
  const rights = React.useMemo(() => [...ex.items].sort(() => Math.random() - 0.5), [ex]);

  function pickLeft(it) {
    if (picks[it.ar]) return; // already matched
    setActiveLeft(it.ar);
  }
  function pickRight(rt) {
    if (!activeLeft) return;
    if (Object.values(picks).includes(rt.latin)) return; // already used
    const correct = activeLeft === findArFor(rt.latin, ex.items);
    if (correct) {
      const next = { ...picks, [activeLeft]: rt.latin };
      setPicks(next);
      setActiveLeft(null);
      hapticLight();
      if (Object.keys(next).length === ex.items.length) {
        setTimeout(() => onComplete && onComplete(), 350);
      }
    } else {
      // wrong: flash red, then reset selection
      setWrongPair({ ar: activeLeft, latin: rt.latin });
      setTimeout(() => { setWrongPair(null); setActiveLeft(null); }, 450);
    }
  }

  return (
    <View style={styles.matchRow}>
      <View style={styles.matchCol}>
        {ex.items.map((it, i) => {
          const matched = !!picks[it.ar];
          const wrong = wrongPair && wrongPair.ar === it.ar;
          return (
            <TouchableOpacity key={i} onPress={() => pickLeft(it)} disabled={matched}>
              <GlassView radius={RADIUS.md} azure={activeLeft === it.ar}
                style={[styles.matchCell, matched && styles.matchOk, wrong && styles.matchWrong]}>
                <Text style={styles.matchAr}>{it.ar}</Text>
              </GlassView>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.matchCol}>
        {rights.map((it, i) => {
          const used = Object.values(picks).includes(it.latin);
          const wrong = wrongPair && wrongPair.latin === it.latin;
          return (
            <TouchableOpacity key={i} onPress={() => pickRight(it)} disabled={used}>
              <GlassView radius={RADIUS.md}
                style={[styles.matchCell, used && styles.matchOk, wrong && styles.matchWrong]}>
                <Text style={styles.matchText}>{it.latin}</Text>
              </GlassView>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function findArFor(latin, items) {
  const it = items.find((x) => x.latin === latin);
  return it ? it.ar : null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBarWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  closeBtn: { padding: 6, marginRight: SPACING.sm },
  progressTrack: { flex: 1, flexDirection: 'row', gap: 3, marginLeft: SPACING.sm },
  progressCell: { flex: 1, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.16)' },
  prompt: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700', marginBottom: SPACING.lg, textAlign: 'center', letterSpacing: 0.2 },
  speaker: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, marginTop: SPACING.xs },
  starsRow: { flexDirection: 'row', marginTop: SPACING.md, marginBottom: SPACING.sm },
  promptCard: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg, marginHorizontal: SPACING.xl },
  promptAr: { ...ARABIC.xl, color: COLORS.white, fontFamily: FONTS.arabic },
  tapHint: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.sm },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  options: { gap: SPACING.sm },
  opt: { paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  // Значок прижат к правому краю и не сдвигает текст с центра.
  optMark: { position: 'absolute', right: SPACING.md, top: 0, bottom: 0,
    justifyContent: 'center' },
  optSel: { borderColor: COLORS.white, borderWidth: 2.5, transform: [{ scale: 1.03 }] },
  optTextSel: { fontWeight: '800' },
  optCorrect: { backgroundColor: 'rgba(76,175,114,0.3)', borderColor: COLORS.success, borderWidth: 1.5 },
  optWrong: { backgroundColor: 'rgba(192,86,63,0.3)', borderColor: COLORS.danger, borderWidth: 1.5 },
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
  footerOk: { backgroundColor: 'rgba(76,175,114,0.12)' },
  footerBad: { backgroundColor: 'rgba(192,86,63,0.12)' },
  feedback: { ...TYPE.body, fontWeight: '700', marginBottom: SPACING.sm },
  fbOk: { color: COLORS.success },
  fbBad: { color: COLORS.danger },
  primaryBtn: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, width: '100%' },
  primaryText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '800', textAlign: 'center' },
  btnDisabled: { opacity: 0.4 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  bigCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.lg },
  doneTitle: { ...TYPE.title, color: COLORS.white, fontWeight: '800' },
  doneXp: { ...TYPE.subhead, color: COLORS.accentSoft, fontWeight: '400', marginTop: SPACING.sm },
  doneScore: { ...TYPE.body, color: COLORS.textMuted, marginTop: SPACING.xs, marginBottom: SPACING.xl },
});
