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
// У зимней темы свой сад — один кадр на все месяцы (см. tasbih_garden_assets.md)
// и отдельный ночной: дневное фото под одной вуалью ночью оставалось дневным,
// хотя пейзаж перед воротами уже ночной. Ночной кадр — цветокоррекция того же
// мастера, композиция совпадает.
const THEME_GARDENS = {
  winter: {
    base: require('../../assets/tasbih/winter/garden_winter.jpg'),
    night: require('../../assets/tasbih/winter/garden_winter_night.jpg'),
  },
};

function rgba(hex, alpha) {
  const v = (hex || '#060e0c').replace('#', '');
  return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${alpha})`;
}

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
  const { phase, schemeColors } = useAppearance();
  const themed = THEME_GARDENS[schemeColors?.theme];
  const source = themed?.[phase] || themed?.base
    || GARDEN_BACKGROUNDS[seasonAt(new Date())] || GARDEN_BACKGROUNDS.spring;
  // Если у фазы свой кадр, вуаль поверх него уже лишняя.
  const ownPhaseImage = !!themed?.[phase];
  // Затемнение для читаемости — в тоне темы (у зимы тёмно-синее), а не
  // зелёное: на светлом снежном небе зелёная вуаль выглядела грязью, а
  // счётчик терялся в облаках. Верх плотнее и ниже — там весь текст.
  const top = schemeColors?.bg?.[0];
  const bottom = schemeColors?.bg?.[1];
  const scale = camera ? camera.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] }) : 1;
  const veil = ownPhaseImage ? null : PHASE_VEIL[phase] || null;
  return (
    <View style={styles.flex}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.overscan, { transform: [{ scale }] }]}>
          <Image source={source} resizeMode="cover" style={styles.fill} />
        </Animated.View>
        <LinearGradient
          colors={[rgba(top, 0.8), rgba(top, 0.45), rgba(top, 0), rgba(bottom, 0), rgba(bottom, 0.55)]}
          locations={[0, 0.3, 0.52, 0.72, 1]}
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
