import React from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppearance } from '../utils/AppearanceContext';
import { seasonAt } from './model';

// One still photo per season, not the appearance theme's wallpaper — the
// tasbih garden is its own place (see docs/TASBIH_V3_SPEC.md, section C).
const GARDEN_BACKGROUNDS = {
  spring: require('../../assets/tasbih/garden/spring.jpg'),
  summer: require('../../assets/tasbih/garden/summer.jpg'),
  autumn: require('../../assets/tasbih/garden/autumn.jpg'),
  winter: require('../../assets/tasbih/garden/winter.jpg'),
};

// A light veil per time of day, layered over the readability gradient below.
const PHASE_VEIL = {
  night: 'rgba(10,20,45,0.45)',
  dawn: 'rgba(255,176,110,0.12)',
  sunset: 'rgba(255,150,90,0.12)',
  day: null,
};

// The tasbih screen's own backdrop. `camera` is the same 0..1 Animated.Value
// GateEntry drives while opening the gate: a light zoom-out (1.12 → 1) sells
// arriving in the garden. When not passed (e.g. rendered on its own) the
// background simply sits still at its resting scale.
export default function GardenBackground({ children, camera }) {
  const { phase } = useAppearance();
  const source = GARDEN_BACKGROUNDS[seasonAt(new Date())] || GARDEN_BACKGROUNDS.spring;
  const scale = camera ? camera.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] }) : 1;
  const veil = PHASE_VEIL[phase] || null;
  return (
    <View style={styles.flex}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.overscan, { transform: [{ scale }] }]}>
          <Image source={source} resizeMode="cover" style={styles.fill} />
        </Animated.View>
        <LinearGradient
          colors={['rgba(6,14,12,0.7)', 'rgba(6,14,12,0)', 'rgba(6,14,12,0)', 'rgba(6,14,12,0.55)']}
          locations={[0, 0.45, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        {!!veil && <View style={[StyleSheet.absoluteFill, { backgroundColor: veil }]} />}
      </View>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, overflow: 'hidden' },
  // Bleed past the edges so the zoom-out never uncovers a gap.
  overscan: { position: 'absolute', left: -25, top: -25, right: -25, bottom: -25 },
  fill: { width: '100%', height: '100%' },
});
