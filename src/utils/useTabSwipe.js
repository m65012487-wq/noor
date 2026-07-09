import { useRef } from 'react';
import { PanResponder, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const TAB_ORDER = ['Prayer', 'Qibla', 'Quran', 'Read'];
const { width: SCREEN_W } = Dimensions.get('window');
const EDGE = 40; // px from each side that starts a tab swipe

// Edge-swipe between tabs: the gesture only starts if it begins near the
// left or right screen edge, so it never conflicts with content swipes.
export function useTabSwipe(currentRouteName) {
  const navigation = useNavigation();
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => {
        const x0 = e.nativeEvent.pageX - g.dx; // approx start x
        const nearEdge = x0 <= EDGE || x0 >= SCREEN_W - EDGE;
        return nearEdge && Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4;
      },
      onPanResponderRelease: (_, g) => {
        const idx = TAB_ORDER.indexOf(currentRouteName);
        if (idx < 0) return;
        if (g.dx < -55 && idx < TAB_ORDER.length - 1) navigation.navigate(TAB_ORDER[idx + 1]);
        else if (g.dx > 55 && idx > 0) navigation.navigate(TAB_ORDER[idx - 1]);
      },
    })
  ).current;
  return pan.panHandlers;
}
