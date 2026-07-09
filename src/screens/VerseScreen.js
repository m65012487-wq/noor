import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { VERSES_OF_THE_DAY } from '../constants/content';
import { loadJSON, saveJSON, todayKey } from '../utils/helpers';

export default function VerseScreen({ onRead }) {
  const [readToday, setReadToday] = useState(false);

  // Pick a verse deterministically by day so it stays the same all day.
  const dayNum = parseInt(todayKey().replace(/-/g, ''), 10);
  const verse = VERSES_OF_THE_DAY[dayNum % VERSES_OF_THE_DAY.length];

  useEffect(() => {
    (async () => {
      const last = await loadJSON('lastReadDay');
      setReadToday(last === todayKey());
    })();
  }, []);

  async function markRead() {
    if (readToday) return;
    await saveJSON('lastReadDay', todayKey());
    setReadToday(true);
    onRead && onRead();
  }

  return (
    <ScreenWrapper>
      <SectionTitle>Verse of the Day</SectionTitle>
      <Subtitle>Reflect and read daily</Subtitle>

      <Card style={styles.verseCard}>
        <Text style={styles.ar}>{verse.ar}</Text>
        <Text style={styles.en}>{verse.en}</Text>
        <Text style={styles.ref}>{verse.ref}</Text>
      </Card>

      <TouchableOpacity
        style={[styles.btn, readToday && styles.btnDone]}
        onPress={markRead}
        disabled={readToday}
      >
        <Text style={[styles.btnText, readToday && styles.btnTextDone]}>
          {readToday ? '✓ Read today' : 'Mark as read'}
        </Text>
      </TouchableOpacity>

      {readToday && (
        <Text style={styles.encourage}>
          Well done. Come back tomorrow to keep your streak alive.
        </Text>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  verseCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  ar: { color: COLORS.gold, fontSize: 32, textAlign: 'center', fontFamily: FONTS.arabic, lineHeight: 54 },
  en: { color: COLORS.cream, fontSize: 18, textAlign: 'center', marginTop: SPACING.lg, lineHeight: 26 },
  ref: { color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.md },
  btn: {
    backgroundColor: COLORS.gold, paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill, alignItems: 'center', marginTop: SPACING.lg,
  },
  btnDone: { backgroundColor: 'rgba(13,92,74,0.6)', borderWidth: 1, borderColor: COLORS.gold },
  btnText: { color: COLORS.navy, fontSize: 18, fontWeight: '700' },
  btnTextDone: { color: COLORS.gold },
  encourage: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md },
});
