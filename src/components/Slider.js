import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

// Minimal slider (no external dependency). value/onChange in [min,max].
export default function Slider({ value, min = 0, max = 1, onChange }) {
  const [width, setWidth] = useState(1);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => updateFromX(e.nativeEvent.locationX),
    })
  ).current;

  function updateFromX(x) {
    const p = Math.max(0, Math.min(1, x / width));
    onChange(min + p * (max - min));
  }

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <View style={styles.track} />
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      <View style={[styles.thumb, { left: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 40, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  fill: { position: 'absolute', height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white,
    marginLeft: -11, borderWidth: 2, borderColor: COLORS.accent },
});
