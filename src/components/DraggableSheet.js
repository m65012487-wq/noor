import React, { useRef, useEffect } from 'react';
import { Modal, View, Animated, PanResponder, StyleSheet, Dimensions,
  TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';

const SCREEN_H = Dimensions.get('window').height;

export default function DraggableSheet({ visible, onClose, children, maxHeightPct = 0.85 }) {
  const insets = useSafeAreaInsets();
  const { tint, glassOpacity } = useAppearance();
  const SHEET_MAX = SCREEN_H * maxHeightPct;
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);

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

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (e, gs) => gs.dy > 2,
    onMoveShouldSetPanResponder: (e, gs) => gs.dy > 2,
    onPanResponderGrant: () => { translateY.stopAnimation((v) => { dragStart.current = v; }); },
    onPanResponderMove: (e, gs) => {
      const y = Math.max(0, dragStart.current + gs.dy);
      translateY.setValue(y);
    },
    onPanResponderRelease: (e, gs) => {
      if (gs.dy > 100 || gs.vy > 0.6) {
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 240, useNativeDriver: true })
          .start(() => onClose());
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 12 }).start();
      }
    },
  })).current;

  const base = glassOpacity != null ? glassOpacity : 0.07;
  const rgb = tint || '150,200,225';
  const blurI = Math.round(34 + base * 120);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrap, { maxHeight: SHEET_MAX, paddingBottom: insets.bottom + 16,
          transform: [{ translateY }] }]}
        {...pan.panHandlers}>
        {/* glass layers */}
        <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
          <BlurView intensity={blurI} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[`rgba(${rgb},${Math.min(0.30, base + 0.08).toFixed(3)})`,
                     `rgba(${rgb},${base.toFixed(3)})`]}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.35 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {/* rim */}
        <View style={[StyleSheet.absoluteFill, styles.clip, styles.rim]} pointerEvents="none" />

        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 998, elevation: 23 },
  sheetWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
    overflow: 'hidden', zIndex: 999, elevation: 24,
  },
  clip: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, overflow: 'hidden' },
  rim: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.28)', borderBottomWidth: 0 },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
});
