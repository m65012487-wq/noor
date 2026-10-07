import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Animated, AccessibilityInfo, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceMotion } from 'expo-sensors';
import { NavigationContext } from '@react-navigation/native';
import { SPACING } from '../constants/theme';
import LiveBackground from './LiveBackground';
import {
  useAppearance, SCENE_LAYERS, patternKind,
} from '../utils/AppearanceContext';

// Насколько уезжает каждый план при полном наклоне, в точках: дальний почти
// стоит, ближний идёт заметно. Разница и есть весь эффект — если развести
// планы слабо, движение читается как дрожание картинки, а не как глубина.
const DEPTH = [7, 17, 30];

// Запас по краям: слои сдвигаются, и без него у границы кадра открылась бы
// пустота. Берётся с двойным перекрытием самого подвижного плана.
const BLEED = 64;

const clamp = (v) => Math.max(-1, Math.min(1, v));

// Наклон устройства, приведённый к диапазону −1…1 по каждой оси.
//
// Опорное положение не фиксируется: телефон держат под своим углом, и жёсткий
// ноль оставил бы картинку всегда сдвинутой к краю. База медленно подтягивается
// к текущему наклону, поэтому сцена отзывается на движение и сама возвращается
// в центр, когда телефон замирает.
function useTilt(active) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || Platform.OS === 'web') {
      tx.setValue(0);
      ty.setValue(0);
      return undefined;
    }

    let sub = null;
    let cancelled = false;
    let baseX = null;
    let baseY = null;
    let curX = 0;
    let curY = 0;

    (async () => {
      const ok = await DeviceMotion.isAvailableAsync().catch(() => false);
      if (!ok || cancelled) return;
      DeviceMotion.setUpdateInterval(60);
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        const { gamma, beta } = rotation;
        if (typeof gamma !== 'number' || typeof beta !== 'number') return;
        if (baseX === null) { baseX = gamma; baseY = beta; }
        baseX += (gamma - baseX) * 0.02;
        baseY += (beta - baseY) * 0.02;
        // Сырые показания дрожат даже у неподвижного телефона, поэтому
        // значение подтягивается к цели, а не присваивается.
        curX += (clamp((gamma - baseX) / 0.35) - curX) * 0.18;
        curY += (clamp((beta - baseY) / 0.35) - curY) * 0.18;
        tx.setValue(curX);
        ty.setValue(curY);
      });
    })().catch(() => { tx.setValue(0); ty.setValue(0); });

    return () => { cancelled = true; if (sub) sub.remove(); };
  }, [active, tx, ty]);

  return { tx, ty };
}

// «Уменьшение движения» в настройках iOS включают не из прихоти: параллакс
// у части людей вызывает укачивание. Системный флаг перевешивает настройку
// приложения — спрашивать об этом второй раз незачем.
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduce(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

// В фокусе ли экран. Вкладки после первого открытия остаются смонтированными,
// и живой фон на каждой из них крутился бы впустую. Вне навигатора (фон
// бывает и в модальном окне) экран считается видимым.
export function useScreenFocused() {
  const nav = useContext(NavigationContext);
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    if (!nav) return undefined;
    setFocused(nav.isFocused());
    const offFocus = nav.addListener('focus', () => setFocused(true));
    const offBlur = nav.addListener('blur', () => setFocused(false));
    return () => { offFocus(); offBlur(); };
  }, [nav]);
  return focused;
}

function shift(value, distance, factor = 1) {
  return value.interpolate({
    inputRange: [-1, 1],
    outputRange: [distance * factor, -distance * factor],
  });
}

// Фон по текущей теме. Логика лежит здесь одна на всё приложение: раньше
// она была продублирована в обёртке экранов, читалке суры и плеере уроков,
// и обучение осталось с фотографией, когда появились узорные темы.
//
// `plain` — спокойный градиент без узора. Для длинного чтения любой рисунок
// под текстом мешает: узор просвечивает между строк.
// `scene` — свои планы сцены вместо выбранного узора: так у экрана тасбиха
// свой сад, а не обои главного экрана. Цвет по-прежнему даёт схема.
export function ThemedBackground({ children, plain = false, scene = null, style }) {
  const appearance = useAppearance();
  const reduceMotion = useReduceMotion();
  const kind = scene ? 'scene' : patternKind(appearance?.pattern);
  const wanted = appearance?.parallax !== false && !reduceMotion && !plain && kind !== 'none' && kind !== 'live';
  const { tx, ty } = useTilt(wanted);
  const focused = useScreenFocused();

  const sc = appearance?.schemeColors;
  const bg = sc ? sc.bg : ['#1b2430', '#0d131b'];
  // Экраны чтения и вариант «без узора» получают чистый градиент.
  if (plain || kind === 'none') {
    return (
      <LinearGradient colors={bg} style={[styles.flex, style]}>
        {children}
      </LinearGradient>
    );
  }

  // Живая тема рисует себя сама и движется без наклона телефона. При
  // «Уменьшении движения» в iOS она замирает, но остаётся той же картинкой.
  if (kind === 'live') {
    return (
      <LinearGradient colors={bg} style={[styles.flex, style]}>
        {/* На скрытой вкладке живой фон не рисуется вовсе: замереть мало —
            слои и их память оставались бы на каждой открытой вкладке. */}
        {focused && <LiveBackground variant={appearance.pattern} scheme={sc} still={reduceMotion} />}
        {children}
      </LinearGradient>
    );
  }

  // Сцена разложена на три плана и собирается стопкой.
  const layers = scene || SCENE_LAYERS[appearance.pattern];
  if (kind === 'scene' && layers) {
    return (
      <LinearGradient colors={bg} style={[styles.flex, style]}>
        <View style={styles.flex} pointerEvents="box-none">
          {layers.map((src, i) => (
            <Animated.Image
              key={i}
              source={src}
              resizeMode="cover"
              pointerEvents="none"
              style={[styles.plane, {
                tintColor: `rgba(${sc.tint},0.85)`,
                transform: [
                  { translateX: shift(tx, DEPTH[i]) },
                  { translateY: shift(ty, DEPTH[i], 0.6) },
                ],
              }]}
            />
          ))}
          {children}
        </View>
      </LinearGradient>
    );
  }

  // Сохранённой сцены нет (обновление убрало тему) — чистый градиент.
  return (
    <LinearGradient colors={bg} style={[styles.flex, style]}>
      {children}
    </LinearGradient>
  );
}

// `plain` включает фон без узора — для экранов чтения.
export default function ScreenWrapper({
  children, edges = ['top'], plain = false, swipeHandlers,
}) {
  return (
    <ThemedBackground plain={plain}>
      <SafeAreaView style={styles.safe} edges={edges}>
        <View style={styles.inner} {...(swipeHandlers || {})}>{children}</View>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: SPACING.md },
  plane: { ...StyleSheet.absoluteFillObject, margin: -BLEED, width: undefined, height: undefined },
});
