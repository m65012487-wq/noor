import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { VERSES_OF_THE_DAY } from '../constants/content';
import { loadJSON, saveJSON, todayKey } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';
import { speakArabic } from '../utils/speech';

const GOAL_OPTIONS = [1, 3, 5, 10, 20];

export default function ReadScreen({ onProgress }) {
  const { t, lang } = useLang();
  const [goal, setGoal] = useState(5);
  const [readCount, setReadCount] = useState(0);

  const dayNum = parseInt(todayKey().replace(/-/g, ''), 10);
  const verse = VERSES_OF_THE_DAY[dayNum % VERSES_OF_THE_DAY.length];

  useEffect(() => {
    (async () => {
      const g = await loadJSON('dailyGoal', 5);
      setGoal(g);
      const progress = await loadJSON('readProgress', {});
      setReadCount(progress[todayKey()] || 0);
    })();
  }, []);

  async function addAyah() {
    const newCount = readCount + 1;
    setReadCount(newCount);
    const progress = await loadJSON('readProgress', {});
    progress[todayKey()] = newCount;
    await saveJSON('readProgress', progress);
    // Notify parent to update streak if goal reached for the first time.
    if (newCount === goal) onProgress && onProgress();
  }

  async function resetToday() {
    setReadCount(0);
    const progress = await loadJSON('readProgress', {});
    progress[todayKey()] = 0;
    await saveJSON('readProgress', progress);
  }

  async function pickGoal(g) {
    setGoal(g);
    await saveJSON('dailyGoal', g);
    if (readCount >= g) onProgress && onProgress();
  }

  const reached = readCount >= goal;
  const pct = Math.min(100, Math.round((readCount / goal) * 100));

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <SectionTitle>{t('read_title')}</SectionTitle>
        <Subtitle>{t('read_subtitle')}</Subtitle>

        {/* Verse of the day */}
        <TouchableOpacity onPress={() => speakArabic(verse.ar)}>
          <Card style={styles.verseCard}>
            <Text style={styles.vodLabel}>{t('verse_of_day')}  🔊</Text>
            <Text style={styles.ar}>{verse.ar}</Text>
            <Text style={styles.en}>{lang === 'ru' ? verse.ru : verse.en}</Text>
            <Text style={styles.ref}>Quran {verse.ref}</Text>
          </Card>
        </TouchableOpacity>

        {/* Goal selector */}
        <Card>
          <Text style={styles.goalLabel}>{t('set_goal')}</Text>
          <View style={styles.goalRow}>
            {GOAL_OPTIONS.map((g) => (
              <TouchableOpacity key={g}
                style={[styles.goalChip, goal === g && styles.goalChipActive]}
                onPress={() => pickGoal(g)}>
                <Text style={[styles.goalChipText, goal === g && styles.goalChipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Counter */}
        <Card style={{ alignItems: 'center' }}>
          <Text style={styles.counterBig}>{readCount} / {goal}</Text>
          <Text style={styles.counterLabel}>{t('ayahs_read')}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          {reached && <Text style={styles.reached}>{t('goal_reached')}</Text>}
        </Card>

        <TouchableOpacity style={styles.addBtn} onPress={addAyah}>
          <Text style={styles.addBtnText}>＋ {t('read_one_more')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={resetToday}>
          <Text style={styles.resetText}>{t('reset_today')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  verseCard: { alignItems: 'center', paddingVertical: SPACING.lg },
  vodLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: SPACING.sm, letterSpacing: 1 },
  ar: { color: COLORS.accent, fontSize: 30, textAlign: 'center', fontFamily: FONTS.arabic, lineHeight: 52 },
  en: { color: COLORS.cream, fontSize: 16, textAlign: 'center', marginTop: SPACING.md, lineHeight: 24 },
  ref: { color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.sm },
  goalLabel: { color: COLORS.accent, fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalChip: {
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  goalChipActive: { backgroundColor: COLORS.accent },
  goalChipText: { color: COLORS.cream, fontSize: 16, fontWeight: '700' },
  goalChipTextActive: { color: COLORS.navy },
  counterBig: { color: COLORS.accent, fontSize: 44, fontWeight: '900' },
  counterLabel: { color: COLORS.textMuted, fontSize: 14, marginBottom: SPACING.md },
  progressTrack: {
    width: '100%', height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 6 },
  reached: { color: COLORS.accentSoft, fontSize: 14, marginTop: SPACING.md, textAlign: 'center', fontWeight: '700' },
  addBtn: {
    backgroundColor: COLORS.accent, paddingVertical: SPACING.md, borderRadius: RADIUS.pill,
    alignItems: 'center', marginTop: SPACING.md,
  },
  addBtnText: { color: COLORS.navy, fontSize: 18, fontWeight: '800' },
  resetBtn: { alignItems: 'center', marginTop: SPACING.md, padding: SPACING.sm },
  resetText: { color: COLORS.textMuted, fontSize: 14 },
});
