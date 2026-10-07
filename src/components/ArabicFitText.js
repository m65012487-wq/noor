import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Text from './AppText';
import { fitArabicSize } from '../utils/arabicText';

// Арабская строка, вписанная в ширину, — замена adjustsFontSizeToFit.
//
// Почему не adjustsFontSizeToFit. В новой архитектуре React Native на iOS
// minimumFontScale до раскладки не доходит: RCTTextLayoutManager берёт только
// minimumFontSize, а он по умолчанию 4 pt. К тому же ужимается один шрифт, а
// межстрочный (lineHeight) остаётся прежним. Длинная фраза, втиснутая в одну
// строку, сжималась без нижней границы — до едва различимых точек.
//
// Здесь текст сначала раскладывается обычным кеглем без ограничения строк, и по
// onTextLayout известна его полная ширина. Дальше кегль считает fitArabicSize
// (utils/arabicText.js): чтобы строка поместилась, но не меньше min, а если и
// на min не помещается — перенос до maxLines с потолком высоты maxHeight.
//
// base — обычные { fontSize, lineHeight }; style должен нести арабскую метку
// шрифта (FONTS.arabic). Текст по центру, если style не задаёт иного.
// onLines сообщает, сколько строк отведено тексту.
export default function ArabicFitText({ children, style, base, min, maxLines = 1, maxHeight, onLines, ...rest }) {
  const text = children === null || children === undefined ? '' : String(children);
  // Полная ширина текста при обычном кегле — замеряется один раз на текст.
  const [measure, setMeasure] = useState(null);
  const [boxW, setBoxW] = useState(0);
  const known = !!measure && measure.text === text;
  // Пока ширина рамки неизвестна, кегль не меняем и строки не ограничиваем.
  const ready = known && boxW > 0;

  const fit = ready
    ? fitArabicSize({ total: measure.total, wrapped: measure.wrapped, boxW, base, min, maxLines, maxHeight })
    : { fontSize: base.fontSize, lineHeight: base.lineHeight, lines: 1 };

  useEffect(() => { onLines?.(fit.lines); }, [fit.lines, onLines]);

  return (
    <Text {...rest} style={[styles.center, style, styles.stretch, { fontSize: fit.fontSize, lineHeight: fit.lineHeight }]}
      numberOfLines={ready ? maxLines : undefined}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w !== boxW) setBoxW(w);
      }}
      onTextLayout={(e) => {
        // Замер нужен только при обычном кегле; дальнейшие раскладки (уже
        // уменьшенным кеглем) его не перезаписывают, иначе кегль качался бы.
        if (known) return;
        const laid = e.nativeEvent.lines || [];
        setMeasure({ text, total: laid.reduce((sum, l) => sum + l.width, 0), wrapped: laid.length > 1 });
      }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Арабский абзац на iOS по умолчанию прижат вправо (естественное
  // выравнивание), а рамка растянута — без центра слово уезжало бы к краю.
  center: { textAlign: 'center' },
  // Во всю ширину родителя: по ширине рамки считается кегль.
  stretch: { alignSelf: 'stretch' },
});
