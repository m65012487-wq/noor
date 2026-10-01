import React, { memo } from 'react';
import Svg, { Ellipse } from 'react-native-svg';

// Зерно в том же плоском стиле, что и деревья: силуэт цвета схемы с
// бликом светлее. Картинки под каждую породу не нужны — породу называет
// подпись рядом, а на иконке размером с ноготь они всё равно не различались.
export default memo(function SeedIcon({ size = 36, color, rotate = -18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Ellipse cx={20} cy={20} rx={11} ry={7.5} fill={color} fillOpacity={0.85}
        transform={`rotate(${rotate} 20 20)`} />
      <Ellipse cx={17} cy={17.5} rx={5} ry={2.4} fill={color} fillOpacity={0.45}
        transform={`rotate(${rotate} 20 20)`} />
    </Svg>
  );
});
