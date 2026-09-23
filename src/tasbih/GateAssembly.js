import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import TreeView from './TreeView';
import { GATE_ASSETS, GATE_GEOMETRY } from './assets';

const { opening, hingeLeft, hingeRight } = GATE_GEOMETRY;

// `opening`: 0..1 swing of the doors (and, once entering, the camera zoom
// driving this frame). `glow`: optional 0..1 opacity for the light in the
// doorway during the entry animation; when absent the gate breathes gently
// on its own (main-screen idle state), unless `breathing` is false.
export default memo(function GateAssembly({ width, opening: openingValue, glow, breathing = true, tree, reduceMotion }) {
  const height = width * GATE_GEOMETRY.aspect;
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
      {tree && <TreeView species={tree.species} stage={tree.stage} pulse={0} reduceMotion={reduceMotion} />}
    </View>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
      <Image source={GATE_ASSETS.glow} resizeMode="contain" style={styles.layer} />
    </Animated.View>
    <Animated.View style={[StyleSheet.absoluteFill, {
      transformOrigin: `${hingeLeft * 100}% 50%`,
      transform: [{ perspective: Math.max(300, width * 4) },
        { rotateY: openingValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-105deg'] }) }],
    }]}><Image source={GATE_ASSETS.doorLeft} resizeMode="contain" style={styles.layer} /></Animated.View>
    <Animated.View style={[StyleSheet.absoluteFill, {
      transformOrigin: `${hingeRight * 100}% 50%`,
      transform: [{ perspective: Math.max(300, width * 4) },
        { rotateY: openingValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '105deg'] }) }],
    }]}><Image source={GATE_ASSETS.doorRight} resizeMode="contain" style={styles.layer} /></Animated.View>
    <View style={StyleSheet.absoluteFill}><Image source={GATE_ASSETS.arch} resizeMode="contain" style={styles.layer} /></View>
  </View>;
});
const styles = StyleSheet.create({
  window: { position: 'absolute', overflow: 'hidden' },
  // Явные 100%: без них Image берёт собственный размер файла (600×720), и absoluteFill его не перебивает.
  layer: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
});
