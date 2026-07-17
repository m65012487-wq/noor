import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../constants/theme';
import GlassView from './GlassView';
import { useAppearance } from '../utils/AppearanceContext';

// Glass card — frosted panel that blurs the background behind it.
export function Card({ children, style, intensity = 38, azure = false, gold = false }) {
  return (
    <GlassView intensity={intensity} radius={RADIUS.md} azure={azure} gold={gold}
      style={[styles.cardOuter, style]}>
      <View style={styles.cardInner}>{children}</View>
    </GlassView>
  );
}

export function SectionTitle({ children }) {
  const { flat: mono } = useAppearance();
  return <Text style={[styles.title, mono && styles.titleDot]}>{children}</Text>;
}

export function Subtitle({ children }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  cardOuter: { marginBottom: SPACING.md },
  cardInner: { padding: SPACING.md },
  title: {
    color: COLORS.cream, fontSize: 26, fontWeight: '700',
    marginTop: SPACING.md, marginBottom: SPACING.xs, letterSpacing: 0.3,
  },
  titleDot: { fontFamily: FONTS.dot, fontWeight: '400', fontSize: 22, color: COLORS.white, letterSpacing: 1, textTransform: 'uppercase' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: SPACING.md },
});
