import React, { memo, useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { useAppearance } from '../utils/AppearanceContext';
import { TREE_ART, TREE_CANVAS } from './treeArt';

// Дерево — плоский слоистый силуэт цвета схемы, как сцены на обоях. Рисунок —
// кадр Krea-2 в оттенках серого, переведённый в альфу (build_v5.py): тёмное
// непрозрачно, светлые дальние слои полупрозрачны, а цвет даёт tintColor из
// оформления, поэтому дерево само собой совпадает с выбранной темой.

const STAGE_MS = 1200;

// Холст 240×300 вписан в рамку по центру (contain) — так же считает
// treeGeometry, и эффекты поверх дерева попадают в корень и крону. Холмик
// земли нарисован в самом кадре.
export const TreeSilhouette = memo(function TreeSilhouette({ species, stage, color }) {
  const source = TREE_ART[species]?.[stage];
  if (!source) return null;
  return <Image source={source} resizeMode="contain" style={[styles.fill, { tintColor: color }]} />;
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
  // Размеры явно: Image без них берёт собственный размер файла.
  fill: { width: '100%', height: '100%' },
});
