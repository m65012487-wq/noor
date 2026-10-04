import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useAppearance } from '../utils/AppearanceContext';

// Полив на завершённый круг: сбоку над деревом появляется лейка, наклоняется,
// из носика по дуге падают капли к корню, дерево вздыхает, лейка уходит.
//
// Вся сцена — одна нативная анимация прогресса `progress` (0..1 за
// WATERING_MS), а каждое движение выводится из неё по ключевым кадрам
// (track): лейка, капли, всплеск у земли и «вздох» дерева (wateringBreath).
// Один таймер и ни одного JS-тика в процессе, поэтому всё идёт в такт и не
// зависит от загруженности JS-потока. Только opacity и transform.

export const WATERING_MS = 1800;
const CALM_MS = 1200; // reduceMotion: лейка без наклона и капель

const VB = { width: 120, height: 90 }; // холст рисунка лейки
const CAN_W = 104;
const TILT = 35;
const PIVOT = '55% 62%';
// Носик (ситечко) после наклона на 35° — в координатах холста рисунка.
const TIP = { x: 9, y: 75 };
// Правый край лейки от носика: сколько места нужно справа.
const REACH = 108;

// Расписание, мс от начала полива.
const IN_MS = 320;
const TILT_AT = 280;
const TILT_MS = 420;
const POUR_AT = 640;
const DROP_MS = 520;
const TILT_BACK_AT = 1250;
const TILT_BACK_MS = 330;
const OUT_AT = 1350;
const OUT_MS = 350;
const BREATH_AT = 1100;
const BREATH_UP_MS = 260;

const MAX_DROPS = 12;
const BASE_DROPS = 8; // на круг; остальные четыре — только на полный круг 99
const DROP = { width: 7, height: 11 };
const STEPS = 8;

const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.quad);
const easeInOut = Easing.inOut(Easing.cubic);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = v => Math.round(v * 1000) / 1000;

// Ключевые кадры: сегменты [с, до, от, к, смягчение] в мс. Между сегментами
// значение держится, до первого и после последнего — тоже. Возвращает диапазоны
// для interpolate(), нормированные на длину сцены.
function track(total, segments) {
  const input = [];
  const output = [];
  const add = (ms, value) => {
    const x = round(clamp(ms / total, 0, 1));
    const v = round(value);
    if (input.length && input[input.length - 1] === x && output[output.length - 1] === v) return;
    input.push(x);
    output.push(v);
  };
  segments.forEach(([from, to, a, b, ease = Easing.linear], index) => {
    if (index === 0 && from > 0) add(0, a);
    add(from, a);
    for (let k = 1; k <= STEPS; k += 1) add(from + ((to - from) * k) / STEPS, a + (b - a) * ease(k / STEPS));
  });
  const last = segments[segments.length - 1];
  if (last[1] < total) add(total, last[3]);
  return { inputRange: input, outputRange: output };
}

const at = (progress, frames, unit) => progress.interpolate({
  inputRange: frames.inputRange,
  outputRange: unit ? frames.outputRange.map(v => `${v}${unit}`) : frames.outputRange,
});

// «Вздох» дерева: короткое 1 → 1.03 → 1 от корня, когда первые капли долетели.
// Стиль для обёртки вокруг TreeView; progress — тот же, что отдан WateringCan.
export function wateringBreath(progress, originY) {
  const frames = track(WATERING_MS, [
    [BREATH_AT, BREATH_AT + BREATH_UP_MS, 1, 1.03, Easing.out(Easing.quad)],
    [BREATH_AT + BREATH_UP_MS, WATERING_MS, 1.03, 1, Easing.inOut(Easing.quad)],
  ]);
  return {
    transformOrigin: originY != null ? `50% ${Math.round(originY)}px` : '50% 90%',
    transform: [{ scale: at(progress, frames) }],
  };
}

// Задержка капли: первые восемь равномерно по времени полива, остальные
// четыре вклиниваются между ними.
function dropDelay(i) {
  return i < BASE_DROPS ? POUR_AT + i * 66 : POUR_AT + 33 + (i - BASE_DROPS) * 132;
}

// Где стоит лейка и куда падает вода. Носик — над деревом сбоку (справа), так
// что струя идёт влево и вниз к корню; места справа должно хватить на саму лейку.
function layout(geo) {
  const f = clamp(Math.min(geo.width / 340, geo.height / 300), 0.7, 1.05);
  const k = (CAN_W * f) / VB.width;
  const maxDx = geo.width / 2 - 4 - REACH * k;
  const dx = clamp(geo.crown.width * 0.35, 28, Math.max(28, maxDx));
  const tip = { x: geo.root.x + dx };
  const drop = Math.max(100, (geo.root.y - geo.top) * 0.6);
  // Верх лейки поднимается над носиком примерно на 55 единиц рисунка.
  tip.y = Math.max(55 * k + 6, Math.min(geo.root.y - drop, geo.root.y - 70));
  return { k, tip, left: tip.x - TIP.x * k, top: tip.y - TIP.y * k, width: VB.width * k, height: VB.height * k };
}

