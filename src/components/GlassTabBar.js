import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';

const GLYPHS = {
  Prayer: require('../../assets/glyphs/prayer.png'),
  Qibla: require('../../assets/glyphs/qibla.png'),
  Quran: require('../../assets/glyphs/quran.png'),
  Read: require('../../assets/glyphs/read.png'),
};

const { width } = Dimensions.get('window');

// Floating "island" frosted tab bar with a sliding highlight.
export default function GlassTabBar({ state, descriptors, navigation }) {
  // Hide inside the Surah reader detail screen.
  const focusedRoute = state.routes[state.index];
  const nested = focusedRoute?.state;
  if (nested && nested.routes && nested.routes[nested.index]) {
    if (nested.routes[nested.index].name === 'SurahReader') return null;
  }

  const insets = useSafeAreaInsets();
  const { glassOpacity, tint, flat: mono, accent } = useAppearance();
  const rgb = tint || '150,200,225';
  const base = glassOpacity != null ? glassOpacity : 0.07;
  const count = state.routes.length;
  const ISLAND_W = Math.min(width - 32, 360);
  const SLOT = ISLAND_W / count;
  const slide = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: state.index, useNativeDriver: true, friction: 9, tension: 80,
    }).start();
  }, [state.index]);

  const translateX = slide.interpolate({
    inputRange: [0, count - 1],
    outputRange: [0, SLOT * (count - 1)],
  });

  const blurI = Math.round(34 + base * 120);

  const items = (
    <>
      {/* sliding highlight pill */}
      <Animated.View
        style={[styles.highlight,
          mono && { backgroundColor: 'rgba(230,0,25,0.16)', borderColor: accent },
          { width: SLOT - 12, transform: [{ translateX }] }]}
        pointerEvents="none"
      />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const glyph = GLYPHS[route.name];
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} style={[styles.item, { width: SLOT }]}
              onPress={onPress} activeOpacity={0.8}>
              <Image source={glyph}
                style={{ width: 25, height: 25, tintColor: focused ? COLORS.white : COLORS.textMuted,
                         opacity: focused ? 1 : 0.65 }}
                resizeMode="contain" />
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      {mono ? (
        <View style={[styles.island, styles.islandMono, { width: ISLAND_W }]}>
          {items}
        </View>
      ) : (
        <BlurView intensity={blurI} tint="dark" style={[styles.island, { width: ISLAND_W }]}>
          {/* liquid glass layers */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={[`rgba(${rgb},${Math.min(0.30, base + 0.08).toFixed(3)})`,
                       `rgba(${rgb},${Math.min(0.18, base).toFixed(3)})`]}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
          </View>
          {items}
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  island: {
    height: 62, borderRadius: 31, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.30)',
    justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  islandMono: { backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.20)' },
  film: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(127,180,204,0.10)' },
  highlight: {
    position: 'absolute', left: 6, height: 46, top: 8, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { height: 62, alignItems: 'center', justifyContent: 'center' },
});
