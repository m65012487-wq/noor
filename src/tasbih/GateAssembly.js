import React, { memo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import TreeView from './TreeView';
import { GATE_ASSETS } from './assets';
import { GATE_VECTORS } from './gateVectors';
import { GARDEN_COLORS } from '../constants/environmentTheme';

function Layer({ name, color }) {
  return GATE_ASSETS[name]
    ? <Image source={GATE_ASSETS[name]} resizeMode="contain" style={StyleSheet.absoluteFill} />
    : <SvgXml xml={GATE_VECTORS[name]} width="100%" height="100%" color={color} />;
}
export default memo(function GateAssembly({ width, opening, stageId, palette, reduceMotion }) {
  const height = width * 1.2;
  return <View pointerEvents="none" style={{ width, height }}>
    <View style={styles.treeWindow}>
      {stageId && <TreeView stageId={stageId} pulse={0} reduceMotion={reduceMotion} />}
    </View>
    <View style={StyleSheet.absoluteFill}><Layer name="gate_arch" color={GARDEN_COLORS.stone} /></View>
    {['gate_left_door', 'gate_right_door'].map((name, index) => <Animated.View key={name}
      style={[styles.door, { left: index === 0 ? '18%' : '50%', transformOrigin: index === 0 ? 'left center' : 'right center',
        transform: [{ perspective: Math.max(300, width * 3) },
          { rotateY: opening.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${index === 0 ? -82 : 82}deg`] }) }],
      }]}><Layer name={name} color={GARDEN_COLORS.ironLight} /></Animated.View>)}
    <View style={StyleSheet.absoluteFill}><Layer name="gate_plants" color={GARDEN_COLORS.leafLight} /></View>
    <View style={[StyleSheet.absoluteFill, { opacity: palette?.phase === 'night' ? 0.75 : 0.35 }]}><Layer name="gate_light" color={GARDEN_COLORS.light} /></View>
  </View>;
});
const styles = StyleSheet.create({
  treeWindow: { position: 'absolute', left: '25%', width: '50%', bottom: '5%', height: '69%', overflow: 'hidden' },
  door: { position: 'absolute', width: '32%', height: '78%', bottom: '3%' },
});
