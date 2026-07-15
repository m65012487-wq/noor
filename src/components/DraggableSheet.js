import React from 'react';
import { Modal, View, Animated, StyleSheet, Dimensions,
  TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACING } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import useSheetDrag from '../utils/useSheetDrag';

const SCREEN_H = Dimensions.get('window').height;

export default function DraggableSheet({
  visible, onClose, children, maxHeightPct = 0.85, contentContainerStyle,
}) {
  const insets = useSafeAreaInsets();
  const { tint, glassOpacity } = useAppearance();
  const SHEET_MAX = SCREEN_H * maxHeightPct;
  const { translateY, backdropOpacity, panHandlers, onScroll, dismiss } = useSheetDrag(visible, onClose);

  const base = glassOpacity != null ? glassOpacity : 0.07;
  const rgb = tint || '150,200,225';
  const blurI = Math.round(34 + base * 120);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrap, { maxHeight: SHEET_MAX, paddingBottom: insets.bottom + 16,
          transform: [{ translateY }] }]}
        {...panHandlers}>
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
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentContainerStyle]}>
          {children}
        </Animated.ScrollView>
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
  content: { padding: SPACING.lg, paddingTop: SPACING.sm },
});
