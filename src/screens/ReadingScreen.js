import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Animated, Image, PanResponder, ScrollView, Pressable, AppState, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Text from '../components/AppText';
import Icon from '../components/Icon';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import QuranSettingsSheet from '../components/QuranSettingsSheet';
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
import { advanceStreak, consecutiveGoalDays, streakStatus, FREEZE_MAX } from '../utils/streakFreeze';
import { useTabSwipe } from '../utils/useTabSwipe';

const TOTAL_AYAHS = 6236;

export default function ReadingScreen() {
  const { fonts } = useAppearance();
  const { t, lang } = useLang();
  const { translationId, reciterId, showArabic, showTranslit, showTranslation, fontScale } = useQuranPrefs();
  const { dailyGoal } = useAppSettings();
  const focused = useIsFocused();
  const { width } = useWindowDimensions();
  const [day, setDay] = useState(todayKey);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const pagingRef = useRef(false);
  const finalAyahDay = useRef(null);
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

  useEffect(() => {
    (async () => {
      try {
        const l = await getSurahList();
        setList(l);
        const saved = await loadJSON('readingPos', { surah: 1, ayah: 1 });
        setPos(saved);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!focused) return undefined;
    const syncDate = () => setDay(todayKey());
    syncDate();
    const timer = setInterval(syncDate, 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') syncDate();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [focused]);

  useEffect(() => {
    if (!focused) return undefined;
    let active = true;
    Promise.all([
      loadJSON('streakCount', 0), loadJSON('lastGoalDay', null),
      loadJSON('streakFreezes', 0), loadJSON('readProgress', {}),
    ]).then(([count, last, savedFreezes, progress]) => {
      if (!active || countingRef.current || day !== todayKey()) return;
      const status = streakStatus({ streak: count, gap: last ? dayDiff(day, last) : null, freezes: savedFreezes });
      setStreak(status.streak);
      setFreezes(status.freezes);
      setReadToday(progress[day] || 0);
      setGoalDone((progress[day] || 0) >= dailyGoal);
    });
    return () => { active = false; };
  }, [day, dailyGoal, focused]);

  useEffect(() => {
    if (!list) return;
    let mounted = true;
    setLoading(true);
    setSurahData(null);
    (async () => {
      try {
        const d = await getSurah(pos.surah, translationId, true);
        if (mounted) setSurahData(d);
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; stopAudio(); setPlaying(false); };
  }, [pos.surah, list, translationId]);

  const ayah = surahData
    ? (surahData.ayahs.find((a) => a.number === pos.ayah) || surahData.ayahs[pos.ayah - 1])
    : null;

  function animateSwap(fn) {
    return new Promise(resolve => Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start(resolve);
    }));
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
    const readingDay = todayKey();
    const prog = await loadJSON('readProgress', {});
    const newCount = (prog[readingDay] || 0) + 1;
    prog[readingDay] = newCount;
    await saveJSON('readProgress', prog);
    setReadToday(newCount);
    // Daily goal reached exactly now?
    if (newCount === dailyGoal) { setGoalDone(true); hapticSuccess(); }
    const history = await loadJSON('goalHistory', {});
    if (!history[readingDay] && newCount >= dailyGoal) {
      history[readingDay] = true;
      await saveJSON('goalHistory', history);
      const last = await loadJSON('lastGoalDay', null);
      const result = advanceStreak({
        streak: await loadJSON('streakCount', 0),
        gap: last ? dayDiff(readingDay, last) : null,
        freezes: await loadJSON('streakFreezes', 0),
        consecutiveDays: consecutiveGoalDays(history, readingDay),
      });
      await saveJSON('streakCount', result.streak);
      await saveJSON('streakFreezes', result.freezes);
      await saveJSON('lastGoalDay', readingDay);
      setStreak(result.streak);
      setFreezes(result.freezes);
      // Потратилась и выдалась в один день — показываем обе строки.
      const notes = [result.used && t('freeze_used'), result.earned && t('freeze_earned')].filter(Boolean);
      if (notes.length) setFreezeNote(notes.join(' · '));
    }
    // Виджет ударного режима: прогресс за сегодня и счётчик дней.
    publishStreak();
  }

  async function turnPage(next, credit = false) {
    if (pagingRef.current || loading || !ayah) return;
    pagingRef.current = true;
    try {
      await stopAudio();
      setPlaying(false);
      const staysAtEnd = next === pos;
      const readingDay = todayKey();
      if (credit && (!staysAtEnd || finalAyahDay.current !== readingDay)) await countAyah();
      if (staysAtEnd) {
        finalAyahDay.current = readingDay;
        return;
      }
      await animateSwap(() => {
        if (next.surah !== pos.surah) setLoading(true);
        setPos(next);
      });
      await saveJSON('readingPos', next);
    } finally { pagingRef.current = false; }
  }

  function goNext() {
    if (pos.ayah < (surahData?.ayahs?.length || 0)) {
      return turnPage({ surah: pos.surah, ayah: pos.ayah + 1 }, true);
    }
    if (pos.surah < 114) return turnPage({ surah: pos.surah + 1, ayah: 1 }, true);
    return turnPage(pos, true);
  }

  function goPrev() {
    if (pos.ayah > 1) return turnPage({ surah: pos.surah, ayah: pos.ayah - 1 });
    if (pos.surah > 1) {
      const previous = list?.find(s => s.number === pos.surah - 1);
      return turnPage({ surah: pos.surah - 1, ayah: previous?.numberOfAyahs || 1 });
    }
  }

  // Swipe: left -> next, right -> prev
  const pageActions = useRef(null);
  pageActions.current = { goNext, goPrev };
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) pageActions.current.goNext();
        else if (g.dx > 40) pageActions.current.goPrev();
      },
    })
  ).current;

  async function listen() {
    if (playing) { await stopAudio(); setPlaying(false); return; }
    try {
      const map = await getSurahAudio(posRef.current.surah, reciterId);
      const url = map[posRef.current.ayah];
      if (url) { setPlaying(true); await playUrl(url, () => setPlaying(false)); }
    } catch {}
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
      <View style={styles.headingRow}>
        <SectionTitle>{t('reading_title')}</SectionTitle>
        <TouchableOpacity style={styles.options} onPress={() => setSettingsOpen(true)}
          accessibilityRole="button" accessibilityLabel={t('settings')}>
          <Icon name="options" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

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
              <ScrollView key={`${pos.surah}:${pos.ayah}`} contentContainerStyle={styles.ayahScroll}
                showsVerticalScrollIndicator={false}>
                <Pressable accessible={false} style={styles.verseTouch}
                  onPress={({ nativeEvent }) => {
                    if (nativeEvent.pageX >= width / 2) goNext();
                  }}>
                {showArabic && <Text style={[styles.ar, { fontSize: READER.ayah.fontSize * fontScale, lineHeight: READER.ayah.lineHeight * fontScale }]}>{ayah.ar}</Text>}
                {showTranslit && !!ayah.tr && (
                  <Text style={[styles.tr, { fontSize: READER.translit.fontSize * fontScale, fontFamily: fonts?.reading }]}>{ayah.tr}</Text>
                )}
                {showTranslation && (
                  <Text style={[styles.en, { fontSize: READER.trans.fontSize * fontScale, lineHeight: READER.trans.lineHeight * fontScale, fontFamily: fonts?.reading }]}>{ayah.en}</Text>
                )}
                </Pressable>
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
      {settingsOpen && <QuranSettingsSheet visible onClose={() => setSettingsOpen(false)} displayOnly />}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  options: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  verseTouch: { minHeight: 44, justifyContent: 'center' },
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
