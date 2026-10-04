import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useAppearance } from '../utils/AppearanceContext';
import { TREE_BOUNDS, TREE_CANVAS, TREE_SHAPES } from './treeShapes';

// Дерево — плоский силуэт цвета схемы, как сцены на обоях. Раньше это были
// сорок нарисованных кадров: другой стиль, два десятка мегабайт в сборке и
// своя графика под каждую тему. Теперь форма берётся из treeShapes.js
// (генератор scripts/tasbih/trees.js), а цвет — из оформления, поэтому
// дерево само собой совпадает с выбранной темой.

const STAGE_MS = 1200;

// Тень живёт в том же холсте, что и силуэт, и растёт вместе с кроной:
// отдельной тенью в разметке она разъезжалась со стволом на узких экранах.
export const TreeSilhouette = memo(function TreeSilhouette({ species, stage, color, shadow = true, crop = false }) {
  const shapes = TREE_SHAPES[species]?.[stage] || [];
  const r = 18 + stage * 5;
  // crop — для превью размером с ноготь: холст обрезается по самой фигуре,
  // иначе зерно на карточке входа выходит точкой в три пикселя.
  const b = crop ? TREE_BOUNDS[species]?.[stage] : null;
  const box = b ? `${b.x} ${b.y} ${b.width} ${b.height}`
    : `0 0 ${TREE_CANVAS.width} ${TREE_CANVAS.height}`;
  return (
    <Svg width="100%" height="100%" viewBox={box}>
      {shadow && <Ellipse cx={TREE_CANVAS.baseX} cy={TREE_CANVAS.baseY + 3}
        rx={r} ry={r * 0.16} fill={color} fillOpacity={0.18} />}
      {shapes.map((s, i) => (s.t === 'p'
        ? <Path key={i} d={s.d} fill={color} fillOpacity={s.o} />
        : <Ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={color} fillOpacity={s.o} />))}
    </Svg>
  );
});

// Одна стадия одной породы. Смена стадии — перекрёстное проявление: рост
// должен читаться как рост, а не как подмена картинки.
export default memo(function TreeView({ species, stage, pulse, reduceMotion }) {
  const { accent } = useAppearance();
  // В ref лежит пара «порода и стадия»: в «Саду» можно переключиться на
  // другое дерево, и тогда уходить должно прежнее дерево целиком, а не его
  // стадия, надетая на новую породу.
  const previous = useRef({ species, stage });
  const crossfade = useRef(new Animated.Value(1)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const from = previous.current;
  const same = from.species === species && from.stage === stage;

  useEffect(() => {
    if (previous.current.species === species && previous.current.stage === stage) return undefined;
    crossfade.setValue(0);
    const animation = Animated.timing(crossfade, {
      toValue: 1, duration: reduceMotion ? 300 : STAGE_MS, useNativeDriver: true,
    });
    animation.start(({ finished }) => { if (finished) previous.current = { species, stage }; });
    return () => animation.stop();
  }, [species, stage, crossfade, reduceMotion]);

  // Отклик на нажатие: дерево чуть качается. Движение намеренно мелкое —
  // счёт идёт сотнями нажатий, и крупная анимация быстро утомляет.
  useEffect(() => {
    if (reduceMotion || !pulse) { sway.setValue(0); return undefined; }
    const animation = Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.spring(sway, { toValue: 0, damping: 14, stiffness: 240, mass: 0.4, useNativeDriver: true }),
    ]);
    sway.stopAnimation(); sway.setValue(0); animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion, sway]);

  const direction = pulse % 2 ? 1 : -1;
  const variant = pulse % 4;
  return (
    <Animated.View pointerEvents="none" style={[styles.tree, {
      // Качается крона, а комель стоит на месте — ствол не отрывается от земли.
      // Целые проценты: дробь в строке transformOrigin RN разбирает неверно.
      transformOrigin: `50% ${Math.round((TREE_CANVAS.baseY / TREE_CANVAS.height) * 100)}%`,
      transform: [
        { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${variant < 2 ? direction * 0.6 : 0}deg`] }) },
        { scale: sway.interpolate({ inputRange: [0, 1], outputRange: [1, variant === 2 ? 1.006 : 0.997] }) },
      ],
    }]}>
      {!same && <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.subtract(1, crossfade) }]}>
        <TreeSilhouette species={from.species} stage={from.stage} color={accent} />
      </Animated.View>}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: same ? 1 : crossfade }]}>
        <TreeSilhouette species={species} stage={stage} color={accent} />
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  tree: { width: '100%', height: '100%' },
});
