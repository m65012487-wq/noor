import React from 'react';
import { StyleSheet, View, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING } from '../constants/theme';
import { useAppearance, PATTERN_TILES } from '../utils/AppearanceContext';

// Фон по текущей теме. Логика лежит здесь одна на всё приложение: раньше
// она была продублирована в обёртке экранов, читалке суры и плеере уроков,
// и обучение осталось с фотографией, когда появились узорные темы.
//
// `plain` — спокойный градиент без узора. Для длинного чтения любой рисунок
// под текстом мешает: узор просвечивает между строк.
export function ThemedBackground({ children, plain = false, style }) {
  const appearance = useAppearance();
  const sc = appearance?.schemeColors;
  const bg = sc ? sc.bg : ['#1b2430', '#0d131b'];

  if (plain || !appearance?.patterned) {
    return (
      <LinearGradient colors={bg} style={[styles.flex, style]}>
        {children}
      </LinearGradient>
    );
  }

  const tile = PATTERN_TILES[appearance.pattern];
  return (
    <LinearGradient colors={bg} style={[styles.flex, style]}>
      {tile ? (
        <ImageBackground source={tile} resizeMode="repeat"
          imageStyle={{ tintColor: `rgba(${sc.tint},0.14)` }} style={styles.flex}>
          {children}
        </ImageBackground>
      ) : children}
    </LinearGradient>
  );
}

// `plain` включает фон без узора — для экранов чтения.
export default function ScreenWrapper({
  children, edges = ['top'], plain = false, swipeHandlers,
}) {
  return (
    <ThemedBackground plain={plain}>
      <SafeAreaView style={styles.safe} edges={edges}>
        <View style={styles.inner} {...(swipeHandlers || {})}>{children}</View>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: SPACING.md },
});
