import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Animated, Image, PanResponder, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { SectionTitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { getSurahList, getSurah, getSurahAudio } from '../utils/quranApi';
import { playUrl, stopAudio } from '../utils/audioPlayer';
import { useLang } from '../i18n/LanguageContext';
import { useQuranPrefs } from '../utils/QuranPrefsContext';
import { loadJSON, saveJSON, todayKey, dayDiff } from '../utils/helpers';
import { surahMeaning } from '../constants/surahNames';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useAppSettings } from '../utils/AppSettingsContext';
import { useTabSwipe } from '../utils/useTabSwipe';

const TOTAL_AYAHS = 6236;

export default function ReadingScreen() {
  const { t, lang } = useLang();
  const { translationId, reciterId, showArabic, showTranslit, showTranslation } = useQuranPrefs();
  const { dailyGoal } = useAppSettings();
  const tabSwipe = useTabSwipe('Read');
  const [goalDone, setGoalDone] = useState(false);
  const [list, setList] = useState(null);
  const [pos, setPos] = useState({ surah: 1, ayah: 1 });
  const [surahData, setSurahData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [readToday, setReadToday] = useState(0);
  const [playing, setPlaying] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const posRef = useRef(pos);
  posRef.current = pos;
  const dataRef = useRef(surahData);
  dataRef.current = surahData;

  useEffect(() => {
    (async () => {
      try {
        const l = await getSurahList();
        setList(l);
        const saved = await loadJSON('readingPos', { surah: 1, ayah: 1 });
        setPos(saved);
        setStreak(await loadJSON('streakCount', 0));
        const prog = await loadJSON('readProgress', {});
        const todayCount = prog[todayKey()] || 0;
        setReadToday(todayCount);
        const dg = await loadJSON('dailyGoal', 5);
        if (todayCount >= dg) setGoalDone(true);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (!list) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const d = await getSurah(pos.surah, translationId, true);
        if (mounted) setSurahData(d);
      } catch (e) {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; stopAudio(); setPlaying(false); };
  }, [pos.surah, list, translationId]);

  const ayah = surahData
    ? (surahData.ayahs.find((a) => a.number === pos.ayah) || surahData.ayahs[pos.ayah - 1])
    : null;

  function animateSwap(fn) {
    Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }

  async function countAyah() {
    hapticLight();
    const prog = await loadJSON('readProgress', {});
    const newCount = (prog[todayKey()] || 0) + 1;
    prog[todayKey()] = newCount;
    await saveJSON('readProgress', prog);
    setReadToday(newCount);
    // Daily goal reached exactly now?
    if (newCount === dailyGoal) { setGoalDone(true); hapticSuccess(); }
    const history = await loadJSON('goalHistory', {});
    if (!history[todayKey()] && newCount >= dailyGoal) {
      history[todayKey()] = true;
      await saveJSON('goalHistory', history);
      let s = await loadJSON('streakCount', 0);
      const last = await loadJSON('lastGoalDay', null);
      if (!last) s = 1;
      else { const gap = dayDiff(todayKey(), last); s = gap <= 2 ? s + 1 : 1; }
      await saveJSON('streakCount', s);
      await saveJSON('lastGoalDay', todayKey());
      setStreak(s);
    }
  }

  async function goNext() {
    await stopAudio(); setPlaying(false);
    await countAyah();
    const p = posRef.current; const d = dataRef.current;
    const total = d?.ayahs?.length || 1;
    let np;
    if (p.ayah < total) np = { surah: p.surah, ayah: p.ayah + 1 };
    else if (p.surah < 114) np = { surah: p.surah + 1, ayah: 1 };
    else np = { surah: 114, ayah: total };
    animateSwap(() => setPos(np));
    await saveJSON('readingPos', np);
  }

  async function goPrev() {
    await stopAudio(); setPlaying(false);
    const p = posRef.current;
    let np;
    if (p.ayah > 1) np = { surah: p.surah, ayah: p.ayah - 1 };
    else if (p.surah > 1) {
      const ps = list.find((s) => s.number === p.surah - 1);
      np = { surah: p.surah - 1, ayah: ps ? ps.numberOfAyahs : 1 };
    } else np = { surah: 1, ayah: 1 };
    animateSwap(() => setPos(np));
    await saveJSON('readingPos', np);
  }

  // Swipe: left -> next, right -> prev
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) goNext();
        else if (g.dx > 40) goPrev();
      },
    })
  ).current;

  async function listen() {
    if (playing) { await stopAudio(); setPlaying(false); return; }
    try {
      const map = await getSurahAudio(posRef.current.surah, reciterId);
      const url = map[posRef.current.ayah];
      if (url) { setPlaying(true); await playUrl(url, () => setPlaying(false)); }
    } catch (e) {}
  }

  const globalRead = (() => {
    if (!list) return 0;
    let sum = 0;
    for (const s of list) { if (s.number < pos.surah) sum += s.numberOfAyahs; else break; }
    return sum + pos.ayah;
  })();
  const pct = ((globalRead / TOTAL_AYAHS) * 100).toFixed(1);

  return (
    <ScreenWrapper slot="main" swipeHandlers={tabSwipe}>
      <SectionTitle>{t('reading_title')}</SectionTitle>

      {/* Surah name + ayah ref — always visible at top */}
      <GlassView azure radius={RADIUS.md} style={{ marginBottom: SPACING.md }}>
        <View style={styles.refRow}>
          <Text style={styles.refName}>
            {surahData ? `${surahData.name} (${surahMeaning(pos.surah, lang)})` : '…'}
          </Text>
          <Text style={styles.refAyah}>{t('ayah')} {pos.ayah}</Text>
        </View>
      </GlassView>

      <View style={styles.topRow}>
        <GlassView azure radius={RADIUS.md} style={[styles.statBox, goalDone && styles.statBoxGlow]}>
          <View style={styles.statInner}>
            <Image source={require('../../assets/glyphs/streak.png')}
              style={[styles.streakIcon, goalDone && { tintColor: '#ffb454' }]} />
            <View><Text style={[styles.statBig, goalDone && { color: '#ffce8a' }]}>{streak}</Text>
              <Text style={styles.statLabel}>{t('streak_days')}</Text></View>
          </View>
        </GlassView>
        <GlassView radius={RADIUS.md} style={styles.statBox}>
          <View style={styles.statInner}>
            <View><Text style={styles.statBig}>{pct}%</Text>
              <Text style={styles.statLabel}>{t('of_quran')}</Text></View>
          </View>
        </GlassView>
      </View>

      {/* Ayah card — swipeable, scrollable inside */}
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {loading || !ayah ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.accent} size="large" />
          </View>
        ) : (
          <Animated.View style={{ opacity: fade, flex: 1 }}>
            <GlassView radius={RADIUS.lg} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.ayahScroll} showsVerticalScrollIndicator={false}>
                {showArabic && <Text style={styles.ar}>{ayah.ar}</Text>}
                {showTranslit && !!ayah.tr && <Text style={styles.tr}>{ayah.tr}</Text>}
                {showTranslation && <Text style={styles.en}>{ayah.en}</Text>}
                <TouchableOpacity style={styles.listenBtn} onPress={listen}>
                  <Ionicons name={playing ? 'pause' : 'play'} size={16} color={COLORS.text} />
                  <Text style={styles.listenText}>  {playing ? t('stop') : t('preview')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </GlassView>
          </Animated.View>
        )}
      </View>

      {/* Nav buttons */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={goPrev} activeOpacity={0.8}>
          <GlassView radius={RADIUS.pill} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </GlassView>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={{ flex: 1, marginLeft: SPACING.sm }}>
          <GlassView azure radius={RADIUS.pill} style={styles.nextBtn}>
            <Text style={styles.nextText}>{t('next_ayah')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </GlassView>
        </TouchableOpacity>
      </View>
      <Text style={styles.todayHint}>{readToday} / {dailyGoal} · ← →</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  refName: { color: COLORS.white, fontSize: 17, fontWeight: '700', flex: 1 },
  refAyah: { color: COLORS.accentSoft, fontSize: 14, marginLeft: SPACING.sm },
  topRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statBox: { flex: 1 },
  statBoxGlow: { borderWidth: 1.5, borderColor: 'rgba(255,180,84,0.6)' },
  statInner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  streakIcon: { width: 32, height: 32, tintColor: COLORS.white, marginRight: SPACING.sm },
  statBig: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 12 },
  ayahScroll: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center' },
  ar: { color: COLORS.white, fontSize: 34, textAlign: 'center', fontFamily: FONTS.arabic, lineHeight: 64, writingDirection: 'rtl' },
  tr: { color: COLORS.accentSoft, fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: SPACING.md },
  en: { color: COLORS.text, fontSize: 16, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 24 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  listenText: { color: COLORS.text, fontSize: 14 },
  nav: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  navBtn: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54 },
  nextText: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginRight: 4 },
  todayHint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: SPACING.sm, marginBottom: 110 },
});
