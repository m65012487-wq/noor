import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Lightweight frosted-look icon button (solid translucent, no BlurView —
// safe to render many in a list).
export default function GlassIconButton({
  name, onPress, size = 18, active = false, style,
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      <View style={[styles.btn, active && styles.active]}>
        <Ionicons name={name} size={size} color={active ? COLORS.white : COLORS.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder,
  },
  active: { backgroundColor: 'rgba(127,180,204,0.20)', borderColor: 'rgba(255,255,255,0.4)' },
});
