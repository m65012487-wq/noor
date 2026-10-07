import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useAppearance } from '../utils/AppearanceContext';
import { isMixedArabic, splitArabicRuns } from '../utils/arabicText';

// Текст приложения. В React Native семейство шрифта не наследуется через
// контейнеры, а подмена Text.defaultProps в новых версиях React больше не
// работает — поэтому выбранный шрифт приходится подмешивать компонентом.
//
// Три правила:
//
// 1. Интерфейсный шрифт кладётся ПОД переданный стиль, поэтому любое явное
//    fontFamily перебивает его.
//
// 2. Значение 'System' в стиле — это метка арабского текста (её ставит
//    FONTS.arabic). Она заменяется на выбранное арабское начертание.
//    Метка выбрана именно такой на случай, если подстановка не сработает:
//    текст тогда просто останется системным шрифтом, а не исчезнет.
//
// 3. Арабские вставки в русском или английском тексте («Ба · ب», «(ز)»)
//    набираются арабским начертанием и на четверть крупнее строки. В
//    интерфейсном шрифте арабских букв нет, iOS подставляет системные того же
//    кегля, а при равном кегле арабские буквы заметно мельче кириллицы — в
//    мелкой подписи они превращались в точки. Строки целиком на арабском не
//    трогаем: их кегль задают сами экраны.

const ARABIC_SCALE = 1.25;
// Межстрочный абзаца со вставкой — не меньше полутора кеглей вставки. Иначе iOS
// не центрирует строку по базовой линии (шрифт выше межстрочного), и огласовки
// над арабскими буквами первой строки подрезаются.
const ARABIC_LINE = 1.5;

export default function AppText({ style, children, ...rest }) {
  const { fonts, arabicFamily } = useAppearance();

  const flat = StyleSheet.flatten(style) || {};
  const isArabic = flat.fontFamily === 'System';

  const mixed = !isArabic
    && (Array.isArray(children) ? children.some(isMixedArabic) : isMixedArabic(children));
  let content = children;
  let lineFix = null;
  if (mixed) {
    const runSize = Math.round((flat.fontSize || 14) * ARABIC_SCALE);
    // Вложенному тексту семейство нужно назвать явно: без него он унаследовал бы
    // интерфейсный шрифт строки. 'System' iOS понимает как системный шрифт.
    const runStyle = { fontFamily: arabicFamily || 'System', fontSize: runSize };
    content = React.Children.map(children, (child) => (isMixedArabic(child)
      ? splitArabicRuns(child).map((part, i) => (part.arabic
        ? <RNText key={i} style={runStyle}>{part.text}</RNText>
        : part.text))
      : child));
    if (flat.lineHeight && flat.lineHeight < runSize * ARABIC_LINE) {
      lineFix = { lineHeight: Math.round(runSize * ARABIC_LINE) };
    }
  }

  const resolved = isArabic
    ? [style, { fontFamily: arabicFamily === 'System' ? undefined : arabicFamily }]
    : [fonts?.ui ? { fontFamily: fonts.ui } : null, style, lineFix];

  return <RNText {...rest} style={resolved}>{content}</RNText>;
}
