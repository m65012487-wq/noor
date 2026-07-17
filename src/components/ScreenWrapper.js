import React from 'react';
import { StyleSheet, View, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING } from '../constants/theme';
import { useAppearance, wallpaperFor } from '../utils/AppearanceContext';

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
// `bg` can still force a specific image directly.
export default function ScreenWrapper({ children, edges = ['top'], bg, slot = 'main', swipeHandlers }) {
  let key = bg;
  let appearance = null;
  try {
    appearance = useAppearance();
    if (!key && appearance && appearance.theme) key = wallpaperFor(appearance.theme, slot);
  } catch {}

  // Flat monochrome theme: solid background, no wallpaper or scrim.
  if (appearance && appearance.flat) {
    return (
      <View style={[styles.flex, { backgroundColor: appearance.bg || '#000' }]}>
        <SafeAreaView style={styles.safe} edges={edges}>
          <View style={styles.inner} {...(swipeHandlers || {})}>{children}</View>
        </SafeAreaView>
      </View>
    );
  }

  const source = BACKGROUNDS[key] || BACKGROUNDS.main;
  return (
    <ImageBackground source={source} style={styles.flex} resizeMode="cover">
      {/* Gentle scrim so frosted glass + light text stay readable on any image.
          Slightly stronger at the bottom where the floating tab bar sits. */}
      <LinearGradient
        colors={['rgba(14,26,42,0.28)', 'rgba(14,26,42,0.42)', 'rgba(14,26,42,0.66)']}
        locations={[0, 0.55, 1]}
        style={styles.flex}
      >
        <SafeAreaView style={styles.safe} edges={edges}>
          <View style={styles.inner} {...(swipeHandlers || {})}>{children}</View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: SPACING.md },
});
