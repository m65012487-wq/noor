import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassIconButton from '../components/GlassIconButton';
import GlassView from '../components/GlassView';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { getSurah, getSurahAudio, getWordByWord } from '../utils/quranApi';
import { playUrl, stopAudio } from '../utils/audioPlayer';
import { useLang } from '../i18n/LanguageContext';
import { useQuranPrefs } from '../utils/QuranPrefsContext';
import { setLastRead, getBookmarks, toggleBookmark, getFontScale, setFontScale } from '../utils/quranProgress';
import { surahMeaning } from '../constants/surahNames';
import { useAppearance, wallpaperFor } from '../utils/AppearanceContext';

const READER_BG = {
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

export default function SurahReaderScreen({ route, navigation }) {
  const { surah, jumpToAyah } = route.params;
  const { t, lang } = useLang();
  const { translationId, reciterId, showArabic, showTranslit, showTranslation, wordByWord } = useQuranPrefs();
  const appearance = useAppearance();
  const readerBg = READER_BG[wallpaperFor(appearance?.theme || 'main', 'reader')] || READER_BG.main;
  const [data, setData] = useState(null);
  const [audioMap, setAudioMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playingAyah, setPlayingAyah] = useState(null);
  const [wbw, setWbw] = useState(null); // { ayahNum: [{ar,ru}] }
  const [playingAll, setPlayingAll] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [scale, setScale] = useState(1);
  const scrollRef = useRef(null);
  const ayahYs = useRef({});

  useEffect(() => {
    let alive = true;
    if (wordByWord) {
      getWordByWord(surah.number, lang === 'ru' ? 'ru' : 'en')
        .then((m) => { if (alive) setWbw(m); })
        .catch(() => { if (alive) setWbw(null); });
    } else setWbw(null);
    return () => { alive = false; };
  }, [wordByWord, surah.number, lang]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setScale(await getFontScale());
        setBookmarks(await getBookmarks());
        const d = await getSurah(surah.number, translationId, true);
        if (!mounted) return;
        setData(d);
        setLastRead({ surahNumber: surah.number, name: surah.englishName, ayah: jumpToAyah || 1 });
      } catch (e) { setError(true); }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; stopAudio(); };
  }, [translationId, reciterId]);

  useEffect(() => {
    if (data && jumpToAyah && ayahYs.current[jumpToAyah] != null) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: ayahYs.current[jumpToAyah] - 80, animated: true }), 300);
    }
  }, [data]);

  async function playAyah(n) {
    let map = audioMap;
    if (!map[n]) {
      try { map = await getSurahAudio(surah.number, reciterId); setAudioMap(map); } catch {}
    }
    const url = map[n];
    if (!url) return;
    setPlayingAyah(n);
    setLastRead({ surahNumber: surah.number, name: surah.englishName, ayah: n });
    await playUrl(url, () => {
      if (playingAll && data) {
        const next = n + 1;
        if (next <= data.ayahs.length) playAyah(next);
        else { setPlayingAll(false); setPlayingAyah(null); }
      } else setPlayingAyah(null);
    });
  }

  async function toggleAyah(n) {
    if (playingAyah === n && !playingAll) {
      await stopAudio(); setPlayingAyah(null);
    } else {
      setPlayingAll(false);
      await playAyah(n);
    }
  }

  async function togglePlayAll() {
    if (playingAll) { await stopAudio(); setPlayingAll(false); setPlayingAyah(null); }
    else { setPlayingAll(true); playAyah(1); }
  }

  async function onBookmark(n) {
    const list = await toggleBookmark({ surahNumber: surah.number, name: surah.englishName, ayah: n });
    setBookmarks(list);
  }
  const isMarked = (n) => bookmarks.some((b) => b.surahNumber === surah.number && b.ayah === n);

  async function changeScale(delta) {
    const v = Math.min(1.6, Math.max(0.8, +(scale + delta).toFixed(2)));
    setScale(v); await setFontScale(v);
  }

  const meaning = surahMeaning(surah.number, lang) || surah.englishNameTranslation;

  return (
    <ImageBackground source={readerBg} style={{ flex: 1 }} resizeMode="cover">
      <LinearGradient colors={['rgba(14,26,42,0.55)', 'rgba(14,26,42,0.80)']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="chevron-back" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{surah.englishName}</Text>
              <Text style={styles.sub}>{meaning} · {surah.numberOfAyahs} {t('verses')}</Text>
            </View>
            {/* Controls: play surah + font size, all glass */}
            <View style={styles.controls}>
              <GlassIconButton name={playingAll ? 'stop' : 'play'} active={playingAll}
                onPress={togglePlayAll} style={{ marginRight: 6 }} />
              <GlassIconButton name="remove" size={16} onPress={() => changeScale(-0.1)} style={{ marginRight: 6 }} />
              <GlassIconButton name="add" size={16} onPress={() => changeScale(0.1)} />
            </View>
          </View>

          {loading && <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 60 }} />}
          {error && <Text style={styles.error}>{t('quran_load_error')}</Text>}

          {data && (
            <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SPACING.md, paddingBottom: 140 }}
              showsVerticalScrollIndicator={false}>
              {data.ayahs.map((a) => (
                <View key={a.number}
                  onLayout={(e) => { ayahYs.current[a.number] = e.nativeEvent.layout.y; }}>
                  <GlassView flat radius={RADIUS.md}
                    style={[styles.ayahCard, playingAyah === a.number && styles.ayahActive]}>
                    <View style={styles.ayahHead}>
                      <View style={[styles.ayahNum, { backgroundColor: `rgba(${appearance?.tint || '180,215,230'},0.2)` }]}><Text style={styles.ayahNumText}>{a.number}</Text></View>
                      <View style={styles.ayahActions}>
                        <GlassIconButton name={playingAyah === a.number ? 'pause' : 'play'}
                          size={15} active={playingAyah === a.number}
                          onPress={() => toggleAyah(a.number)} style={{ marginRight: 6 }} />
                        <GlassIconButton name={isMarked(a.number) ? 'bookmark' : 'bookmark-outline'}
                          size={15} active={isMarked(a.number)}
                          onPress={() => onBookmark(a.number)} />
                      </View>
                    </View>
                    {showArabic && wordByWord && wbw && wbw[a.number] ? (
                      <View style={styles.wbwWrap}>
                        {wbw[a.number].map((w, wi) => (
                          <View key={wi} style={styles.wbwCell}>
                            <Text style={[styles.wbwAr, { fontSize: 24 * scale, lineHeight: 40 * scale }]}>{w.ar}</Text>
                            {!!w.ru && <Text style={styles.wbwRu}>{w.ru}</Text>}
                          </View>
                        ))}
                      </View>
                    ) : showArabic ? (
                      <Text style={[styles.ar, { fontSize: 28 * scale, lineHeight: 52 * scale }]}>{a.ar}</Text>
                    ) : null}
                    {showTranslit && !!a.tr && <Text style={[styles.tr, { fontSize: 14 * scale }]}>{a.tr}</Text>}
                    {showTranslation && <Text style={[styles.en, { fontSize: 15 * scale, lineHeight: 22 * scale }]}>{a.en}</Text>}
                  </GlassView>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, paddingHorizontal: SPACING.md },
  back: { width: 32, height: 40, justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  sub: { color: COLORS.textMuted, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  error: { color: COLORS.danger, textAlign: 'center', marginTop: 60 },
  ayahCard: {
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  ayahActive: { borderColor: COLORS.glassBorder },
  ayahHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  ayahNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(180,215,230,0.18)', alignItems: 'center', justifyContent: 'center' },
  ayahNumText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  ayahActions: { flexDirection: 'row', alignItems: 'center' },
  ar: { color: COLORS.white, textAlign: 'right', fontFamily: FONTS.arabic },
  wbwWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  wbwCell: { alignItems: 'center', marginBottom: 6, maxWidth: 110 },
  wbwAr: { color: COLORS.white, fontFamily: FONTS.arabic, textAlign: 'center' },
  wbwRu: { color: COLORS.accentSoft, fontSize: 10, textAlign: 'center', marginTop: 1 },
  tr: { color: COLORS.accentSoft, fontStyle: 'italic', marginTop: SPACING.sm },
  en: { color: COLORS.textMuted, marginTop: SPACING.xs },
});
