import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinear, RadialGradient, Stop, Path, Circle } from 'react-native-svg';

// Живые абстрактные фоны: световые ленты, вращающиеся орбиты, рябь на воде. Всё рисуется в цветах схемы,
// поэтому одна тема работает с любой палитрой, включая свой цвет.
//
// Движение — только transform и opacity на нативном драйвере: JS-поток
// не трогается, и фон не мешает счётчику тасбиха и прокрутке.

const { width: SW, height: SH } = Dimensions.get('window');
const native = { useNativeDriver: true, isInteraction: false };

// Детерминированный генератор: пылинки стоят на одних и тех же местах
// при каждом открытии, а не прыгают от перерисовки к перерисовке.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Бесконечный ход 0→1 со случайной стартовой фазой. Первый отрезок идёт
// от фазы до конца, дальше обычная петля: так частицы и ленты не стартуют
// одновременно, а Animated.loop не сбрасывает их всех к нулю разом.
function useCycle(duration, phase, still) {
  const v = useRef(new Animated.Value(phase)).current;
  useEffect(() => {
    if (still) { v.setValue(phase); return undefined; }
    let loop = null;
    let alive = true;
    v.setValue(phase);
    const first = Animated.timing(v, { toValue: 1, duration: duration * (1 - phase), easing: Easing.linear, ...native });
    first.start(({ finished }) => {
      if (!finished || !alive) return;
      v.setValue(0);
      loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, ...native }));
      loop.start();
    });
    return () => { alive = false; first.stop(); loop?.stop(); };
  }, [duration, phase, still, v]);
  return v;
}

// ---- Световые ленты (как волны PS4) ----

// Лента — полоса между двумя синусоидами. Период равен ширине экрана, сама
// картинка вдвое шире: сдвиг на ширину возвращает ту же форму, и петля
// получается без шва.
function ribbonPath(w, h, amp, thick, phase, wobble) {
  const steps = 48;
  const top = [];
  const bottom = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w * 2;
    const a = (x / w) * Math.PI * 2 + phase;
    const yTop = h / 2 + amp * Math.sin(a);
    const th = thick * (0.55 + 0.45 * Math.sin(a * 2 + wobble));
    top.push([x, yTop - th / 2]);
    bottom.push([x, yTop + th / 2]);
  }
  const line = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const back = bottom.reverse().map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return { fill: `${line(top)} ${back} Z`, edge: line(top) };
}

function Ribbon({ tint, accent, y, amp, thick, phase, wobble, duration, start, alpha, still, id }) {
  const h = amp * 2 + thick * 2;
  const shape = useMemo(() => ribbonPath(SW, h, amp, thick, phase, wobble), [h, amp, thick, phase, wobble]);
  const p = useCycle(duration, start, still);
  const bob = useCycle(duration * 0.7, (start + 0.37) % 1, still);
  // Узлы интерполяции строятся один раз: при перерисовке родителя (часы на
  // главном экране тикают каждую секунду) они не пересоздаются.
  const translateX = useMemo(() => p.interpolate({ inputRange: [0, 1], outputRange: [0, -SW] }), [p]);
  const translateY = useMemo(() => bob.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -8, 0, 8, 0] }), [bob]);
  return (
    <Animated.View pointerEvents="none"
      style={{ position: 'absolute', top: y - h / 2, left: 0, width: SW * 2, height: h, transform: [{ translateX }, { translateY }] }}>
      <Svg width={SW * 2} height={h}>
        <Defs>
          <SvgLinear id={`rb${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={`rgb(${tint})`} stopOpacity={alpha * 1.6} />
            <Stop offset="0.5" stopColor={accent} stopOpacity={alpha * 0.6} />
            <Stop offset="1" stopColor={`rgb(${tint})`} stopOpacity={0} />
          </SvgLinear>
        </Defs>
        <Path d={shape.fill} fill={`url(#rb${id})`} />
        <Path d={shape.edge} stroke={`rgb(${tint})`} strokeOpacity={alpha * 2.4} strokeWidth={1.2} fill="none" />
      </Svg>
    </Animated.View>
  );
}

// ---- Пятна света ----

function Glow({ color, size, x, y, alpha, drift, duration, start, still, id }) {
  const p = useCycle(duration, start, still);
  const { translateX, translateY, scale } = useMemo(() => ({
    translateX: p.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, drift, 0, -drift, 0] }),
    translateY: p.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -drift * 0.6, 0, drift * 0.6, 0] }),
    scale: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] }),
  }), [p, drift]);
  return (
    <Animated.View pointerEvents="none"
      style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size,
        transform: [{ translateX }, { translateY }, { scale }] }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`gl${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={alpha} />
            <Stop offset="0.45" stopColor={color} stopOpacity={alpha * 0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#gl${id})`} />
      </Svg>
    </Animated.View>
  );
}

