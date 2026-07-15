import { useRef, useEffect } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';

const SCREEN_H = Dimensions.get('window').height;

// Shared bottom-sheet behaviour: slide-in/out animation + drag-to-dismiss that
// coordinates with an inner scroll view. Return `onScroll` to the scrollable
// child so the sheet only steals the gesture when the content is at the top and
// the finger is pulling down — otherwise the list scrolls normally.
export default function useSheetDrag(visible, onClose) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const scrollY = useRef(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 14, tension: 60 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Animate out, then notify the parent (keeps the exit smooth instead of a jump).
  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN_H, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  };

  const wantsDrag = (gs) => gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2;

  const pan = useRef(
    PanResponder.create({
      // Non-scroll areas (handle, padding, buttons): grab any clear downward drag.
      onMoveShouldSetPanResponder: (e, gs) => wantsDrag(gs),
      // Over the scroll view: only steal the gesture when scrolled to the top.
      onMoveShouldSetPanResponderCapture: (e, gs) => wantsDrag(gs) && scrollY.current <= 0,
      onPanResponderGrant: () => {
        translateY.stopAnimation((v) => { dragStart.current = v; });
      },
      onPanResponderMove: (e, gs) => {
        let y = dragStart.current + gs.dy;
        if (y < 0) y = y / 3; // rubber-band when pulled above the resting point
        translateY.setValue(y);
      },
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 120 || gs.vy > 0.6) dismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 12, tension: 80 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 12, tension: 80 }).start();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const onScroll = (e) => { scrollY.current = e.nativeEvent.contentOffset.y; };

  return { translateY, backdropOpacity, panHandlers: pan.panHandlers, onScroll, dismiss };
}
