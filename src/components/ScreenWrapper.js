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

// `slot` picks which wallpaper from the current theme pack: 'main' | 'reader' | 'lesson'.
// `slot` выбирает обои темы: 'main' | 'reader' | 'lesson'.
// `bg` по-прежнему может задать картинку напрямую.
export default function ScreenWrapper({ children, edges = ['top'], bg, slot = 'main', swipeHandlers }) {
  // Хук вызывается безусловно. Раньше он стоял внутри try/catch — то есть
  // условно, что нарушает правила хуков и ломает порядок между рендерами.
  // Контекст и так отдаёт значения по умолчанию, если провайдера нет.
  const appearance = useAppearance();

  const body = (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={styles.inner} {...(swipeHandlers || {})}>{children}</View>
    </SafeAreaView>
  );

  // Узорная тема: градиент схемы, поверх — бесшовная плитка, покрашенная
  // тем же тоном. Плитка повторяется, а не растягивается, поэтому её вес
  // не зависит от размера экрана: 256×256 на любой диагонали.
  if (appearance?.patterned) {
    const sc = appearance.schemeColors;
    const tile = PATTERN_TILES[appearance.pattern];
    return (
      <LinearGradient colors={sc.bg} style={styles.flex}>
        {tile && (
          <ImageBackground
            source={tile}
            resizeMode="repeat"
            imageStyle={{ tintColor: `rgba(${sc.tint},0.14)` }}
            style={styles.flex}
          >
            {body}
          </ImageBackground>
        )}
        {!tile && body}
      </LinearGradient>
    );
  }

  const key = bg || (appearance?.theme ? wallpaperFor(appearance.theme, slot) : undefined);
  const source = BACKGROUNDS[key] || BACKGROUNDS.main;
  return (
    <ImageBackground source={source} style={styles.flex} resizeMode="cover">
      {/* Затемнение, чтобы матовое стекло и светлый текст читались на любой
          фотографии. Внизу плотнее — там висит плавающая панель вкладок. */}
      <LinearGradient
        colors={['rgba(14,26,42,0.28)', 'rgba(14,26,42,0.42)', 'rgba(14,26,42,0.66)']}
        locations={[0, 0.55, 1]}
        style={styles.flex}
      >
        {body}
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: SPACING.md },
});