// ---- Орбиты ----
// Тонкие кольца вокруг одного центра, как у астролябии: пунктирные и
// сплошные, каждое медленно вращается в свою сторону, по некоторым плывут
// светящиеся точки. Вращается весь слой кольца — нативный rotate.

function Orbit({ cx, cy, r, dash, width, alpha, dots, duration, dir, start, tint, accent, still }) {
  const p = useCycle(duration, start, still);
  const rotate = useMemo(() => p.interpolate({
    inputRange: [0, 1], outputRange: dir > 0 ? ['0deg', '360deg'] : ['360deg', '0deg'],
  }), [p, dir]);
  // Кольцо — рамка View, а не Svg: система рисует её сама, без растра во весь
  // круг. Svg на кольцо в 900 pt держал десятки мегабайт видеопамяти.
  const size = r * 2;
  return (
    <Animated.View pointerEvents="none"
      style={{ position: 'absolute', left: cx - r, top: cy - r, width: size, height: size, transform: [{ rotate }] }}>
      <View style={{
        ...StyleSheet.absoluteFillObject, borderRadius: r, borderWidth: width,
        borderStyle: dash, borderColor: `rgba(${tint},${alpha})`,
      }} />
      {dots.map((a, i) => {
        const d = i === 0 ? 6 : 4;
        return (
          <View key={i} style={{
            position: 'absolute', width: d, height: d, borderRadius: d / 2,
            left: r + r * Math.cos(a) - d / 2, top: r + r * Math.sin(a) - d / 2,
            backgroundColor: i === 0 ? accent : `rgb(${tint})`, opacity: 0.9,
          }} />
        );
      })}
    </Animated.View>
  );
}

// dash — стиль рамки: пунктир и точки вращаются вместе с кольцом.
const ORBITS = [
  { r: 70,  dash: 'solid',  width: 1,   alpha: 0.22, dots: [0.8],       duration: 50000,  dir: 1 },
  { r: 118, dash: 'dotted', width: 1.5, alpha: 0.30, dots: [],          duration: 90000,  dir: -1 },
  { r: 168, dash: 'solid',  width: 1,   alpha: 0.16, dots: [2.4, 5.2],  duration: 120000, dir: 1 },
  { r: 226, dash: 'dashed', width: 1,   alpha: 0.18, dots: [],          duration: 160000, dir: -1 },
  { r: 290, dash: 'solid',  width: 1,   alpha: 0.12, dots: [4.1],       duration: 210000, dir: 1 },
  // Пунктир на большом кольце рисуется растром во весь круг — дорого; здесь
  // сплошная линия с точками.
  { r: 362, dash: 'solid',  width: 1,   alpha: 0.14, dots: [0.4, 2.0, 3.6, 5.2], duration: 260000, dir: -1 },
  { r: 440, dash: 'solid',  width: 1,   alpha: 0.09, dots: [1.3, 3.9],  duration: 320000, dir: 1 },
];

