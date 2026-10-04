import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAppearance } from '../utils/AppearanceContext';

// Разлёт листьев из кроны на каждое нажатие (у зерна — искры земли).
//
// Нажатий сотни, поэтому всё готовится один раз: три «слота» всплеска по семь
// частиц, у каждой частицы свои Animated.Value и производные узлы. На нажатие
// в свободном слоте лишь меняются числа (setValue) и запускается один
// нативный таймер прогресса — ни узлов, ни разметки заново не создаётся.
// Движение целиком на нативном драйвере: translate, rotate, scale и opacity.
//
// Траектория частицы выводится из прогресса слота p (0..1):
//   x = p * dx;  y = p * ay + p² * by  (ay < 0 — взлёт, by — «тяжесть»);
//   угол = p * rot;  прозрачность = кривая слота * alpha частицы.
// dx, ay, by, rot, alpha и size — Animated.Value, которые меняются между
// запусками; формулы же построены раз и навсегда.

const SLOTS = 3;
const PER_SLOT = 7;
// Три слота на ~900 мс: новый всплеск не чаще, чем раз в треть этого времени.
// Иначе при быстром счёте слоты кончаются, и самый старый обрывается на лету.
const MIN_GAP_MS = 330; // 3 слота × 330 мс ≥ самый долгий всплеск (960 мс)
const SHOWER_DELAY_MS = 1050;
const LEAF = 16;

const SQUARE_IN = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const SQUARE_OUT = SQUARE_IN.map(v => v * v);

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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

// Бросает частицы слота из точки, заданной геометрией дерева. shower — залп
// на завершение всей последовательности: все семь листьев и пошире.
function launch(slot, geo, reduce, shower) {
  const { crown, root, width } = geo;
  const earth = geo.seed;
  const maxReach = Math.max(24, width / 2 - 10);
  const half = Math.max(crown.width / 2, 22);
  // От точки вылета до земли: дальше листья не падают.
  const ground = Math.max(root.y - crown.y, 30);

  let count;
  let duration;
  if (reduce) { count = 2; duration = 700; }
  else if (earth) { count = 4 + Math.floor(Math.random() * 2); duration = rand(560, 680); }
  else if (shower) { count = PER_SLOT; duration = rand(900, 1000); }
  else { count = 5 + Math.floor(Math.random() * 3); duration = rand(820, 960); }

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
    // Направления расслоены по числу частиц: так разлёт ровный, а не кучками.
    const side = ((i + Math.random() * 0.8) / count) * 2 - 1;
    let dx; let rise; let fall; let rot; let alpha; let size;
    if (reduce) {
      dx = side * rand(10, 16); rise = 0; fall = 22; rot = 0; alpha = 0.6; size = 1;
    } else if (earth) {
      dx = side * rand(10, 34); rise = rand(18, 34); fall = rand(4, 10);
      rot = 0; alpha = rand(0.5, 1); size = rand(0.45, 0.85);
    } else {
      const reach = Math.min(maxReach, half * (shower ? 1.35 : 1.05) + 14);
      dx = side * reach * rand(0.75, 1.1);
      rise = clamp(crown.height * 0.12, 10, 30) * rand(0.7, 1.3);
      fall = Math.max(30, ground * rand(0.55, shower ? 1 : 0.95));
      rot = (Math.random() < 0.5 ? -1 : 1) * rand(220, 560);
      alpha = rand(0.45, 1); size = rand(0.7, 1.15);
    }
    // y(p) = -a·p + (a + fall)·p²: частица поднимается на rise и к концу
    // оказывается на fall ниже точки вылета. Взлётная скорость a выражена
    // из высоты подъёма: a = 2·rise + 2·√(rise² + rise·fall).
    const launchSpeed = 2 * rise + 2 * Math.sqrt(rise * rise + rise * fall);
    part.dx.setValue(dx);
    part.ay.setValue(-launchSpeed);
    part.by.setValue(launchSpeed + fall);
    part.rot.setValue(rot);
    part.alpha.setValue(alpha);
    part.size.setValue(size);
  }
  slot.used = count;
  // Точка вылета каждый раз чуть другая: листья сходят с разных веток.
  slot.ox.setValue(earth ? rand(-6, 6) : rand(-0.15, 0.15) * crown.width);
  slot.oy.setValue(earth ? 0 : rand(-0.12, 0.12) * crown.height);

  slot.busy = true;
  slot.startedAt = Date.now();
  Animated.timing(slot.p, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    .start(() => { if (slot.token === token) slot.busy = false; });
}

const LEAF_LEFT = 'M8 1C3.6 3.6 2.8 9 8 15Z';
const LEAF_RIGHT = 'M8 1C12.4 3.6 13.2 9 8 15Z';

// Лист — две половинки разной плотности (как объём у силуэтов деревьев),
// искра земли — точка.
const Particle = memo(function Particle({ part, x, y, earth, color }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.particle, { left: x - LEAF / 2, top: y - LEAF / 2 }, part.style]}>
      <Svg width={LEAF} height={LEAF} viewBox="0 0 16 16">
        {earth ? <Circle cx={8} cy={8} r={3.4} fill={color} /> : (
          <>
            <Path d={LEAF_LEFT} fill={color} fillOpacity={1} />
            <Path d={LEAF_RIGHT} fill={color} fillOpacity={0.62} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
});

const Slot = memo(function Slot({ slot, x, y, earth, color }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, slot.style]}>
      {slot.particles.map((part, i) => <Particle key={i} part={part} x={x} y={y} earth={earth} color={color} />)}
    </Animated.View>
  );
});

// burst — { event } с новым объектом на каждое нажатие (event: 'tap' | 'circle' |
// 'complete'); geo — treeGeometry() области дерева. Слой не принимает касаний
// и не меняет вёрстку.
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
      launch(acquire(pool), geo, reduceMotion, false);
    }
    // Полная последовательность: пока лейка поит дерево, с него слетает
    // ещё и залп листьев — два всплеска вдогонку друг другу.
    if (burst.event === 'complete' && !reduceMotion) {
      [0, 170].forEach(extra => {
        const id = setTimeout(() => {
          timers.current.delete(id);
          launch(acquire(pool), geo, false, true);
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

  const earth = geo.seed;
  const x = earth ? geo.root.x : geo.crown.x;
  const y = earth ? geo.root.y - 3 : geo.crown.y;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pool.map((slot, i) => <Slot key={i} slot={slot} x={x} y={y} earth={earth} color={accent} />)}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: { position: 'absolute', width: LEAF, height: LEAF },
});
