import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassView from '../components/GlassView';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { COURSE } from '../constants/course';
import { buildLesson, completeLesson, starsFor } from '../utils/courseEngine';
import { useAppearance, wallpaperFor } from '../utils/AppearanceContext';
import { speakArabic, stopSpeech } from '../utils/speech';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';

const LESSON_BACKGROUNDS = {
  main: require('../../assets/backgrounds/main.png'),
  alt1: require('../../assets/backgrounds/alt1.png'),
  alt2: require('../../assets/backgrounds/alt2.png'),
  dawn: require('../../assets/backgrounds/dawn.png'),
  clouds: require('../../assets/backgrounds/clouds.png'),
  garden_main: require('../../assets/backgrounds/garden_main.png'),
  garden_reader: require('../../assets/backgrounds/garden_reader.png'),
  garden_lesson: require('../../assets/backgrounds/garden_lesson.png'),
  cosmos_main: require('../../assets/backgrounds/cosmos_main.png'),
  cosmos_reader: require('../../assets/backgrounds/cosmos_reader.png'),
  cosmos_lesson: require('../../assets/backgrounds/cosmos_lesson.png'),
};

function LessonBg({ children }) {
  const insets = useSafeAreaInsets();
  const appearance = useAppearance();
  const accent = appearance?.accent || '#bcd3e0';
  const bgKey = wallpaperFor(appearance?.theme || 'main', 'lesson');
  const src = LESSON_BACKGROUNDS[bgKey] || LESSON_BACKGROUNDS.main;
  // Dynamic Island needs real clearance; modals sometimes report 0 inset,
  // so guarantee a generous minimum.
  const topPad = Math.max(insets.top, 56);
  return (
    <ImageBackground source={src} style={{ flex: 1 }} resizeMode="cover">
      <LinearGradient colors={['rgba(14,26,42,0.30)', 'rgba(14,26,42,0.52)', 'rgba(14,26,42,0.68)']}
        locations={[0, 0.5, 1]} style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: topPad }]}>{children}</View>
      </LinearGradient>
    </ImageBackground>
  );
}

export default function LessonPlayerScreen({ unitIndex, lessonIndex, onExit }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || '#bcd3e0';
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
            <Ionicons name="checkmark" size={56} color={accent} />
          </View>
          <Text style={styles.doneTitle}>{t('lesson_done')}</Text>
          <View style={styles.starsRow}>
            {[0, 1, 2].map((i) => (
              <Ionicons key={i} name={i < stars ? 'star' : 'star-outline'} size={40}
                color={i < stars ? '#ffce5a' : 'rgba(255,255,255,0.3)'} style={{ marginHorizontal: 4 }} />
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
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
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
              <Ionicons name="volume-high" size={42} color={COLORS.white} />
            </GlassView>
          </TouchableOpacity>
        )}

        {/* Show Arabic prompt for name/read exercises */}
        {(ex.type === 'name_choose' || ex.type === 'read_choose') && (
          <TouchableOpacity onPress={() => speakArabic(ex.correct.say)}>
            <GlassView azure radius={RADIUS.lg} style={styles.promptCard}>
              <Text style={styles.promptAr}>{ex.correct.ar}</Text>
              <View style={styles.tapHintRow}>
                <Ionicons name="volume-medium" size={15} color={COLORS.textMuted} />
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
            <View style={styles.options}>
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
                  ? { backgroundColor: 'rgba(76,175,114,0.35)', borderColor: '#4caf72', borderWidth: 2 }
                  : isSel
                  ? { backgroundColor: `rgba(${tintRgb},0.35)`, borderColor: accent, borderWidth: 2 }
                  : {};
                return (
                  <TouchableOpacity key={i} disabled={checked} activeOpacity={0.8}
                    onPress={() => { setSelected(opt); if (showArabic) speakArabic(opt.say); }}>
                    <GlassView radius={RADIUS.md}
                      style={[styles.opt, bgStyle]}>
                      <Text style={[showArabic ? styles.optAr : styles.optText,
                        isSel && { fontWeight: '800', color: COLORS.white }]}>
                        {showArabic ? opt.ar : opt.latin}
                      </Text>
                    </GlassView>
                  </TouchableOpacity>
                );
              })}
            </View>
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
              { backgroundColor: checked ? (isCorrectAnswer() ? '#4caf72' : accent) : accent },
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
  progressTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  prompt: { color: COLORS.white, fontSize: 19, fontWeight: '700', marginBottom: SPACING.lg, textAlign: 'center', letterSpacing: 0.2 },
  speaker: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, marginTop: SPACING.xs },
  starsRow: { flexDirection: 'row', marginTop: SPACING.md, marginBottom: SPACING.sm },
  promptCard: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg, marginHorizontal: SPACING.xl },
  promptAr: { color: COLORS.white, fontSize: 56, fontFamily: FONTS.arabic },
  tapHint: { color: COLORS.textMuted, fontSize: 12, marginTop: SPACING.sm },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  options: { gap: SPACING.sm },
  opt: { paddingVertical: SPACING.md, alignItems: 'center' },
  optSel: { borderColor: COLORS.white, borderWidth: 2.5, transform: [{ scale: 1.03 }] },
  optTextSel: { fontWeight: '800' },
  optCorrect: { backgroundColor: 'rgba(76,175,114,0.3)', borderColor: '#4caf72', borderWidth: 1.5 },
  optWrong: { backgroundColor: 'rgba(192,86,63,0.3)', borderColor: COLORS.danger, borderWidth: 1.5 },
  optAr: { color: COLORS.white, fontSize: 34, fontFamily: FONTS.arabic },
  optText: { color: COLORS.white, fontSize: 19, fontWeight: '600' },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  matchCol: { flex: 1, gap: SPACING.sm },
  matchCell: { height: 60, alignItems: 'center', justifyContent: 'center' },
  matchOk: { opacity: 0.55, backgroundColor: 'rgba(76,175,114,0.28)', borderColor: '#4caf72', borderWidth: 1.5 },
  matchWrong: { borderColor: COLORS.danger, borderWidth: 2 },
  matchHint: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: SPACING.md },
  matchAr: { color: COLORS.white, fontSize: 32, fontFamily: FONTS.arabic },
  matchText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  footer: { padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)' },
  footerOk: { backgroundColor: 'rgba(76,175,114,0.12)' },
  footerBad: { backgroundColor: 'rgba(192,86,63,0.12)' },
  feedback: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.sm },
  fbOk: { color: '#4caf72' },
  fbBad: { color: COLORS.danger },
  primaryBtn: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, width: '100%' },
  primaryText: { color: COLORS.white, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  btnDisabled: { opacity: 0.4 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  bigCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.lg },
  doneTitle: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  doneXp: { color: COLORS.accentSoft, fontSize: 18, marginTop: SPACING.sm },
  doneScore: { color: COLORS.textMuted, fontSize: 16, marginTop: SPACING.xs, marginBottom: SPACING.xl },
});
