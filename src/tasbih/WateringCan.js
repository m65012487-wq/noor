import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// Полив на завершённый круг: справа у ствола появляется лейка, наклоняется,
// из ситечка на землю у корня падают капли, дерево вздыхает, лейка уходит.
//
// Лейка медная — тёплым янтарём наград (COLORS.ember), а не цветом схемы:
// дерево нарисовано цветом схемы, и лейка того же цвета сливалась с кроной.
// Стоит она внизу справа от ствола и поливает землю у корня, как настоящая:
// там нет кроны, и ничего не перекрывается.
//
// Вся сцена — одна нативная анимация прогресса `progress` (0..1 за
// WATERING_MS), а каждое движение выводится из неё по ключевым кадрам
// (track): лейка, капли, всплеск у земли и «вздох» дерева (wateringBreath).
// Один таймер и ни одного JS-тика в процессе, поэтому всё идёт в такт и не
// зависит от загруженности JS-потока. Только opacity и transform.

export const WATERING_MS = 1800;
const CALM_MS = 1200; // reduceMotion: лейка без наклона и капель

// Холст рисунка лейки: носик смотрит влево, ситечко на его конце.
const VB = { width: 150, height: 110 };
// Ось наклона — середина корпуса; ситечко — центр розетки (оба в единицах холста).
// Ось лежит ровно на целых процентах холста (66% и 68%): строку transformOrigin
// RN разбирает регэкспом \d+(?:%|px), и дробь «68.18%» читалась бы как «18%»
// — лейка поворачивалась бы вокруг другой точки, носик уезжал от струи.
const PIVOT = { x: 99, y: 74.8 };
const ROSE = { x: 10, y: 41.5 };
const TILT = -32; // градусы; отрицательный поворот опускает носик

