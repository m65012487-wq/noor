import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING } from '../constants/theme';
import { loadJSON, todayKey } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';

export default function StreakScreen({ refreshKey }) {
  const { t } = useLang();
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState({});

  useEffect(() => {
    (async () => {
      setStreak(await loadJSON('streakCount', 0));
      setHistory(await loadJSON('goalHistory', {}));
    })();
  }, [refreshKey]);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' })[0],
      done: !!history[key],
      isToday: key === todayKey(),
    });
  }

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <SectionTitle>{t('streak_title')}</SectionTitle>
        <Subtitle>{t('streak_subtitle')}</Subtitle>

        <Card style={styles.flameCard}>
          <Image source={require('../../assets/glyphs/streak.png')}
            style={styles.flame} resizeMode="contain" />
          <Text style={styles.count}>{streak}</Text>
          <Text style={styles.label}>{streak === 1 ? t('day_in_row') : t('days_in_row')}</Text>
        </Card>

        <Card>
          <Text style={styles.weekTitle}>{t('last_days')}</Text>
          <View style={styles.week}>
            {days.map((d) => (
              <View key={d.key} style={styles.dayCol}>
                <View style={[styles.dot, d.done && styles.dotDone, d.isToday && styles.dotToday]}>
                  <Text style={styles.check}>{d.done ? '✓' : ''}</Text>
                </View>
                <Text style={styles.dayLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.tip}>{t('streak_tip')}</Text>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flameCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  flame: { width: 72, height: 72, tintColor: COLORS.white, marginBottom: SPACING.sm },
  count: { color: COLORS.accent, fontSize: 56, fontWeight: '900' },
  label: { color: COLORS.cream, fontSize: 16 },
  weekTitle: { color: COLORS.accent, fontSize: 16, fontWeight: '700', marginBottom: SPACING.md },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center' },
  dot: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: { backgroundColor: COLORS.accent },
  dotToday: { borderWidth: 2, borderColor: COLORS.accent },
  check: { color: COLORS.navy, fontWeight: '900' },
  dayLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  tip: { color: COLORS.cream, fontSize: 14, lineHeight: 20 },
});
