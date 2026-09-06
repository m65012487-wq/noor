import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import Text from '../components/AppText';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, FONTS, TYPE, ARABIC } from '../constants/theme';
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
  vodLabel: { ...TYPE.overline, color: COLORS.textMuted, marginBottom: SPACING.sm },
  ar: { ...ARABIC.md, color: COLORS.accent, textAlign: 'center', fontFamily: FONTS.arabic },
  en: { ...TYPE.body, color: COLORS.cream, textAlign: 'center',
    marginTop: SPACING.md, lineHeight: 24 },
  ref: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.sm },

  goalLabel: { ...TYPE.body, color: COLORS.accent, fontWeight: '700', marginBottom: SPACING.sm },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalChip: {
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  goalChipActive: { backgroundColor: COLORS.accent },
  goalChipText: { ...TYPE.body, color: COLORS.cream, fontWeight: '700' },
  goalChipTextActive: { color: COLORS.navy },

  counterBig: { ...TYPE.hero, ...TYPE.mono, color: COLORS.accent, fontWeight: '900' },
  counterLabel: { ...TYPE.callout, color: COLORS.textMuted, marginBottom: SPACING.md },
  progressTrack: {
    width: '100%', height: 12, borderRadius: 6,
    backgroundColor: COLORS.surfaceStrong, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 6 },
  reached: { ...TYPE.callout, color: COLORS.accentSoft, marginTop: SPACING.md,
    textAlign: 'center', fontWeight: '700' },

  addBtn: {
    backgroundColor: COLORS.accent, paddingVertical: SPACING.md, borderRadius: RADIUS.pill,
    alignItems: 'center', marginTop: SPACING.md,
  },
  addBtnText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '800' },
  resetBtn: { alignItems: 'center', marginTop: SPACING.md, padding: SPACING.sm },
  resetText: { ...TYPE.callout, color: COLORS.textMuted },
});
