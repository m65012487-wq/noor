import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, Animated, PanResponder, StyleSheet, Dimensions,
  TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, FONTS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';

const SCREEN_H = Dimensions.get('window').height;

// Frosted bottom sheet. A fixed top grabber (handle + title) is the drag zone —
// it sits outside the scroll view, so the PanResponder reliably owns the gesture
// on iOS (a JS responder cannot steal a native ScrollView's gesture). The body
// scrolls independently.
export default function DraggableSheet({
  visible, onClose, children, title, maxHeightPct = 0.85,
  contentContainerStyle, keyboardAvoiding = false,
}) {
  const insets = useSafeAreaInsets();
  const { tint, glassOpacity, flat: mono } = useAppearance();
  const SHEET_MAX = SCREEN_H * maxHeightPct;
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 14, tension: 60 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (e, gs) => Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => { translateY.stopAnimation((v) => { dragStart.current = v; }); },
      onPanResponderMove: (e, gs) => {
        let y = dragStart.current + gs.dy;
        if (y < 0) y = y / 3; // rubber-band above the resting point
        translateY.setValue(y);
      },
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 100 || gs.vy > 0.6) dismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 12, tension: 80 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 12, tension: 80 }).start();
      },
    })
  ).current;

  const base = glassOpacity != null ? glassOpacity : 0.07;
  const rgb = tint || '150,200,225';
  const blurI = Math.round(34 + base * 120);

  const sheet = (
    <Animated.View
      style={[styles.sheetWrap, { maxHeight: SHEET_MAX, paddingBottom: insets.bottom + 16,
        transform: [{ translateY }] }]}>
      {/* glass layers (or flat mono fill) */}
      {mono ? (
        <View style={[StyleSheet.absoluteFill, styles.clip, styles.monoFill]} pointerEvents="none" />
      ) : (
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
      )}
      {/* rim */}
      <View style={[StyleSheet.absoluteFill, styles.clip, styles.rim,
        mono && { borderColor: 'rgba(255,255,255,0.20)' }]} pointerEvents="none" />

      {/* draggable grabber: handle + title */}
      <View style={styles.grab} {...pan.panHandlers}>
        <View style={[styles.handle, mono && { backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 0 }]} />
        {title ? <Text style={[styles.title, mono && styles.titleDot]}>{title}</Text> : null}
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentContainerStyle]}>
        {children}
      </Animated.ScrollView>
    </Animated.View>
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.anchor} pointerEvents="box-none">
          {sheet}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.anchor} pointerEvents="box-none">{sheet}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 998, elevation: 23 },
  anchor: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 999, elevation: 24 },
  sheetWrap: {
    borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  clip: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, overflow: 'hidden' },
  monoFill: { backgroundColor: '#060606' },
  rim: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.28)', borderBottomWidth: 0 },
  grab: { paddingTop: 12, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)', alignSelf: 'center' },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: SPACING.md },
  titleDot: { fontFamily: FONTS.dot, fontWeight: '400', fontSize: 19, color: COLORS.white, letterSpacing: 1, textTransform: 'uppercase' },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, paddingTop: SPACING.xs },
});
