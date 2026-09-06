import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Text from '../components/AppText';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, FONTS, TYPE, ARABIC } from '../constants/theme';
import { VERSES_OF_THE_DAY } from '../constants/content';
import { loadJSON, saveJSON, todayKey } from '../utils/helpers';
import { useAppearance } from '../utils/AppearanceContext';

export default function VerseScreen({ onRead }) {
  const { fonts } = useAppearance();
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
        <Text style={[styles.en, { fontFamily: fonts?.reading }]}>{verse.en}</Text>
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
  // COLORS.gold в палитре нет — золото убрали из темы, а ссылки остались.
  // color: undefined давал системный чёрный, то есть текст пропадал на фоне.
  ar: { ...ARABIC.md, color: COLORS.accent, textAlign: 'center', fontFamily: FONTS.arabic },
  en: { ...TYPE.subhead, color: COLORS.cream, fontWeight: '400',
    textAlign: 'center', marginTop: SPACING.lg, lineHeight: 26 },
  ref: { ...TYPE.callout, color: COLORS.textMuted, marginTop: SPACING.md },
  btn: {
    backgroundColor: COLORS.accentSoft, paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill, alignItems: 'center', marginTop: SPACING.lg,
  },
  btnDone: { backgroundColor: 'rgba(76,175,114,0.28)', borderWidth: 1, borderColor: COLORS.success },
  btnText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '700' },
  btnTextDone: { color: COLORS.accent },
  encourage: { ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md },
});