function buildScene(geo, progress, rich, calm) {
  const total = calm ? CALM_MS : WATERING_MS;
  const place = layout(geo);
  const splashSpot = { left: geo.root.x - 32, top: geo.root.y + 3 * geo.scale - 7 };

  const can = calm
    ? { opacity: at(progress, track(total, [[0, 300, 0, 0.92], [800, 1150, 0.92, 0]])) }
    : {
      opacity: at(progress, track(total, [[0, IN_MS, 0, 1, easeOut], [OUT_AT, OUT_AT + OUT_MS, 1, 0, easeIn]])),
      transform: [
        { translateX: at(progress, track(total, [[0, IN_MS, 26, 0, easeOut], [OUT_AT, OUT_AT + OUT_MS, 0, 24, easeIn]])) },
        { translateY: at(progress, track(total, [[0, IN_MS, -12, 0, easeOut], [OUT_AT, OUT_AT + OUT_MS, 0, -10, easeIn]])) },
        { rotate: at(progress, track(total, [
          [TILT_AT, TILT_AT + TILT_MS, 0, -TILT, easeInOut],
          [TILT_BACK_AT, TILT_BACK_AT + TILT_BACK_MS, -TILT, 0, easeInOut],
        ]), 'deg') },
      ],
      transformOrigin: PIVOT,
    };

  const splash = calm
    ? {
      opacity: at(progress, track(total, [[200, 500, 0, 0.3], [500, 1100, 0.3, 0]])),
      transform: [{ scale: at(progress, track(total, [[200, 1100, 0.6, 1.1, easeOut]])) }],
    }
    : {
      opacity: at(progress, track(total, [[BREATH_AT, BREATH_AT + 160, 0, 0.5], [BREATH_AT + 160, WATERING_MS, 0.5, 0]])),
      transform: [{ scale: at(progress, track(total, [[BREATH_AT, WATERING_MS, 0.4, 1.25, easeOut]])) }],
    };

  // Капли строятся по золотому сечению, а не случайно: сцена получается
  // одинаковой от раза к разу, а узлы — статичными.
  const landSpread = clamp(geo.crown.width * 0.1, 8, 24);
  const drops = calm ? [] : Array.from({ length: MAX_DROPS }, (_, i) => {
    const d = dropDelay(i);
    const spread = ((i * 0.618034) % 1) * 2 - 1;
    const jitter = (i * 0.754878) % 1;
    const dx = geo.root.x + spread * landSpread - place.tip.x;
    const dy = geo.root.y + jitter * 5 - place.tip.y;
    const sign = dx < 0 ? 1 : -1;
    // Заострённый конец капли смотрит назад по полёту: у носика — почти
    // вдоль струи, у земли — почти вертикально.
    const end = Math.round((Math.atan(Math.abs(dx) / (2 * dy)) * 180) / Math.PI);
    const peak = 0.65 + 0.3 * (jitter);
    const fade = at(progress, track(total, [
      [d, d + 50, 0, peak],
      [d + 50, d + DROP_MS * 0.8, peak, peak],
      [d + DROP_MS * 0.8, d + DROP_MS, peak, 0],
    ]));
    return {
      left: place.tip.x - DROP.width / 2,
      top: place.tip.y - DROP.height / 2,
      style: {
        opacity: i < BASE_DROPS ? fade : Animated.multiply(fade, rich),
        transform: [
          { translateX: at(progress, track(total, [[d, d + DROP_MS, 0, dx]])) },
          { translateY: at(progress, track(total, [[d, d + DROP_MS, 0, dy, easeIn]])) },
          { rotate: at(progress, track(total, [[d, d + DROP_MS, sign * 70, sign * end, easeOut]]), 'deg') },
        ],
      },
    };
  });

  return { place, can, splash, splashSpot, drops };
}

