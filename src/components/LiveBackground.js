import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinear, RadialGradient, Stop, Path, Circle } from 'react-native-svg';

// Живые абстрактные фоны в духе меню игровых приставок: световые ленты,
// плавающие пылинки, медленные пятна света. Всё рисуется в цветах схемы,
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

// ---- Пылинки ----

function Mote({ tint, x, y, size, rise, sway, duration, start, peak, still }) {
  const p = useCycle(duration, start, still);
  const { translateX, translateY, opacity } = useMemo(() => ({
    translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }),
    translateX: p.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, sway, 0, -sway, 0] }),
    // Появляется, светит и гаснет за один подъём — без резких вспышек на петле.
    opacity: still ? peak * 0.7 : p.interpolate({ inputRange: [0, 0.15, 0.5, 0.85, 1], outputRange: [0, peak, peak * 0.75, peak, 0] }),
  }), [p, rise, sway, peak, still]);
  return (
    <Animated.View pointerEvents="none"
      style={[styles.mote, {
        left: x, top: y, width: size, height: size, borderRadius: size / 2,
        backgroundColor: `rgb(${tint})`, shadowColor: `rgb(${tint})`, shadowRadius: size * 1.6,
        opacity, transform: [{ translateX }, { translateY }],
      }]} />
  );
}

// Параметры пылинок считаются один раз на набор: те же места и пути при
// каждой перерисовке.
function Motes({ seed, count, tint, still, from = 0.25, to = 1 }) {
  const specs = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({
      size: 1.5 + r() * 3.5, x: r() * SW, y: SH * (from + r() * (to - from)),
      rise: SH * (0.25 + r() * 0.45), sway: 6 + r() * 18,
      duration: 14000 + r() * 22000, start: r(), peak: 0.35 + r() * 0.5,
    }));
  }, [seed, count, from, to]);
  return specs.map((m, i) => <Mote key={i} tint={tint} still={still} {...m} />);
}

export const LIVE_VARIANTS = ['waves', 'dust', 'glow'];

function LiveBackground({ variant, scheme, still = false }) {
  const tint = scheme.tint;
  const accent = scheme.accent;
  if (variant === 'waves') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Glow id="w0" color={accent} size={SW * 1.6} x={SW * 0.85} y={SH * 0.12} alpha={0.16} drift={20} duration={26000} start={0.1} still={still} />
        <Ribbon id="0" tint={tint} accent={accent} y={SH * 0.60} amp={46} thick={70} phase={0} wobble={0.4} duration={34000} start={0.0} alpha={0.10} still={still} />
        <Ribbon id="1" tint={tint} accent={accent} y={SH * 0.66} amp={60} thick={46} phase={1.3} wobble={2.1} duration={24000} start={0.4} alpha={0.12} still={still} />
        <Ribbon id="2" tint={tint} accent={accent} y={SH * 0.72} amp={38} thick={90} phase={2.6} wobble={1.2} duration={44000} start={0.7} alpha={0.08} still={still} />
        <Ribbon id="3" tint={tint} accent={accent} y={SH * 0.55} amp={30} thick={26} phase={4.0} wobble={3.0} duration={19000} start={0.2} alpha={0.10} still={still} />
        <Motes seed={11} count={14} tint={tint} still={still} from={0.45} to={0.95} />
      </View>
    );
  }
  if (variant === 'glow') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Glow id="g0" color={accent} size={SW * 1.5} x={SW * 0.15} y={SH * 0.28} alpha={0.32} drift={40} duration={30000} start={0.0} still={still} />
        <Glow id="g1" color={`rgb(${tint})`} size={SW * 1.3} x={SW * 0.9} y={SH * 0.55} alpha={0.26} drift={50} duration={38000} start={0.45} still={still} />
        <Glow id="g2" color={accent} size={SW * 1.1} x={SW * 0.4} y={SH * 0.9} alpha={0.28} drift={35} duration={26000} start={0.75} still={still} />
        <Motes seed={23} count={18} tint={tint} still={still} />
      </View>
    );
  }
  // dust — пылинки в луче мягкого света.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Glow id="d0" color={`rgb(${tint})`} size={SW * 1.7} x={SW * 0.7} y={SH * 0.05} alpha={0.22} drift={18} duration={32000} start={0.2} still={still} />
      <Glow id="d1" color={accent} size={SW * 1.2} x={SW * 0.1} y={SH * 0.75} alpha={0.16} drift={24} duration={28000} start={0.6} still={still} />
      <Motes seed={7} count={24} tint={tint} still={still} from={0.1} to={1} />
    </View>
  );
}

// Перерисовка экрана под фоном (часы, прокрутка) фон не трогает.
export default memo(LiveBackground);

const styles = StyleSheet.create({
  mote: { position: 'absolute', shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 } },
});
