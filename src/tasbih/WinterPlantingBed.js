import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const GROUND = require('../../assets/tasbih/winter/olive_ground.png');

// Match TreeView's contain-fit 768×960 canvas, including short phone layouts.
// The bed stays centred on the common root, not on the changing crown.
export default function WinterPlantingBed() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const canvasWidth = Math.min(size.width, size.height * 0.8);
  const bedWidth = canvasWidth * 0.76;
  const rootY = (size.height - canvasWidth * 1.25) / 2 + canvasWidth * 1.25 * 0.9;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}
    onLayout={({ nativeEvent: { layout } }) => setSize({ width: layout.width, height: layout.height })}>
    {canvasWidth > 0 && <Image source={GROUND}
      resizeMode="contain" style={{ position: 'absolute', width: bedWidth, height: bedWidth / 2,
        left: (size.width - bedWidth) / 2, top: rootY - bedWidth / 4 }} />}
  </View>;
}
