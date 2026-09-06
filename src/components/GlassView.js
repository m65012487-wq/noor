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

// Плотность стекла раньше настраивалась ползунком «Прозрачность». Настройка
// убрана: она меняла вид всех экранов сразу и на краях диапазона делала
// интерфейс либо нечитаемым, либо мутным. Значение зафиксировано.
const BASE = 0.08;

// Стеклянная поверхность приложения.
//
// На iOS 26 и новее используется системный Liquid Glass: он сам преломляет
// и подсвечивает то, что под ним, и реагирует на движение устройства.
// На более старых системах остаётся ручная сборка из блюра и двух градиентов.
//
// Слои фона никогда не перехватывают касания. `flat` пропускает блюр:
// в длинных списках десяток BlurView заметно роняет прокрутку.
export default function GlassView({
  children, style, intensity, radius = RADIUS.md,
  azure = false, noBorder = false, clip = false, flat = false,
  interactive = false,
}) {
  const { tint } = useAppearance();
  const rgb = tint || '190,205,220';

  if (LIQUID_GLASS) {
    return (
      <NativeGlass
        glassEffectStyle="regular"
        tintColor={azure ? `rgba(${rgb},0.14)` : undefined}
        isInteractive={interactive}
        style={[styles.wrap, { borderRadius: radius }, style]}
      >
        {children}
      </NativeGlass>
    );
  }

  const fillTop = azure
    ? `rgba(${rgb},0.18)`
    : `rgba(255,255,255,${(BASE + 0.06).toFixed(3)})`;
  const fillBottom = azure
    ? `rgba(${rgb},0.10)`
    : `rgba(255,255,255,${BASE.toFixed(3)})`;
  const blurI = intensity != null ? intensity : 38;

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