// Контуры лейки — одни и те же для подложки и для заливки.
const CAN_PARTS = [
  { d: 'M91 38Q116 38 114 58Q112 76 89 74L89 68Q104 69 105 58Q106 46 91 45Z', o: 0.6 }, // ручка
  { d: 'M41.5 60.5L14 38.5L10 43.5L41.9 72Z', o: 0.78 }, // носик
  { d: 'M16.7 38.5L13.6 32.1L3.4 44.3L10.3 46.1Z', o: 0.95 }, // ситечко
  { d: 'M40 31Q57 35.6 74 34.2V80H47Q42 80 42 75Z', o: 0.88 }, // корпус, светлая половина
  { d: 'M74 34.2Q83 33.4 92 31L90 75Q90 80 85 80H74Z', o: 0.62 }, // корпус в тени
];
// Лейка неизбежно ложится на крону: дерево занимает всю область, а свободного
// места над ним нет. Одного цвета с листвой она сливалась и читалась кружкой,
// поэтому под рисунком — тёмная обводка, как контур у значка: так лейка
// отделяется от кроны в любой цветовой схеме.
const OUTLINE = 'rgba(6,12,18,0.62)';

const CanArt = memo(function CanArt({ color }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB.width} ${VB.height}`}>
      {CAN_PARTS.map((part, i) => (
        <Path key={`o${i}`} d={part.d} fill={OUTLINE} stroke={OUTLINE} strokeWidth={6} strokeLinejoin="round" />
      ))}
      <Ellipse cx={66} cy={30} rx={27} ry={5.5} fill={OUTLINE} stroke={OUTLINE} strokeWidth={5} />
      {CAN_PARTS.map((part, i) => (
        <Path key={`f${i}`} d={part.d} fill={color} fillOpacity={part.o} />
      ))}
      {/* Горловина */}
      <Ellipse cx={66} cy={30} rx={26} ry={4.5} fill={color} fillOpacity={0.3}
        stroke={color} strokeOpacity={0.95} strokeWidth={1.6} />
    </Svg>
  );
});

const DropArt = memo(function DropArt({ color }) {
  return (
    <Svg width={DROP.width} height={DROP.height} viewBox="-1 -1 9 13">
      {/* Та же тёмная кромка, что у лейки: на светлой кроне капли иначе пропадают. */}
      <Path d="M3.5 0C5 3 7 5.2 7 7.4C7 9.4 5.4 11 3.5 11C1.6 11 0 9.4 0 7.4C0 5.2 2 3 3.5 0Z" fill={color}
        stroke={OUTLINE} strokeWidth={1.2} />
    </Svg>
  );
});

// water — { rich } с новым объектом на каждый круг (rich — полный круг 99: на
// четыре капли больше); progress — Animated.Value, которым владеет экран: от
// него же дерево «вздыхает». Если полив идёт, новый круг его не перезапускает.
export default memo(function WateringCan({ geo, water, progress, reduceMotion }) {
  const { accent } = useAppearance();
  const rich = useRef(new Animated.Value(0)).current;
  // Полив, который уже был на момент монтирования, не проигрываем заново.
  const handled = useRef(water);
  const running = useRef(false);
  const animation = useRef(null);
  const scene = useMemo(() => buildScene(geo, progress, rich, reduceMotion), [geo, progress, rich, reduceMotion]);

  useEffect(() => {
    if (!water || water === handled.current) return;
    handled.current = water;
    if (running.current) return;
    running.current = true;
    rich.setValue(water.rich ? 1 : 0);
    progress.setValue(0);
    animation.current = Animated.timing(progress, {
      toValue: 1, duration: reduceMotion ? CALM_MS : WATERING_MS, easing: Easing.linear, useNativeDriver: true,
    });
    animation.current.start(() => { running.current = false; });
  }, [water, progress, rich, reduceMotion]);

  useEffect(() => () => { animation.current?.stop(); }, []);

  const { place, can, splash, splashSpot, drops } = scene;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View pointerEvents="none" style={[styles.splash, splashSpot, splash]}>
        <Svg width="100%" height="100%" viewBox="0 0 64 14">
          <Ellipse cx={32} cy={7} rx={28} ry={5} fill={accent} fillOpacity={0.16}
            stroke={accent} strokeOpacity={0.9} strokeWidth={1.4} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none"
        style={[styles.can, { left: place.left, top: place.top, width: place.width, height: place.height }, can]}>
        <CanArt color={accent} />
      </Animated.View>
      {drops.map((drop, i) => (
        <Animated.View key={i} pointerEvents="none" style={[styles.drop, { left: drop.left, top: drop.top }, drop.style]}>
          <DropArt color={accent} />
        </Animated.View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  can: { position: 'absolute', opacity: 0 },
  drop: { position: 'absolute', width: DROP.width, height: DROP.height, opacity: 0 },
  splash: { position: 'absolute', width: 64, height: 14, opacity: 0 },
});
