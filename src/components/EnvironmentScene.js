import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME_BACKGROUNDS } from '../constants/environmentTheme';

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Background is the theme+phase photo itself, shown at full opacity; the
// scene no longer draws its own ground plane. A readability gradient sits on
// top so foreground text and glass panels keep contrast regardless of what
// the photo looks like: solid near the top and bottom edges, fully clear
// through the middle where the tree and gate sit.
export default function EnvironmentScene({ colors, plain, children, style, camera, tx, ty }) {
  const source = THEME_BACKGROUNDS[colors.theme]?.[colors.phase];
  const [previous, setPrevious] = useState(null);
  const current = useRef(source);
  const crossfade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (current.current === source) return undefined;
    setPrevious(current.current);
    current.current = source;
    crossfade.setValue(0);
    const animation = Animated.timing(crossfade, { toValue: 1, duration: 1200, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) setPrevious(null); });
    return () => animation.stop();
  }, [source, crossfade]);

  const scale = depth => camera ? camera.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + depth] }) : 1;
  const shift = (value, depth) => value ? value.interpolate({ inputRange: [-1, 1], outputRange: [-depth, depth] }) : 0;
  return <LinearGradient colors={colors.bg} style={[styles.flex, style]}>
    {!plain && <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {previous && <Animated.View style={[styles.overscan,
        { transform: [{ scale: scale(0.07) }, { translateX: shift(tx, 5) }, { translateY: shift(ty, 3) }] }]}>
        <Image source={previous} resizeMode="cover" style={styles.fill} />
      </Animated.View>}
      {source && <Animated.View style={[styles.overscan, { opacity: crossfade,
        transform: [{ scale: scale(0.07) }, { translateX: shift(tx, 5) }, { translateY: shift(ty, 3) }] }]}>
        <Image source={source} resizeMode="cover" style={styles.fill} />
      </Animated.View>}
      <LinearGradient
        colors={[hexToRgba(colors.bg[0], 0.78), hexToRgba(colors.bg[0], 0.4), 'transparent', 'transparent', hexToRgba(colors.bg[1], 0.7)]}
        locations={[0, 0.3, 0.5, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>}
    {children}
  </LinearGradient>;
}
const styles = StyleSheet.create({
  flex: { flex: 1, overflow: 'hidden' },
  // Запас по краям под параллакс. Размер задаёт обёртка: у Image без явных
  // width/height берётся собственный размер файла, и cover не срабатывает.
  overscan: { position: 'absolute', left: -25, top: -25, right: -25, bottom: -25 },
  fill: { width: '100%', height: '100%' },
});
