import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppearance } from '../utils/AppearanceContext';

// Разлёт листьев из точки нажатия на каждое нажатие.
//
// Листья летят во все стороны (кроме прямо вниз) со случайной силой,
// вращением, размером и длительностью, и формы у них разные — каждый
// всплеск выглядит по-своему. Прежде листья вылетали из центра кроны ровным
// веером, и всплески казались одинаковыми.
//
// Нажатий сотни, поэтому всё готовится один раз: четыре «слота» всплеска по
// семь частиц, у каждой частицы свои Animated.Value и производные узлы. На нажатие
// в свободном слоте лишь меняются числа (setValue) и запускается один
// нативный таймер прогресса — ни узлов, ни разметки заново не создаётся.
// Движение целиком на нативном драйвере: translate, rotate, scale и opacity.
//
// Траектория частицы выводится из прогресса слота p (0..1):
//   x = p * dx;  y = p * ay + p² * by  (ay < 0 — взлёт, by — «тяжесть»);
//   угол = p * rot;  прозрачность = кривая слота * alpha частицы.
// dx, ay, by, rot, alpha и size — Animated.Value, которые меняются между
// запусками; формулы же построены раз и навсегда.

const SLOTS = 5;
const PER_SLOT = 7;
// Всплеск длится 0.75–1.1 с; пять слотов по 200 мс покрывают секунду, так
// что даже при очень быстром счёте переиспользуется слот, листья которого
// уже почти погасли.
const MIN_GAP_MS = 200;
const SHOWER_DELAY_MS = 1050;
const LEAF = 16;

const SQUARE_IN = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const SQUARE_OUT = SQUARE_IN.map(v => v * v);

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rad = deg => (deg * Math.PI) / 180;
// Точка вылета без касания: центр кроны, у зерна — чуть выше земли.
const crownPoint = geo => (geo.seed ? { x: geo.root.x, y: geo.root.y - 10 } : { x: geo.crown.x, y: geo.crown.y });

function makeSlot() {
  const p = new Animated.Value(0);
  const p2 = p.interpolate({ inputRange: SQUARE_IN, outputRange: SQUARE_OUT });
  const fade = p.interpolate({ inputRange: [0, 0.07, 0.5, 1], outputRange: [0, 1, 0.85, 0] });
  const ox = new Animated.Value(0);
  const oy = new Animated.Value(0);
  const particles = Array.from({ length: PER_SLOT }, () => {
    const dx = new Animated.Value(0);
    const ay = new Animated.Value(0);
    const by = new Animated.Value(0);
    const rot = new Animated.Value(0);
    const alpha = new Animated.Value(0);
    const size = new Animated.Value(1);
    return {
      dx, ay, by, rot, alpha, size,
      shape: LEAF_SHAPES[Math.floor(Math.random() * LEAF_SHAPES.length)],
      style: {
        opacity: Animated.multiply(fade, alpha),
        transform: [
          { translateX: Animated.multiply(p, dx) },
          { translateY: Animated.add(Animated.multiply(p, ay), Animated.multiply(p2, by)) },
          { rotate: Animated.multiply(p, rot).interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] }) },
          { scale: size },
        ],
      },
    };
  });
  return {
    p, ox, oy, particles,
    style: { transform: [{ translateX: ox }, { translateY: oy }] },
    token: 0, busy: false, startedAt: 0, used: 0,
  };
}

const makePool = () => Array.from({ length: SLOTS }, makeSlot);

// Свободный слот; если свободных нет — самый старый (он уже почти погас).
function acquire(pool) {
  const free = pool.find(slot => !slot.busy);
  if (free) return free;
  return pool.reduce((a, b) => (a.startedAt <= b.startedAt ? a : b));
}

