import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import TreeView from './TreeView';
import { gateFor } from './assets';

// Doors sit ajar at rest (part of the landscape, not a shut gate waiting to
// be noticed) and swing out to just past perpendicular on entry, past what a
// real door does, so the tree reads clearly through the frame at full zoom.
const REST_DEG = 55;
const OPEN_DEG = 105;

// `opening`: 0..1, 0 = resting ajar, 1 = fully open (also the camera zoom
// driving this frame once entering). `glow`: optional 0..1 opacity for the
// light in the doorway during the entry animation; when absent the gate
// breathes gently on its own (idle state), unless `breathing` is false.
export default memo(function GateAssembly({ width, opening: openingValue, glow, breathing = true, tree, reduceMotion, theme }) {
  const { assets, geometry } = gateFor(theme);
  const { opening, hingeLeft, hingeRight } = geometry;
  const height = width * geometry.aspect;
  const idleGlow = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (glow || !breathing || reduceMotion) { idleGlow.setValue(0.55); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(idleGlow, { toValue: 0.85, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(idleGlow, { toValue: 0.55, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [glow, breathing, reduceMotion, idleGlow]);
  const glowOpacity = glow || idleGlow;
  return <View pointerEvents="none" style={{ width, height }}>
    <View style={[styles.window, {
      left: `${opening.left * 100}%`, width: `${(opening.right - opening.left) * 100}%`,
      top: `${opening.top * 100}%`, height: `${(opening.bottom - opening.top) * 100}%`,
    }]}>
      {!!tree && <TreeView species={tree.species} stage={tree.stage} pulse={0} reduceMotion={reduceMotion} />}
    </View>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
      <Image source={assets.glow} resizeMode="contain" style={styles.layer} />
    </Animated.View>
    <Animated.View style={[StyleSheet.absoluteFill, {
      transformOrigin: `${hingeLeft * 100}% 50%`,
      transform: [{ perspective: Math.max(300, width * 4) },
        { rotateY: openingValue.interpolate({ inputRange: [0, 1], outputRange: [`-${REST_DEG}deg`, `-${OPEN_DEG}deg`] }) }],
    }]}><Image source={assets.doorLeft} resizeMode="contain" style={styles.layer} /></Animated.View>
    <Animated.View style={[StyleSheet.absoluteFill, {
      transformOrigin: `${hingeRight * 100}% 50%`,
      transform: [{ perspective: Math.max(300, width * 4) },
        { rotateY: openingValue.interpolate({ inputRange: [0, 1], outputRange: [`${REST_DEG}deg`, `${OPEN_DEG}deg`] }) }],
    }]}><Image source={assets.doorRight} resizeMode="contain" style={styles.layer} /></Animated.View>
    <View style={StyleSheet.absoluteFill}><Image source={assets.arch} resizeMode="contain" style={styles.layer} /></View>
  </View>;
});
const styles = StyleSheet.create({
  window: { position: 'absolute', overflow: 'hidden' },
  // Явные 100%: без них Image берёт собственный размер файла (600×720), и absoluteFill его не перебивает.
  layer: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
});
