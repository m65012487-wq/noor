import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Animated, Image, PanResponder, ScrollView } from 'react-native';
import Text from '../components/AppText';
import Icon from '../components/Icon';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { SectionTitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, FONTS, TYPE, READER } from '../constants/theme';
import { getSurahList, getSurah, getSurahAudio } from '../utils/quranApi';
import { playUrl, stopAudio } from '../utils/audioPlayer';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { useQuranPrefs } from '../utils/QuranPrefsContext';
import { loadJSON, saveJSON, todayKey, dayDiff } from '../utils/helpers';
import { surahMeaning } from '../constants/surahNames';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useAppSettings } from '../utils/AppSettingsContext';
import { publishStreak } from '../utils/widgetBridge';
import { advanceStreak, FREEZE_MAX } from '../utils/streakFreeze';
import { useTabSwipe } from '../utils/useTabSwipe';

const TOTAL_AYAHS = 6236;

export default function ReadingScreen() {
  const { fonts } = useAppearance();
  const { t, lang } = useLang();
  const { translationId, reciterId, showArabic, showTranslit, showTranslation, fontScale } = useQuranPrefs();
  const { dailyGoal } = useAppSettings();
  const tabSwipe = useTabSwipe('Read');
  const [goalDone, setGoalDone] = useState(false);
  const [list, setList] = useState(null);
  const [pos, setPos] = useState({ surah: 1, ayah: 1 });
  const [surahData, setSurahData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [freezes, setFreezes] = useState(0);
  // Короткая строка о том, что сделала бронь: потратилась или выдана новая.
  const [freezeNote, setFreezeNote] = useState(null);
  const countingRef = useRef(false);
  // Заметка гаснет сама: висящая до следующего касания она двигала карточку аята.
  useEffect(() => {
    if (!freezeNote) return undefined;
    const timer = setTimeout(() => setFreezeNote(null), 5000);
    return () => clearTimeout(timer);
  }, [freezeNote]);
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
        setFreezes(await loadJSON('streakFreezes', 0));
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
    // Между чтением и записью серии много await; без замка второе нажатие читало
    // бы ещё не записанные брони и могло оборвать серию.
    if (countingRef.current) return;
    countingRef.current = true;
    try { await countAyahLocked(); } finally { countingRef.current = false; }
  }

  async function countAyahLocked() {
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
      const last = await loadJSON('lastGoalDay', null);
      const result = advanceStreak({
        streak: await loadJSON('streakCount', 0),
        gap: last ? dayDiff(todayKey(), last) : null,
        freezes: await loadJSON('streakFreezes', 0),
      });
      await saveJSON('streakCount', result.streak);
      await saveJSON('streakFreezes', result.freezes);
      await saveJSON('lastGoalDay', todayKey());
      setStreak(result.streak);
      setFreezes(result.freezes);
      // Потратилась и выдалась в один день — показываем обе строки.
      const notes = [result.used && t('freeze_used'), result.earned && t('freeze_earned')].filter(Boolean);
      if (notes.length) setFreezeNote(notes.join(' · '));
    }
    // Виджет ударного режима: прогресс за сегодня и счётчик дней.
    publishStreak();
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
    <ScreenWrapper swipeHandlers={tabSwipe}>
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

      {freezeNote && (
        <Text style={styles.freezeNote} accessibilityLiveRegion="polite" onPress={() => setFreezeNote(null)}>
          {freezeNote}
        </Text>
      )}
      <View style={styles.topRow}>
        <GlassView azure radius={RADIUS.md} style={[styles.statBox, goalDone && styles.statBoxGlow]}>
          <View style={styles.statInner}>
            <Image source={require('../../assets/glyphs/streak.png')}
              style={[styles.streakIcon, goalDone && { tintColor: COLORS.ember }]} />
            <View style={{ flexShrink: 1 }}><Text style={[styles.statBig, goalDone && { color: COLORS.emberSoft }]}>{streak}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>{t('streak_days')}</Text></View>
            {/* Брони: по щиту на каждую, пустые — контуром. Две — потолок. */}
            <View style={styles.freezes} accessible accessibilityLabel={`${t('streak_freezes')}: ${freezes}`}
              accessibilityHint={t('freeze_hint')}>
              {Array.from({ length: FREEZE_MAX }, (_, i) => (
                <Icon key={i} name={i < freezes ? 'shield' : 'shield_empty'} size={16}
                  color={i < freezes ? COLORS.emberSoft : COLORS.textFaint} />
              ))}
            </View>
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
                {showArabic && <Text style={[styles.ar, { fontSize: READER.ayah.fontSize * fontScale, lineHeight: READER.ayah.lineHeight * fontScale }]}>{ayah.ar}</Text>}
                {showTranslit && !!ayah.tr && (
                  <Text style={[styles.tr, { fontSize: READER.translit.fontSize * fontScale, fontFamily: fonts?.reading }]}>{ayah.tr}</Text>
                )}
                {showTranslation && (
                  <Text style={[styles.en, { fontSize: READER.trans.fontSize * fontScale, lineHeight: READER.trans.lineHeight * fontScale, fontFamily: fonts?.reading }]}>{ayah.en}</Text>
                )}
                <TouchableOpacity style={styles.listenBtn} onPress={listen}>
                  <Icon name={playing ? 'pause' : 'play'} size={16} color={COLORS.text} />
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
            <Icon name="back" size={22} color={COLORS.text} />
          </GlassView>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={{ flex: 1, marginLeft: SPACING.sm }}>
          <GlassView azure radius={RADIUS.pill} style={styles.nextBtn}>
            <Text style={styles.nextText}>{t('next_ayah')}</Text>
            <Icon name="forward" size={20} color={COLORS.white} />
          </GlassView>
        </TouchableOpacity>
      </View>
      <Text style={styles.todayHint}>{readToday} / {dailyGoal} · ← →</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  refName: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700', flex: 1 },
  refAyah: { ...TYPE.callout, color: COLORS.accentSoft, marginLeft: SPACING.sm },

  topRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statBox: { flex: 1 },
  statBoxGlow: { borderWidth: 1.5, borderColor: 'rgba(255,206,90,0.60)' },
  statInner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  streakIcon: { width: 32, height: 32, tintColor: COLORS.white, marginRight: SPACING.sm },
  freezes: { flexDirection: 'row', gap: 4, marginLeft: 'auto', paddingLeft: SPACING.xs },
  freezeNote: { ...TYPE.caption, color: COLORS.emberSoft, textAlign: 'center', marginBottom: SPACING.xs },
  statBig: { ...TYPE.heading, color: COLORS.white, fontWeight: '800' },
  statLabel: { ...TYPE.caption, color: COLORS.textMuted },

  ayahScroll: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center' },
  // Размеры те же, что в читалке суры (READER), — иначе одна и та же сура
  // выглядит в двух разделах по-разному.
  ar: { ...READER.ayah, color: COLORS.white, textAlign: 'center',
    fontFamily: FONTS.arabic, writingDirection: 'rtl' },
  tr: { ...READER.translit, color: COLORS.accentSoft, fontStyle: 'italic',
    textAlign: 'center', marginTop: SPACING.md },
  en: { ...READER.trans, color: COLORS.text, textAlign: 'center',
    marginTop: SPACING.sm },

  listenBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceStrong },
  listenText: { ...TYPE.callout, color: COLORS.text },

  nav: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  navBtn: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54 },
  nextText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700', marginRight: SPACING.xs },
  todayHint: { ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center',
    marginTop: SPACING.sm, marginBottom: 110 },
});