// Бросает частицы слота из точки origin (место нажатия или центр кроны).
// shower — залп на завершение всей последовательности: все листья и дальше.
function launch(slot, geo, origin, reduce, shower) {
  // Размах разлёта растёт с областью дерева, но в разумных пределах.
  const reach = clamp(geo.width / 340, 0.8, 1.25);

  let count;
  let duration;
  if (reduce) { count = 2; duration = 800; }
  else if (shower) { count = PER_SLOT; duration = rand(950, 1150); }
  else { count = 4 + Math.floor(Math.random() * (PER_SLOT - 3)); duration = rand(750, 1100); }

  slot.token += 1;
  const token = slot.token;
  slot.p.stopAnimation();
  slot.p.setValue(0);

  for (let i = 0; i < PER_SLOT; i += 1) {
    const part = slot.particles[i];
    if (i >= count) {
      if (i < slot.used) part.alpha.setValue(0);
      continue;
    }
    let dx; let ay; let by; let rot; let alpha; let size;
    if (reduce) {
      // Спокойно: лист просто соскальзывает вниз, без вращения.
      dx = rand(-14, 14); ay = 0; by = rand(20, 30); rot = 0; alpha = 0.6; size = 1;
    } else {
      // Направление — любое, кроме почти отвесно вниз: 0° — вверх, ±90° — в стороны.
      const angle = rad(rand(-160, 160));
      const dist = rand(30, shower ? 110 : 90) * reach;
      dx = Math.sin(angle) * dist;
      // y(p) = ay·p + by·p²: начальный толчок по направлению и «тяжесть» листа,
      // которая к концу уносит его вниз.
      ay = -Math.cos(angle) * dist * 1.35;
      // У верхнего края области листья не взлетают высоко: иначе они
      // ложились бы поверх счётчика над деревом.
      if (ay < 0) ay *= clamp(origin.y / 110, 0.25, 1);
      by = rand(55, 125) * reach;
      rot = (Math.random() < 0.5 ? -1 : 1) * rand(120, 620);
      alpha = rand(0.65, 1); size = rand(0.6, 1.3);
    }
    part.dx.setValue(dx);
    part.ay.setValue(ay);
    part.by.setValue(by);
    part.rot.setValue(rot);
    part.alpha.setValue(alpha);
    part.size.setValue(size);
  }
  slot.used = count;
  slot.ox.setValue(origin.x);
  slot.oy.setValue(origin.y);

  slot.busy = true;
  slot.startedAt = Date.now();
  Animated.timing(slot.p, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    .start(() => { if (slot.token === token) slot.busy = false; });
}

// Три формы листа — узкий (олива), круглый (гранат) и обычный; у каждой две
// половинки разной плотности, как объём у силуэтов деревьев.
const LEAF_SHAPES = [
  { left: 'M8 1C5 4 4.6 10 8 15Z', right: 'M8 1C11 4 11.4 10 8 15Z' },
  { left: 'M8 2C2.5 3.5 1.8 11 8 14Z', right: 'M8 2C13.5 3.5 14.2 11 8 14Z' },
  { left: 'M8 1C3.6 3.6 2.8 9 8 15Z', right: 'M8 1C12.4 3.6 13.2 9 8 15Z' },
];

const Particle = memo(function Particle({ part, color }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.particle, part.style]}>
      <Svg width={LEAF} height={LEAF} viewBox="0 0 16 16">
        <Path d={part.shape.left} fill={color} fillOpacity={1} />
        <Path d={part.shape.right} fill={color} fillOpacity={0.62} />
      </Svg>
    </Animated.View>
  );
});

// Слот целиком сдвигается в точку вылета (ox, oy), частицы летят от неё.
const Slot = memo(function Slot({ slot, color }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.origin, slot.style]}>
      {slot.particles.map((part, i) => <Particle key={i} part={part} color={color} />)}
    </Animated.View>
  );
});

// burst — { event, x, y } с новым объектом на каждое нажатие (event: 'tap' |
// 'circle' | 'complete'; x, y — место касания в области дерева, может не быть);
// geo — treeGeometry() области дерева. Слой не принимает касаний и не меняет
// вёрстку.
export default memo(function LeafBurst({ geo, burst, reduceMotion }) {
  const { accent } = useAppearance();
  const [pool] = useState(makePool);
  // Событие, которое уже было на момент монтирования, не проигрываем заново.
  const handled = useRef(burst);
  const lastFire = useRef(0);
  const timers = useRef(new Set());

  useEffect(() => {
    if (!burst || burst === handled.current) return;
    handled.current = burst;
    const now = Date.now();
    if (now - lastFire.current >= MIN_GAP_MS) {
      lastFire.current = now;
      // Место касания (координаты в области дерева). Без него — например, при
      // двойном касании VoiceOver — листья слетают с кроны.
      const tapped = Number.isFinite(burst.x) && Number.isFinite(burst.y);
      const origin = tapped
        ? { x: clamp(burst.x, 0, geo.width), y: clamp(burst.y, 0, geo.height) }
        : crownPoint(geo);
      launch(acquire(pool), geo, origin, reduceMotion, false);
    }
    // Полная последовательность: пока лейка поит дерево, с него слетает
    // ещё и залп листьев — два всплеска вдогонку друг другу.
    if (burst.event === 'complete' && !reduceMotion) {
      [0, 170].forEach(extra => {
        const id = setTimeout(() => {
          timers.current.delete(id);
          launch(acquire(pool), geo, crownPoint(geo), false, true);
        }, SHOWER_DELAY_MS + extra);
        timers.current.add(id);
      });
    }
  }, [burst, geo, pool, reduceMotion]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
      pool.forEach(slot => { slot.token += 1; slot.p.stopAnimation(); });
    };
  }, [pool]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pool.map((slot, i) => <Slot key={i} slot={slot} color={accent} />)}
    </View>
  );
});

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  particle: { position: 'absolute', left: -LEAF / 2, top: -LEAF / 2, width: LEAF, height: LEAF },
});
