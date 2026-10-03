import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Text from './AppText';
import GlassView from './GlassView';
import Icon from './Icon';
import { useReduceMotion } from './ScreenWrapper';
import { COLORS, RADIUS, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight, hapticSuccess } from '../utils/haptics';

// «Сдвиньте, чтобы подтвердить» — как выключение будильника в iOS. Случайное
// касание действие не запускает: нужно сознательно протянуть ползунок до конца.
// Подходит для необратимого или важного подтверждения, где обычная кнопка
// срабатывает слишком легко.
//
// Анимации: ползунок, заливка, подпись и блик — только opacity и transform на
// нативном драйвере. Положение ползунка пишется setValue из жеста и
// возвращается пружиной: JS-драйвер к нему не подключается никогда.
const TRACK_H = 56;
const PAD = 4;
const KNOB = TRACK_H - PAD * 2;
// Доля пути, после которой отпущенный ползунок считается подтверждением.
const CONFIRM_AT = 0.85;
const GLINT_W = 96;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function SlideToConfirm({ label, accessibilityLabel, accessibilityHint, onConfirm }) {
  const { accent } = useAppearance();
  const reduceMotion = useReduceMotion();
  const [trackW, setTrackW] = useState(0);
  const [done, setDone] = useState(false);
  const x = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;
  const maxRef = useRef(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const armedRef = useRef(false);
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  // Пока ползунок едет назад, его не берём: значение нативной анимации
  // приходит в JS с опозданием, и подхваченный на лету ползунок прыгал бы.
  const returningRef = useRef(false);
  const springBack = useCallback(() => {
    returningRef.current = true;
    Animated.spring(x, {
      toValue: 0, damping: 16, stiffness: 190, mass: 0.8, overshootClamping: true, useNativeDriver: true,
    }).start(() => { returningRef.current = false; });
  }, [x]);

  // Подтверждение не прошло (например, не записалось): ползунок возвращается,
  // и человек может повторить.
  const reset = useCallback(() => {
    doneRef.current = false;
    armedRef.current = false;
    setDone(false);
    springBack();
  }, [springBack]);

  // Общий путь для жеста и для действия VoiceOver, которое не умеет тянуть.
  const confirm = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    hapticSuccess();
    Animated.timing(x, {
      toValue: maxRef.current, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
    try {
      const result = confirmRef.current?.();
      if (result && typeof result.then === 'function') result.then(undefined, reset);
    } catch {
      reset();
    }
  }, [x, reset]);

  // Создаётся один раз: экран перерисовывается каждую секунду (часы).
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !doneRef.current && !returningRef.current && maxRef.current > 0,
    onMoveShouldSetPanResponder: () => !doneRef.current && !returningRef.current && maxRef.current > 0,
    onPanResponderGrant: () => {
      armedRef.current = false;
      startRef.current = 0;
    },
    onPanResponderMove: (_event, gesture) => {
      const position = clamp(startRef.current + gesture.dx, 0, maxRef.current);
      x.setValue(position);
      const armed = position >= maxRef.current * CONFIRM_AT;
      if (armed !== armedRef.current) {
        armedRef.current = armed;
        if (armed) hapticLight();
      }
    },
    onPanResponderRelease: (_event, gesture) => {
      const position = clamp(startRef.current + gesture.dx, 0, maxRef.current);
      startRef.current = 0;
      if (position >= maxRef.current * CONFIRM_AT) confirm();
      else springBack();
    },
    onPanResponderTerminate: () => { startRef.current = 0; springBack(); },
    // Родитель (свайп между вкладками) не должен забирать жест у ползунка.
    onPanResponderTerminationRequest: () => false,
  }));

  // Блик пробегает по дорожке с паузой. «Уменьшение движения» оставляет
  // дорожку без блика: подсказка работает и неподвижной.
  useEffect(() => {
    if (reduceMotion || done || trackW <= 0) return undefined;
    glint.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glint, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, done, trackW, glint]);

  const onLayout = event => {
    const width = event.nativeEvent.layout.width;
    maxRef.current = Math.max(0, width - KNOB - PAD * 2);
    setTrackW(width);
  };

  const max = Math.max(1, trackW - KNOB - PAD * 2);
  // Интерполяции собираются заново только при смене ширины: родитель
  // перерисовывается раз в секунду, и пересоздавать нативные узлы незачем.
  const { fade, fillShift, fillOpacity, glintShift } = useMemo(() => ({
    // Подпись и блик гаснут по мере сдвига: к середине пути их уже нет.
    fade: x.interpolate({ inputRange: [0, max * 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
    // Заливка — широкая плашка, сдвинутая влево так, что её правый край идёт
    // за ползунком. Шириной нативный драйвер управлять не умеет, сдвигом — умеет.
    fillShift: x.interpolate({ inputRange: [0, max], outputRange: [TRACK_H - trackW, max + TRACK_H - trackW] }),
    fillOpacity: x.interpolate({ inputRange: [0, 12], outputRange: [0, 0.32], extrapolate: 'clamp' }),
    glintShift: glint.interpolate({ inputRange: [0, 1], outputRange: [-GLINT_W, trackW] }),
  }), [x, glint, max, trackW]);
  const name = accessibilityLabel || label;

  return (
    <View style={styles.root} onLayout={onLayout}
      accessible accessibilityRole="button" accessibilityLabel={name} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: done }}
      // VoiceOver тянуть не умеет: двойное касание подтверждает сразу. Именно
      // onAccessibilityTap, а не accessibilityActions 'activate' — в новой
      // архитектуре RN (Fabric) двойное касание вызывает только его.
      onAccessibilityTap={confirm}>
      <GlassView radius={RADIUS.pill} flat style={styles.track}>
        <View pointerEvents="none" style={styles.clip}>
          {trackW > 0 && (
            <Animated.View style={[styles.fill, {
              width: trackW, backgroundColor: accent, opacity: fillOpacity, transform: [{ translateX: fillShift }],
            }]} />
          )}
          {trackW > 0 && !reduceMotion && !done && (
            <Animated.View style={[styles.glintWrap, { opacity: fade }]}>
              <Animated.View style={[styles.glint, { transform: [{ translateX: glintShift }] }]}>
                <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.30)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </Animated.View>
          )}
        </View>

        <Animated.View pointerEvents="none" style={[styles.labelWrap, { opacity: fade }]}>
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
        </Animated.View>

        <Animated.View {...pan.panHandlers} hitSlop={{ top: 8, bottom: 8, left: 8, right: 12 }}
          style={[styles.knob, { transform: [{ translateX: x }] }]}>
          <Icon name={done ? 'check' : 'sun'} size={22} color={COLORS.navy} />
        </Animated.View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch' },
  track: { height: TRACK_H, justifyContent: 'center' },
  clip: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.pill, overflow: 'hidden', backgroundColor: COLORS.surface },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: RADIUS.pill },
  glintWrap: { ...StyleSheet.absoluteFillObject },
  glint: { position: 'absolute', top: 0, bottom: 0, left: 0, width: GLINT_W },
  // Подпись по центру свободной части дорожки: с обеих сторон отступ
  // под ползунок, поэтому текст не съезжает вправо.
  labelWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: TRACK_H },
  label: {
    ...TYPE.callout, fontWeight: '600', color: COLORS.text, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  knob: {
    position: 'absolute', left: PAD, top: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
});
