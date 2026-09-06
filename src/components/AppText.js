import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useAppearance } from '../utils/AppearanceContext';

// Текст приложения. В React Native семейство шрифта не наследуется через
// контейнеры, а подмена Text.defaultProps в новых версиях React больше не
// работает — поэтому выбранный шрифт приходится подмешивать компонентом.
//
// Два правила:
//
// 1. Интерфейсный шрифт кладётся ПОД переданный стиль, поэтому любое явное
//    fontFamily перебивает его.
//
// 2. Значение 'System' в стиле — это метка арабского текста (её ставит
//    FONTS.arabic). Она заменяется на выбранное арабское начертание.
//    Метка выбрана именно такой на случай, если подстановка не сработает:
//    текст тогда просто останется системным шрифтом, а не исчезнет.
export default function AppText({ style, children, ...rest }) {
  const { fonts, arabicFamily } = useAppearance();

  const flat = StyleSheet.flatten(style) || {};
  const isArabic = flat.fontFamily === 'System';

  const resolved = isArabic
    ? [style, { fontFamily: arabicFamily === 'System' ? undefined : arabicFamily }]
    : [fonts?.ui ? { fontFamily: fonts.ui } : null, style];

  return <RNText {...rest} style={resolved}>{children}</RNText>;
}
