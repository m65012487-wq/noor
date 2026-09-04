import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView as NativeGlass, isLiquidGlassAvailable } from 'expo-glass-effect';
import { RADIUS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';

// Проверка нативная и неизменная в течение сессии, поэтому считаем один раз,
// а не на каждый рендер каждой карточки.
export const LIQUID_GLASS = isLiquidGlassAvailable();

// Стеклянная поверхность приложения.
//
// На iOS 26 и новее используется системный Liquid Glass: он сам преломляет
// и подсвечивает то, что под ним, и реагирует на движение устройства.
// На более старых системах остаётся прежняя ручная сборка из блюра и двух
// градиентов — она выглядит близко, но не умеет ни преломления, ни бликов.
//
// Слои фона никогда не перехватывают касания. `flat` пропускает блюр:
// в длинных списках десяток BlurView заметно роняет прокрутку.
export default function GlassView({
  children, style, intensity, radius = RADIUS.md,
  azure = false, noBorder = false, clip = false, flat = false,
  interactive = false,
}) {
  const { glassOpacity, tint } = useAppearance();
  const base = glassOpacity != null ? glassOpacity : 0.07;
  const rgb = tint || '150,200,225';

  if (LIQUID_GLASS) {
    // Прозрачность из настроек управляет плотностью подложки: на «clear»
    // стекло почти невидимо, на «regular» заметно матовое.
    const dense = base >= 0.10;
    return (
      <NativeGlass
        glassEffectStyle={dense ? 'regular' : 'clear'}
        tintColor={azure ? `rgba(${rgb},${(base + 0.06).toFixed(3)})` : undefined}
        isInteractive={interactive}
        style={[styles.wrap, { borderRadius: radius }, style]}
      >
        {children}
      </NativeGlass>
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
      <View pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        {!flat && <BlurView intensity={blurI} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient
          colors={[fillTop, fillBottom]}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
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
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
    }),
  },
});
