import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import Text from '../components/AppText';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, FONTS, TYPE, ARABIC } from '../constants/theme';
import { ARABIC_LETTERS, HARAKAT, SYLLABLES, TAJWEED_BASICS, SURAHS } from '../constants/content';
import { useLang } from '../i18n/LanguageContext';
import { speakArabic } from '../utils/speech';

export default function LearnScreen() {
  const { t, lang } = useLang();
  const [tab, setTab] = useState('letters');

  const TABS = [
    { key: 'letters', label: t('learn_letters') },
    { key: 'harakat', label: t('learn_harakat') },
    { key: 'syllables', label: t('learn_syllables') },
    { key: 'tajweed', label: t('learn_tajweed') },
    { key: 'surahs', label: t('learn_surahs') },
  ];

  return (
    <ScreenWrapper>
      <SectionTitle>{t('learn_title')}</SectionTitle>
      <Subtitle>{t('learn_subtitle')}</Subtitle>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tb) => (
          <TouchableOpacity key={tb.key}
            style={[styles.tab, tab === tb.key && styles.tabActive]}
            onPress={() => setTab(tb.key)}>
            <Text style={[styles.tabText, tab === tb.key && styles.tabTextActive]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.hint}>🔊 {t('tap_to_hear')}</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {tab === 'letters' && (
          <View style={styles.grid}>
            {ARABIC_LETTERS.map((l) => (
              <TouchableOpacity key={l.name} style={styles.cell} onPress={() => speakArabic(l.say)}>
                <Text style={styles.cellAr}>{l.letter}</Text>
                <Text style={styles.cellName}>{l.name}</Text>
                <Text style={styles.cellSound}>{l.sound}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'harakat' && (
          <View style={styles.grid}>
            {HARAKAT.map((h) => (
              <TouchableOpacity key={h.name_en} style={styles.cellWide} onPress={() => speakArabic(h.say)}>
                <Text style={styles.cellAr}>{h.mark}</Text>
                <Text style={styles.cellName}>{lang === 'ru' ? h.name_ru : h.name_en}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'syllables' && (
          <View>
            {SYLLABLES.map((s, i) => (
              <TouchableOpacity key={i} onPress={() => speakArabic(s.say)}>
                <Card style={styles.sylCard}>
                  <Text style={styles.sylAr}>{s.ar}</Text>
                  <Text style={styles.sylTr}>{s.tr}  🔊</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'tajweed' && (
          <View>
            {TAJWEED_BASICS.map((item, i) => (
              <Card key={i}>
                <Text style={styles.tjTitle}>{lang === 'ru' ? item.title_ru : item.title_en}</Text>
                <Text style={styles.tjText}>{lang === 'ru' ? item.text_ru : item.text_en}</Text>
              </Card>
            ))}
          </View>
        )}

        {tab === 'surahs' && (
          <View>
            {SURAHS.map((s) => (
              <Card key={s.id}>
                <Text style={styles.surahName}>{s.name}</Text>
                <Text style={styles.surahMeaning}>{lang === 'ru' ? s.meaning_ru : s.meaning_en}</Text>
                {s.ayahs.map((a, i) => (
                  <TouchableOpacity key={i} onPress={() => speakArabic(a.ar)} style={styles.ayah}>
                    <Text style={styles.ayahAr}>{a.ar}</Text>
                    <Text style={styles.ayahTr}>{a.tr}  🔊</Text>
                    <Text style={styles.ayahEn}>{lang === 'ru' ? a.ru : a.en}</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexGrow: 0, marginBottom: SPACING.sm },
  tab: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill, marginRight: SPACING.sm,
    backgroundColor: COLORS.surface, height: 40, justifyContent: 'center',
  },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.cream, fontWeight: '600' },
  tabTextActive: { color: COLORS.navy },
  hint: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: {
    width: '23%', aspectRatio: 0.8, marginBottom: SPACING.sm,
    backgroundColor: 'rgba(13,92,74,0.4)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(180,215,230,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  cellWide: {
    width: '31%', aspectRatio: 1, marginBottom: SPACING.sm,
    backgroundColor: 'rgba(13,92,74,0.4)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(180,215,230,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  cellAr: { ...ARABIC.lg, color: COLORS.accent, fontFamily: FONTS.arabic },
  cellName: { ...TYPE.caption, color: COLORS.cream, marginTop: 4, textAlign: 'center' },
  cellSound: { ...TYPE.caption, color: COLORS.textMuted },
  sylCard: { alignItems: 'center' },
  sylAr: { ...ARABIC.md, color: COLORS.accent, fontFamily: FONTS.arabic },
  sylTr: { ...TYPE.callout, color: COLORS.cream, marginTop: 4 },
  tjTitle: { ...TYPE.subhead, color: COLORS.accent, fontWeight: '700', marginBottom: 4 },
  tjText: { ...TYPE.callout, color: COLORS.cream, lineHeight: 20 },
  surahName: { ...TYPE.heading, color: COLORS.accent, fontWeight: '800' },
  surahMeaning: { color: COLORS.textMuted, marginBottom: SPACING.md },
  ayah: { marginBottom: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.surfaceStrong, paddingTop: SPACING.sm },
  ayahAr: { ...ARABIC.sm, color: COLORS.cream, textAlign: 'right', fontFamily: FONTS.arabic },
  ayahTr: { ...TYPE.callout, color: COLORS.accentSoft, fontStyle: 'italic', marginTop: 4 },
  ayahEn: { ...TYPE.callout, color: COLORS.textMuted, marginTop: 2 },
});
