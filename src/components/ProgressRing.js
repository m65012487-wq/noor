import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// Кольцо прогресса: показывает, какая часть промежутка между намазами прошла.
// Само по себе время до следующего намаза не даёт чувства масштаба — час
// до заката и час до рассвета выглядят одинаково. Кольцо это различает.
export default function ProgressRing({
  size = 200, stroke = 8, progress = 0, color = COLORS.accent, track = 'rgba(255,255,255,0.12)',
  children,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Оставляем минимальную дугу: полностью пустое кольцо читается как сбой.
  const filled = Math.max(0.004, Math.min(progress, 1));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#ring)" strokeWidth={stroke} fill="none"
          strokeDasharray={`${c * filled} ${c}`}
          strokeLinecap="round"
          // Начало дуги сверху, а не справа, как рисует SVG по умолчанию.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
