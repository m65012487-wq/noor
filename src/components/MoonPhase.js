import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { moonPhase, litPath } from '../utils/moon';

// Луна по лунному календарю: диск, у которого освещена ровно та доля, что
// сегодня на небе. Стоит за цифрами обратного отсчёта, поэтому нарочно
// приглушена — это фон, а не иллюстрация.
//
// Анимация проходит от новолуния до сегодняшней фазы при появлении экрана.
// Тянуть её дольше полутора секунд нельзя: человек открывает приложение
// посмотреть время, а не любоваться заставкой.
//
// Путь освещённой части пересчитывается на каждом кадре, поэтому анимация
// идёт через состояние, а не через нативный драйвер: форму фигуры драйвер
// анимировать не умеет.
export default function MoonPhase({ size = 150, color = '#e8eef2', date, animate = true }) {
  const target = moonPhase(date || new Date());
  const [phase, setPhase] = useState(animate ? 0 : target.phase);
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) { setPhase(target.phase); return undefined; }
    const id = value.addListener(({ value: v }) => setPhase(v * target.phase));
    Animated.timing(value, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => value.removeListener(id);
    // Фаза меняется раз в сутки; пересобирать анимацию чаще незачем.
  }, [target.phase, animate, value]);

  const r = size / 2;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Defs>
        <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity="0.22" />
          <Stop offset="1" stopColor={color} stopOpacity="0.05" />
        </RadialGradient>
      </Defs>
      {/* Тёмная часть диска остаётся видимой: без неё серп висит в пустоте
          и не читается как луна. */}
      <Circle cx={r} cy={r} r={r - 1} fill="url(#moonGlow)"
        stroke={color} strokeOpacity="0.18" strokeWidth="1" />
      <Path d={litPath(r, r, r - 1, phase)} fill={color} fillOpacity="0.30" />
    </Svg>
  );
}