const rad = deg => (deg * Math.PI) / 180;
// Поворот точки холста вокруг оси наклона так же, как это делает RN: на
// экране y растёт вниз, положительный угол — по часовой стрелке.
function turn(pt, deg) {
  const a = rad(deg);
  const x = pt.x - PIVOT.x;
  const y = pt.y - PIVOT.y;
  return { x: PIVOT.x + x * Math.cos(a) - y * Math.sin(a), y: PIVOT.y + x * Math.sin(a) + y * Math.cos(a) };
}
const TIP = turn(ROSE, TILT);
// Габариты наклонённой лейки: по ним раскладка проверяет, что она влезла.
const TILTED = [{ x: 0, y: 0 }, { x: VB.width, y: 0 }, { x: VB.width, y: VB.height }, { x: 0, y: VB.height }]
  .map(pt => turn(pt, TILT))
  .reduce((b, pt) => ({
    minX: Math.min(b.minX, pt.x), maxX: Math.max(b.maxX, pt.x),
    minY: Math.min(b.minY, pt.y), maxY: Math.max(b.maxY, pt.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

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
const DROP = { width: 6, height: 9 };
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

// Где стоит лейка и куда падает вода. Ситечко — справа от ствола чуть выше
// земли; корпус уходит вправо и вверх. Если лейка не влезает в область
// (узкий экран, широкий ствол пальмы), она уменьшается.
function layout(geo) {
  // Полуширина ствола у земли: у взрослых деревьев он заметно толще.
  const trunk = (geo.seed ? 5 : geo.crown.height > geo.height * 0.45 ? 11 : 6) * geo.scale;
  const lift = clamp(geo.height * 0.2, 46, 92);
  const tip = { x: geo.root.x + trunk + 18, y: geo.root.y - lift };
  // Ширина рисунка ~ треть области, но не больше, чем влезает справа и сверху.
  let k = clamp(geo.width * 0.3, 84, 122) / VB.width;
  const fitRight = (geo.width - 4 - tip.x) / (TILTED.maxX - TIP.x);
  const fitTop = (tip.y - 4) / (TIP.y - TILTED.minY);
  k = Math.max(0.42, Math.min(k, fitRight, fitTop));
  return {
    k, tip, trunk,
    left: tip.x - TIP.x * k, top: tip.y - TIP.y * k,
    width: VB.width * k, height: VB.height * k,
  };
}

function buildScene(geo, progress, rich, calm) {
  const total = calm ? CALM_MS : WATERING_MS;
  const place = layout(geo);
  const landX = geo.root.x + place.trunk * 0.6 + 8;
  const splashSpot = { left: landX - 26, top: geo.root.y - 6 };

  const can = calm
    ? { opacity: at(progress, track(total, [[0, 300, 0, 0.92], [800, 1150, 0.92, 0]])) }
    : {
      opacity: at(progress, track(total, [[0, IN_MS, 0, 1, easeOut], [OUT_AT, OUT_AT + OUT_MS, 1, 0, easeIn]])),
      transform: [
        { translateX: at(progress, track(total, [[0, IN_MS, 34, 0, easeOut], [OUT_AT, OUT_AT + OUT_MS, 0, 30, easeIn]])) },
        { translateY: at(progress, track(total, [[0, IN_MS, -6, 0, easeOut], [OUT_AT, OUT_AT + OUT_MS, 0, -4, easeIn]])) },
        { rotate: at(progress, track(total, [
          [TILT_AT, TILT_AT + TILT_MS, 0, TILT, easeInOut],
          [TILT_BACK_AT, TILT_BACK_AT + TILT_BACK_MS, TILT, 0, easeInOut],
        ]), 'deg') },
      ],
      transformOrigin: `${Math.round((PIVOT.x / VB.width) * 100)}% ${Math.round((PIVOT.y / VB.height) * 100)}%`,
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
  const landSpread = clamp(place.trunk, 6, 14);
  const drops = calm ? [] : Array.from({ length: MAX_DROPS }, (_, i) => {
    const d = dropDelay(i);
    const spread = ((i * 0.618034) % 1) * 2 - 1;
    const jitter = (i * 0.754878) % 1;
    const dx = landX + spread * landSpread - place.tip.x;
    const dy = geo.root.y - 2 + jitter * 4 - place.tip.y;
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

// Медная лейка: округлый корпус, дуговая ручка сверху и задняя ручка, длинный
// носик от низа корпуса и раструб-ситечко с дырочками. Под каждой деталью —
// непрозрачная тёмная подложка (COLORS.navyDeep): лейка стоит перед деревом
// и не должна просвечивать. Объём — горизонтальный градиент корпуса (блик
// слева, тень справа), а не обводка.
const EMBER = COLORS.ember;
const SOFT = COLORS.emberSoft;
const DEEP = COLORS.navyDeep;
const PARTS = {
  handle: 'M78 46C76 14 122 10 126 50L119 50C116 22 85 24 85 46Z',
  back: 'M127 58C145 60 145 90 127 92L127 85C137 83 137 66 127 65Z',
  spout: 'M74 79L23 41L18 47L72 95Z',
  rose: 'M25 36L11 29Q4 41 11 54L24 49Z',
  body: 'M71 46Q67 74 71 100Q72 105 78 105L120 105Q126 105 127 100Q131 74 127 46Z',
  shine: 'M78 53Q75 75 78 97L83 97Q80 75 83 53Z',
  band: 'M69.5 63Q99 67 128.5 63L128.8 67.5Q99 71.5 69.3 67.5Z',
};

const CanArt = memo(function CanArt() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB.width} ${VB.height}`}>
      <Defs>
        <LinearGradient id="wcBody" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={SOFT} />
          <Stop offset="0.35" stopColor={EMBER} />
          <Stop offset="1" stopColor={EMBER} stopOpacity={0.62} />
        </LinearGradient>
        <LinearGradient id="wcSpout" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SOFT} />
          <Stop offset="1" stopColor={EMBER} stopOpacity={0.8} />
        </LinearGradient>
      </Defs>
      <Path d={PARTS.handle} fill={DEEP} />
      <Path d={PARTS.handle} fill={EMBER} fillOpacity={0.85} />
      <Path d={PARTS.back} fill={DEEP} />
      <Path d={PARTS.back} fill={EMBER} fillOpacity={0.7} />
      <Path d={PARTS.spout} fill={DEEP} />
      <Path d={PARTS.spout} fill="url(#wcSpout)" />
      <Path d={PARTS.rose} fill={DEEP} />
      <Path d={PARTS.rose} fill={EMBER} />
      <Ellipse cx={10} cy={41.5} rx={3.6} ry={12.5} fill={SOFT} />
      {[35, 40, 45, 49].map(y => <Circle key={y} cx={y === 35 || y === 49 ? 10 : 11} cy={y} r={1} fill={EMBER} />)}
      <Path d={PARTS.body} fill={DEEP} />
      <Path d={PARTS.body} fill="url(#wcBody)" />
      <Path d={PARTS.shine} fill={SOFT} fillOpacity={0.6} />
      <Path d={PARTS.band} fill={SOFT} fillOpacity={0.35} />
      {/* Горловина */}
      <Ellipse cx={99} cy={46} rx={28} ry={6} fill={DEEP} />
      <Ellipse cx={99} cy={46} rx={28} ry={6} fill={EMBER} fillOpacity={0.45} />
      <Ellipse cx={99} cy={46} rx={28} ry={6} fill="none" stroke={SOFT} strokeWidth={2.2} />
    </Svg>
  );
});

// Вода — белая: на тёмном фоне у корня капли видны в любой цветовой схеме.
const DropArt = memo(function DropArt() {
  return (
    <Svg width={DROP.width} height={DROP.height} viewBox="0 0 6 9">
      <Path d="M3 0C4.3 2.4 6 4.3 6 6C6 7.7 4.7 9 3 9C1.3 9 0 7.7 0 6C0 4.3 1.7 2.4 3 0Z"
        fill={COLORS.white} fillOpacity={0.9} />
    </Svg>
  );
});

// water — { rich } с новым объектом на каждый круг (rich — полный круг 99: на
// четыре капли больше); progress — Animated.Value, которым владеет экран: от
// него же дерево «вздыхает». Если полив идёт, новый круг его не перезапускает.
export default memo(function WateringCan({ geo, water, progress, reduceMotion }) {
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
        <Svg width="100%" height="100%" viewBox="0 0 52 12">
          <Ellipse cx={26} cy={6} rx={22} ry={4} fill={COLORS.white} fillOpacity={0.12}
            stroke={COLORS.white} strokeOpacity={0.7} strokeWidth={1.2} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none"
        style={[styles.can, { left: place.left, top: place.top, width: place.width, height: place.height }, can]}>
        <CanArt />
      </Animated.View>
      {drops.map((drop, i) => (
        <Animated.View key={i} pointerEvents="none" style={[styles.drop, { left: drop.left, top: drop.top }, drop.style]}>
          <DropArt />
        </Animated.View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  can: { position: 'absolute', opacity: 0 },
  drop: { position: 'absolute', width: DROP.width, height: DROP.height, opacity: 0 },
  splash: { position: 'absolute', width: 52, height: 12, opacity: 0 },
});
