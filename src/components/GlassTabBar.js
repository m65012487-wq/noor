import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView as NativeGlass } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import Icon from './Icon';
import { LIQUID_GLASS } from './GlassView';

const TABS = { Prayer: 'prayer', Qibla: 'qibla', Quran: 'quran', Read: 'read' };

const { width } = Dimensions.get('window');

// Плавающая «островная» панель вкладок.
// На iOS 26 остров — системный Liquid Glass: он преломляет содержимое под собой
// и отзывается на касание. На старых системах собирается вручную из блюра
// и двух градиентов.
export default function GlassTabBar({ state, descriptors, navigation }) {
  // Все хуки вызываются безусловно и до любого возврата: ранний return null
  // менял их число между рендерами и ронял приложение с «Rendered more hooks
  // than during the previous render» при входе в чтение суры.
  const insets = useSafeAreaInsets();
  const { glassOpacity, tint, accent } = useAppearance();
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
  }, [state.index, slide]);

  // Скрываем панель внутри читалки суры — уже после всех хуков.
  const focusedRoute = state.routes[state.index];
  const nested = focusedRoute?.state;
  const hidden =
    !!nested?.routes?.[nested.index] &&
    nested.routes[nested.index].name === 'SurahReader';

  const translateX = slide.interpolate({
    inputRange: [0, count - 1],
    outputRange: [0, SLOT * (count - 1)],
  });

  const items = (
    <>
      <Animated.View
        style={[styles.highlight,
          { width: SLOT - 12, backgroundColor: `rgba(${rgb},0.20)`,
            transform: [{ translateX }] }]}
        pointerEvents="none"
      />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const e = navigation.emit({
              type: 'tabPress', target: route.key, canPreventDefault: true,
            });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} style={[styles.item, { width: SLOT }]}
              onPress={onPress} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}>
              <Icon
                name={TABS[route.name] || 'prayer'}
                size={24}
                weight={focused ? 'semibold' : 'regular'}
                color={focused ? accent : COLORS.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  if (hidden) return null;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      {LIQUID_GLASS ? (
        <NativeGlass
          glassEffectStyle="regular"
          isInteractive
          style={[styles.island, styles.islandLiquid, { width: ISLAND_W }]}
        >
          {items}
        </NativeGlass>
      ) : (
        <BlurView intensity={Math.round(34 + base * 120)} tint="dark"
          style={[styles.island, styles.islandBlur, { width: ISLAND_W }]}>
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
    height: 62, borderRadius: 31, justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  // Liquid Glass рисует собственный край и блик, поэтому рамка не нужна:
  // вторая обводка поверх системной выглядит грязно.
  islandLiquid: { overflow: 'hidden' },
  islandBlur: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.30)',
  },
  highlight: {
    position: 'absolute', left: 6, height: 46, top: 8, borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { height: 62, alignItems: 'center', justifyContent: 'center' },
});
