import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './AppText';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import GlassView from './GlassView';

// Стеклянная карточка — матовая панель, размывающая фон под собой.
export function Card({ children, style, intensity = 38, azure = false }) {
  return (
    <GlassView intensity={intensity} radius={RADIUS.md} azure={azure}
      style={[styles.cardOuter, style]}>
      <View style={styles.cardInner}>{children}</View>
    </GlassView>
  );
}

export function SectionTitle({ children }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

// Надзаголовок над группой: разрядка и капитель. Раньше такой стиль
// выписывали руками в каждом экране, каждый раз чуть по-своему.
export function Overline({ children, style }) {
  return <Text style={[styles.overline, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  cardOuter: { marginBottom: SPACING.md },
  cardInner: { padding: SPACING.md },
  title: {
    ...TYPE.title, color: COLORS.cream,
    marginTop: SPACING.md, marginBottom: SPACING.xs, letterSpacing: 0.3,
  },
  subtitle: { ...TYPE.callout, color: COLORS.textMuted, marginBottom: SPACING.md },
  overline: { ...TYPE.overline, color: COLORS.textMuted, marginBottom: SPACING.sm },
});