// ---- Рябь ----
// Как капли на тихой воде: из точки расходятся три кольца подряд и тают.
// Каждое кольцо — круг с тонкой рамкой, который растёт и гаснет.

function RippleRing({ x, y, size, tint, duration, start, still }) {
  const p = useCycle(duration, start, still);
  const style = useMemo(() => ({
    opacity: still ? 0.2 : p.interpolate({ inputRange: [0, 0.08, 0.55, 1], outputRange: [0, 0.6, 0.26, 0] }),
    transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.06, 1] }) }],
  }), [p, still]);
  return (
    <Animated.View pointerEvents="none" style={[styles.ripple, {
      left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2,
      borderColor: `rgb(${tint})`,
    }, style]} />
  );
}

function Ripples({ seed, count, tint, still }) {
  const drops = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({
      x: SW * (0.08 + r() * 0.84), y: SH * (0.22 + r() * 0.72),
      size: 150 + r() * 170, duration: 9000 + r() * 7000, start: r(),
    }));
  }, [seed, count]);
  // Три кольца на каплю с отставанием по фазе — волна за волной.
  return drops.flatMap((d, i) => [0, 0.16, 0.32].map((lag, k) => (
    <RippleRing key={`${i}-${k}`} x={d.x} y={d.y} size={d.size * (1 - k * 0.12)} tint={tint}
      duration={d.duration} start={(d.start + lag) % 1} still={still} />
  )));
}

export const LIVE_VARIANTS = ['waves', 'orbits', 'ripples'];

function LiveBackground({ variant, scheme, still = false }) {
  const tint = scheme.tint;
  const accent = scheme.accent;
  if (variant === 'orbits') {
    // Центр — ниже середины, под расписанием: кольцо отсчёта сверху не
    // спорит с кольцами фона.
    const cx = SW * 0.5;
    const cy = SH * 0.78;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Glow id="o0" color={accent} size={SW * 1.3} x={cx} y={cy} alpha={0.2} drift={10} duration={30000} start={0.2} still={still} />
        {ORBITS.map((o, i) => (
          <Orbit key={i} cx={cx} cy={cy} tint={tint} accent={accent} still={still}
            start={(i * 0.137) % 1} {...o} />
        ))}
      </View>
    );
  }
  if (variant === 'ripples') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Glow id="r0" color={accent} size={SW * 1.5} x={SW * 0.3} y={SH * 0.85} alpha={0.14} drift={20} duration={34000} start={0.5} still={still} />
        <Ripples seed={31} count={6} tint={tint} still={still} />
      </View>
    );
  }
  // waves — только световые ленты и мягкое пятно света сверху.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Glow id="w0" color={accent} size={SW * 1.6} x={SW * 0.85} y={SH * 0.12} alpha={0.16} drift={20} duration={26000} start={0.1} still={still} />
      <Ribbon id="0" tint={tint} accent={accent} y={SH * 0.60} amp={46} thick={70} phase={0} wobble={0.4} duration={34000} start={0.0} alpha={0.10} still={still} />
      <Ribbon id="1" tint={tint} accent={accent} y={SH * 0.66} amp={60} thick={46} phase={1.3} wobble={2.1} duration={24000} start={0.4} alpha={0.12} still={still} />
      <Ribbon id="2" tint={tint} accent={accent} y={SH * 0.72} amp={38} thick={90} phase={2.6} wobble={1.2} duration={44000} start={0.7} alpha={0.08} still={still} />
      <Ribbon id="3" tint={tint} accent={accent} y={SH * 0.55} amp={30} thick={26} phase={4.0} wobble={3.0} duration={19000} start={0.2} alpha={0.10} still={still} />
    </View>
  );
}

// Перерисовка экрана под фоном (часы, прокрутка) фон не трогает.
export default memo(LiveBackground);

const styles = StyleSheet.create({
  ripple: { position: 'absolute', borderWidth: 2 },
});
