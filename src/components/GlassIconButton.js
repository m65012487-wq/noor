import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';

// Лёгкая «стеклянная» кнопка-иконка: полупрозрачная заливка без BlurView,
// поэтому её безопасно рисовать десятками в списке.
export default function GlassIconButton({
  name, onPress, size = 18, active = false, style,
}) {
  const { accent, tint } = useAppearance();
  const rgb = tint || '150,200,225';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      <View style={[
        styles.btn,
        // Активное состояние подхватывает акцент темы, а не зашитый голубой:
        // иначе на «Рассвете» и «Садах» кнопка выпадала из палитры.
        active && { backgroundColor: `rgba(${rgb},0.22)`, borderColor: 'rgba(255,255,255,0.40)' },
      ]}>
        <Ionicons name={name} size={size} color={active ? accent : COLORS.text} />
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
});
