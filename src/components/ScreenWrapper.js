import React from 'react';
import { StyleSheet, View, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING } from '../constants/theme';
import { useAppearance, wallpaperFor, PATTERN_TILES } from '../utils/AppearanceContext';

// All wallpaper images, keyed by name.
const BACKGROUNDS = {
  main: require('../../assets/backgrounds/main.png'),
  alt1: require('../../assets/backgrounds/alt1.png'),
  alt2: require('../../assets/backgrounds/alt2.png'),
  dawn: require('../../assets/backgrounds/dawn.png'),
  clouds: require('../../assets/backgrounds/clouds.png'),
  garden_main: require('../../assets/backgrounds/garden_main.png'),
  garden_reader: require('../../assets/backgrounds/garden_reader.png'),
  garden_lesson: require('../../assets/backgrounds/garden_lesson.png'),
  cosmos_main: require('../../assets/backgrounds/cosmos_main.png'),
  cosmos_reader: require('../../assets/backgrounds/cosmos_reader.png'),
  cosmos_lesson: require('../../assets/backgrounds/cosmos_lesson.png'),
};

// Фон по текущей теме. Раньше эта логика лежала в трёх местах: обёртке
// экранов, читалке суры и плеере уроков — из-за чего обучение осталось
// с фотографией, когда появились узорные темы.
//
// `plain` — спокойный градиент без узора и фотографии. Для длинного чтения
// любой фон под текстом мешает: узор просвечивает между строк, фотография
// тянет внимание на себя.
export function ThemedBackground({ children, slot = 'main', plain = false, style }) {
  const appearance = useAppearance();
  const patterned = !!appearance?.patterned;
  const sc = appearance?.schemeColors;

  if (plain) {
    const colors = patterned && sc
      ? sc.bg
      : ['#16263b', '#101d2e', '#0b1522'];
    return (
      <LinearGradient colors={colors} locations={patterned ? undefined : [0, 0.5, 1]}
        style={[styles.flex, style]}>
        {children}
      </LinearGradient>
    );
  }

  if (patterned && sc) {
    const tile = PATTERN_TILES[appearance.pattern];
    return (
      <LinearGradient colors={sc.bg} style={[styles.flex, style]}>
        {tile ? (
          <ImageBackground source={tile} resizeMode="repeat"
            imageStyle={{ tintColor: `rgba(${sc.tint},0.14)` }} style={styles.flex}>
            {children}
          </ImageBackground>
        ) : children}
      </LinearGradient>
    );
  }

  const key = appearance?.theme ? wallpaperFor(appearance.theme, slot) : undefined;
  const source = BACKGROUNDS[key] || BACKGROUNDS.main;
  return (
    <ImageBackground source={source} style={[styles.flex, style]} resizeMode="cover">
      {/* Затемнение, чтобы матовое стекло и светлый текст читались на любой
          фотографии. Внизу плотнее — там висит плавающая панель вкладок. */}
      <LinearGradient
        colors={['rgba(14,26,42,0.28)', 'rgba(14,26,42,0.42)', 'rgba(14,26,42,0.66)']}
        locations={[0, 0.55, 1]}
        style={styles.flex}
      >
        {children}
      </LinearGradient>
    </ImageBackground>
  );
}

// `slot` выбирает обои темы: 'main' | 'reader' | 'lesson'.
// `plain` включает спокойный фон без узора — для экранов чтения.
export default function ScreenWrapper({
  children, edges = ['top'], slot = 'main', plain = false, swipeHandlers,
}) {
  return (
    <ThemedBackground slot={slot} plain={plain}>
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
