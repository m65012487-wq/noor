import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';

// Frosted glass with a soft vertical gloss and a gentle top highlight.
// Calmer look (restored). Transparency is driven by the Appearance setting.
// Background layers never intercept touches. `flat` skips blur for long lists.
export default function GlassView({
  children, style, intensity, radius = RADIUS.md,
  azure = false, noBorder = false, blur = false, clip = false, flat = false,
}) {
  const { glassOpacity, tint, flat: mono } = useAppearance();
  const base = glassOpacity != null ? glassOpacity : 0.07;
  const rgb = tint || '150,200,225';

  // Flat monochrome look: near-black card with a thin light rim, no blur/gloss.
  if (mono) {
    return (
      <View style={[styles.mono, { borderRadius: radius }, azure && styles.monoAccent, style]}>
        {children}
      </View>
    );
  }

  const fillTop = azure
    ? `rgba(${rgb},${Math.min(0.34, base + 0.10).toFixed(3)})`
    : `rgba(255,255,255,${Math.min(0.26, base + 0.06).toFixed(3)})`;
  const fillBottom = azure
    ? `rgba(${rgb},${Math.min(0.22, base + 0.02).toFixed(3)})`
    : `rgba(255,255,255,${base.toFixed(3)})`;
  const blurI = intensity != null ? intensity : Math.round(28 + base * 120);

  return (
    <View style={[styles.wrap, { borderRadius: radius }, clip && { overflow: 'hidden' }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        {!flat && <BlurView intensity={blurI} tint="dark" style={StyleSheet.absoluteFill} />}
        {/* soft vertical gloss */}
        <LinearGradient
          colors={[fillTop, fillBottom]}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* gentle top highlight */}
        <LinearGradient
          colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.45 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {!noBorder && (
        <View pointerEvents="none"
          style={[StyleSheet.absoluteFill, {
            borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: 'rgba(255,255,255,0.28)',
          }]} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
    }),
  },
  mono: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  monoAccent: {
    backgroundColor: 'rgba(230,0,25,0.10)',
    borderColor: 'rgba(230,0,25,0.45)',
  },
});
