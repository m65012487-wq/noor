import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { GARDEN_COLORS } from '../constants/environmentTheme';

const BACKGROUND = require('../../assets/tasbih/environment/garden_background.png');
export default function EnvironmentScene({ colors, plain, children, style, camera, tx, ty }) {
  const scale = depth => camera ? camera.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + depth] }) : 1;
  const shift = (value, depth) => value ? value.interpolate({ inputRange: [-1, 1], outputRange: [-depth, depth] }) : 0;
  return <LinearGradient colors={colors.bg} style={[styles.flex, style]}>
    {!plain && <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.Image source={BACKGROUND} resizeMode="cover" style={[styles.overscan, { opacity: colors.imageOpacity,
        transform: [{ scale: scale(0.07) }, { translateX: shift(tx, 5) }, { translateY: shift(ty, 3) }] }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.atmosphere, opacity: colors.veil }]} />
      <LinearGradient colors={[colors.bg[0], 'transparent', colors.bg[1]]} locations={[0, 0.48, 1]} style={[StyleSheet.absoluteFill, { opacity: 0.62 }]} />
      <Animated.View style={[styles.ground, { transform: [{ scale: scale(0.20) }, { translateX: shift(tx, 10) }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none">
          <Path d="M0 85 Q100 45 205 85 Q310 65 400 95V300H0Z" fill={GARDEN_COLORS.earth} opacity="0.45" />
          <Path d="M197 80 Q224 151 120 300H275Q203 173 203 80Z" fill={GARDEN_COLORS.path} opacity="0.14" />
          <Ellipse cx="200" cy="88" rx="43" ry="7" fill={GARDEN_COLORS.stoneDark} opacity="0.14" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.ground, { transform: [{ scale: scale(0.34) }, { translateX: shift(tx, 17) }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none">
          <Path d="M0 260Q24 234 73 260Q91 251 113 272L142 300H0ZM400 247Q371 228 331 260Q302 245 275 285L262 300H400Z" fill={GARDEN_COLORS.iron} opacity="0.58" />
          <Path d="M6 265Q30 230 20 214M20 241Q40 237 47 225M369 264Q356 228 375 202M367 242Q343 236 341 224" stroke={GARDEN_COLORS.leafLight} strokeWidth="1.2" fill="none" opacity="0.32" />
        </Svg>
      </Animated.View>
    </View>}
    {children}
  </LinearGradient>;
}
const styles = StyleSheet.create({
  flex: { flex: 1, overflow: 'hidden' },
  overscan: { ...StyleSheet.absoluteFillObject, margin: -25 },
  ground: { position: 'absolute', left: -20, right: -20, bottom: -12, height: '30%' },
});
