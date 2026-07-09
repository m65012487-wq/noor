import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { SectionTitle } from '../components/ui';
import CoursePathScreen from './CoursePathScreen';
import LessonPlayerScreen from './LessonPlayerScreen';
import QuranSettingsSheet from '../components/QuranSettingsSheet';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { getSurahList, searchAyahs } from '../utils/quranApi';
import { getLastRead, getBookmarks } from '../utils/quranProgress';
import { surahMeaning } from '../constants/surahNames';
import { useLang } from '../i18n/LanguageContext';
import { useQuranPrefs } from '../utils/QuranPrefsContext';
import { useTabSwipe } from '../utils/useTabSwipe';

export default function QuranScreen({ navigation }) {
  const { t, lang } = useLang();
  const swipe = useTabSwipe('Quran');
  const { translationId } = useQuranPrefs();
  const [seg, setSeg] = useState('read'); // read | learn
  const [list, setList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [ayahResults, setAyahResults] = useState([]);
  const [searchingAyahs, setSearchingAyahs] = useState(false);
  const ayahSearchTimer = useRef(null);
  const [lastRead, setLastRead] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null); // {unitIndex, lessonIndex}
  const [courseRefresh, setCourseRefresh] = useState(0);

  useEffect(() => {
    (async () => {
      try { const d = await getSurahList(); setList(d); setFiltered(d); }
      catch (e) { setError(true); }
      setLoading(false);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => { setLastRead(await getLastRead()); setBookmarks(await getBookmarks()); })();
  }, []));

  function onSearch(q) {
    setQuery(q);
    const ql = q.toLowerCase();
    setFiltered(list.filter((s) =>
      s.englishName.toLowerCase().includes(ql) ||
      s.englishNameTranslation.toLowerCase().includes(ql) ||
      String(s.number) === q));
    // Debounced ayah search (text inside the Quran).
    clearTimeout(ayahSearchTimer.current);
    if (q.trim().length >= 3) {
      setSearchingAyahs(true);
      ayahSearchTimer.current = setTimeout(async () => {
        const res = await searchAyahs(q, translationId, 20);
        setAyahResults(res);
        setSearchingAyahs(false);
      }, 500);
    } else {
      setAyahResults([]);
      setSearchingAyahs(false);
    }
  }

  function openSurah(item, ayah) {
    navigation.navigate('SurahReader', { surah: item, jumpToAyah: ayah || null });
  }
  function openByNumber(num, ayah) {
    const item = list.find((s) => s.number === num);
    if (item) openSurah(item, ayah);
  }

  const segmentControl = (
    <View style={styles.headerRow}>
      <View style={styles.segment}>
        <TouchableOpacity style={[styles.segBtn, seg === 'read' && styles.segActive]}
          onPress={() => setSeg('read')}>
          <Text style={[styles.segText, seg === 'read' && styles.segTextActive]}>{t('quran_read_tab')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segBtn, seg === 'learn' && styles.segActive]}
          onPress={() => setSeg('learn')}>
          <Text style={[styles.segText, seg === 'learn' && styles.segTextActive]}>{t('quran_learn_tab')}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => setSettingsOpen(true)} style={styles.gear}>
        <Ionicons name="options-outline" size={22} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );

  const listHeader = (
    <View>
      {lastRead && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => openByNumber(lastRead.surahNumber, lastRead.ayah)}>
          <GlassView azure intensity={42} style={styles.continueCard} radius={RADIUS.md}>
            <View style={styles.continueInner}>
              <Text style={styles.continueLabel}>{t('continue_reading')}</Text>
              <Text style={styles.continueName}>{lastRead.name}</Text>
              <Text style={styles.continueAyah}>{t('ayah')} {lastRead.ayah}</Text>
            </View>
          </GlassView>
        </TouchableOpacity>
      )}
      {bookmarks.length > 0 && (
        <View style={{ marginBottom: SPACING.sm }}>
          <Text style={styles.sectionLabel}>{t('bookmarks')}</Text>
          {bookmarks.slice(0, 4).map((b, i) => (
            <TouchableOpacity key={i} activeOpacity={0.85} onPress={() => openByNumber(b.surahNumber, b.ayah)}>
              <GlassView flat style={styles.bmRow} radius={RADIUS.sm}>
                <View style={styles.bmInner}>
                  <Ionicons name="bookmark" size={15} color={COLORS.accentSoft} style={{ marginRight: 8 }} />
                  <Text style={styles.bmText}>{b.name} · {t('ayah')} {b.ayah}</Text>
                </View>
              </GlassView>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={styles.sectionLabel}>{t('all_surahs')}</Text>
      <TextInput style={styles.search} placeholder={t('surah_search')}
        placeholderTextColor={COLORS.textMuted} value={query} onChangeText={onSearch} />
      {error && <Text style={styles.error}>{t('quran_load_error')}</Text>}

      {searchingAyahs && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: SPACING.md }} />}
      {ayahResults.length > 0 && (
        <View style={{ marginBottom: SPACING.md }}>
          <Text style={styles.sectionLabel}>{t('ayah')}</Text>
          {ayahResults.map((r, i) => (
            <TouchableOpacity key={i} activeOpacity={0.85}
              onPress={() => openByNumber(r.surahNumber, r.ayah)}>
              <GlassView flat style={styles.ayahResult} radius={RADIUS.sm}>
                <View style={{ padding: SPACING.md }}>
                  <Text style={styles.ayahResultRef}>{r.surahName} · {t('ayah')} {r.ayah}</Text>
                  <Text style={styles.ayahResultText} numberOfLines={2}>{r.text}</Text>
                </View>
              </GlassView>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScreenWrapper swipeHandlers={swipe}>
      <SectionTitle>{t('quran_title')}</SectionTitle>
      {segmentControl}

      {seg === 'learn' ? (
        <CoursePathScreen refreshKey={courseRefresh}
          onOpenLesson={(ui, li) => setActiveLesson({ unitIndex: ui, lessonIndex: li })} />
      ) : loading ? (
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.85} onPress={() => openSurah(item)}>
              <GlassView flat style={styles.row} radius={RADIUS.md}>
                <View style={styles.rowInner}>
                  <View style={styles.numBadge}><Text style={styles.num}>{item.number}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.englishName}</Text>
                    <Text style={styles.meaning}>{surahMeaning(item.number, lang)} · {item.numberOfAyahs} {t('verses')}</Text>
                  </View>
                  <Text style={styles.arName}>{item.name}</Text>
                </View>
              </GlassView>
            </TouchableOpacity>
          )}
        />
      )}

      <QuranSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Modal visible={!!activeLesson} animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActiveLesson(null)}>
        <View style={styles.lessonModal}>
          {activeLesson && (
            <LessonPlayerScreen
              unitIndex={activeLesson.unitIndex}
              lessonIndex={activeLesson.lessonIndex}
              onExit={() => { setActiveLesson(null); setCourseRefresh((k) => k + 1); }}
            />
          )}
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  segment: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill, padding: 3 },
  segBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.pill },
  segActive: { backgroundColor: 'rgba(180,215,230,0.20)' },
  segText: { color: COLORS.textMuted, fontWeight: '600' },
  segTextActive: { color: COLORS.white, fontWeight: '700' },
  gear: { padding: 8, marginLeft: SPACING.sm },
  continueCard: { marginBottom: SPACING.md },
  continueInner: { padding: SPACING.md },
  continueLabel: { color: COLORS.accentSoft, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  continueName: { color: COLORS.white, fontSize: 24, fontWeight: '700', marginTop: 4 },
  continueAyah: { color: COLORS.textMuted, fontSize: 14, marginTop: 2 },
  sectionLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm, marginTop: SPACING.xs },
  bmRow: { marginBottom: SPACING.sm },
  bmInner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm },
  bmText: { color: COLORS.text, fontSize: 15 },
  search: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, color: COLORS.text, fontSize: 16,
    marginBottom: SPACING.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  error: { color: COLORS.danger, textAlign: 'center', marginTop: 20 },
  row: { marginBottom: SPACING.sm },
  rowInner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  numBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(180,215,230,0.18)',
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  num: { color: COLORS.accent, fontWeight: '700' },
  name: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  meaning: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  arName: { color: COLORS.accentSoft, fontSize: 22, fontFamily: FONTS.arabic, marginLeft: SPACING.sm },
  lessonModal: { flex: 1, backgroundColor: '#0e1a2a' },
  ayahResult: { marginBottom: SPACING.sm },
  ayahResultRef: { color: COLORS.accentSoft, fontSize: 12, marginBottom: 4 },
  ayahResultText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
});
