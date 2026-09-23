import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import GlassView from '../components/GlassView';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { SEED_ASSETS } from './assets';
import { SPECIES } from './model';

const FALL_MS = 900;
const TOAST_MS = 2600;

const REASON_LABEL = {
  week: { ru: '7 дней зикра', en: '7 days of dhikr' },
  harvest: { ru: 'Дерево дало плод', en: 'The tree bore fruit' },
  circle: { ru: 'Полный круг 99', en: 'A full circle of 99' },
};

// One pending drop at a time: a seed icon falls from the crown to the root
// with a small bounce, then a toast names the species and reason. Calls
// `onDone` once — the caller pops the drop off `pendingDrops` (ackDrop()).
export default function SeedDrop({ drop, reduceMotion, onDone }) {
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const fall = useRef(new Animated.Value(0)).current;
  const toast = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    const finish = () => { if (!cancelled) doneRef.current?.(); };
    if (reduceMotion) {
      (hapticSuccess || hapticLight)();
      Animated.timing(toast, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      const timer = setTimeout(finish, TOAST_MS);
      return () => { cancelled = true; clearTimeout(timer); };
    }
    fall.setValue(0);
    toast.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(fall, { toValue: 1, duration: FALL_MS * 0.72, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.spring(fall, { toValue: 1, damping: 7, stiffness: 260, mass: 0.5, useNativeDriver: true }),
    ]);
    animation.start(() => {
      if (cancelled) return;
      (hapticSuccess || hapticLight)();
      Animated.timing(toast, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
    const timer = setTimeout(finish, FALL_MS + TOAST_MS);
    return () => { cancelled = true; animation.stop(); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drop, reduceMotion]);

  const species = SPECIES.find(s => s.id === drop.species);
  const speciesLabel = species ? (ru ? species.ru : species.en) : drop.species;
  const reasonLabel = REASON_LABEL[drop.reason] ? (ru ? REASON_LABEL[drop.reason].ru : REASON_LABEL[drop.reason].en) : '';
  const icon = SEED_ASSETS[drop.species];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!reduceMotion && icon && (
        <Animated.View style={[styles.seed, {
          opacity: fall.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, '52%'] }) },
            { scale: fall.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }],
        }]}>
          <Image source={icon} style={styles.seedImage} resizeMode="contain" />
        </Animated.View>
      )}
      <Animated.View style={[styles.toastWrap, {
        opacity: toast,
        transform: [{ translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }]}>
        <GlassView radius={RADIUS.pill} style={styles.toast}>
          <Text style={[styles.toastTitle, { color: accent }]} accessibilityLiveRegion="polite">
            {ru ? 'Выпало зерно' : 'A seed dropped'} · {speciesLabel}
          </Text>
          {!!reasonLabel && <Text style={styles.toastReason}>{reasonLabel}</Text>}
        </GlassView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  seed: { position: 'absolute', left: '50%', top: '35%', width: 40, height: 40, marginLeft: -20 },
  seedImage: { width: '100%', height: '100%' },
  toastWrap: { position: 'absolute', top: 0, left: SPACING.lg, right: SPACING.lg, alignItems: 'center' },
  toast: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, alignItems: 'center' },
  toastTitle: { ...TYPE.callout, fontWeight: '600' },
  toastReason: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
});
