import React, { useRef, useEffect, useState } from 'react';
import { Modal, View, Text, Animated, PanResponder, StyleSheet, Dimensions,  TouchableWithoutFeedback, Keyboard, LayoutAnimation, Platform, UIManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { GlassView as NativeGlass } from 'expo-glass-effect';
import { LIQUID_GLASS } from './GlassView';

const SCREEN_H = Dimensions.get('window').height;
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {  UIManager.setLayoutAnimationEnabledExperimental(true);}

// Матовая нижняя шторка. Неподвижная верхняя зона (полоска и заголовок) —
// область перетаскивания: она вынесена из списка, поэтому PanResponder
// надёжно владеет жестом на iOS, где JS-респондер не может отобрать жест
// у нативного ScrollView. Тело прокручивается отдельно.
export default function DraggableSheet({
  visible, onClose, children, title, maxHeightPct = 0.85,
  contentContainerStyle, keyboardAvoiding = false,
}) {
  const insets = useSafeAreaInsets();
  const { tint, glassOpacity } = useAppearance();
  const SHEET_MAX = SCREEN_H * maxHeightPct;
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);

  // Высота клавиатуры. Раньше шторку поднимал KeyboardAvoidingView, но она
  // прижата к низу экрана: при подъёме под ней открывалась полоса без фона
  // и без скругления — тот самый обрезанный кусочек. Теперь шторка остаётся
  // на месте, а её нижний отступ вырастает на высоту клавиатуры: содержимое
  // выходит наверх, а стекло продолжает закрывать всё до края экрана.
  const [keyboardH, setKeyboardH] = useState(0);

  useEffect(() => {
    if (!keyboardAvoiding) return undefined;
    // willShow/willHide на iOS приходят до начала анимации клавиатуры,
    // поэтому отступ меняется синхронно с ней, а не догоняет её.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext({
        duration: e.duration || 250,
        update: { type: LayoutAnimation.Types.keyboard },
      });
      setKeyboardH(e.endCoordinates?.height || 0);
    });
    const hide = Keyboard.addListener(hideEvent, (e) => {
      LayoutAnimation.configureNext({
        duration: e?.duration || 250,
        update: { type: LayoutAnimation.Types.keyboard },
      });
      setKeyboardH(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [keyboardAvoiding]);
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        // Собранная пружина вместо мягкой: friction 14 / tension 60 давали
        // долгий вязкий выезд, который читался как подтормаживание.
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true,
          damping: 32, stiffness: 320, mass: 1 }),
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
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 30, stiffness: 300, mass: 1 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 30, stiffness: 300, mass: 1 }).start();
      },
    })
  ).current;

  const base = glassOpacity != null ? glassOpacity : 0.07;
  const rgb = tint || '150,200,225';
  const blurI = Math.round(34 + base * 120);

  const sheet = (
    <Animated.View
      style={[styles.sheetWrap,
        // Клавиатура прибавляется к высоте и к нижнему отступу: содержимое
        // уходит наверх, а стекло по-прежнему доходит до края экрана.
        { maxHeight: SHEET_MAX + keyboardH,
          paddingBottom: (keyboardH > 0 ? SPACING.md : insets.bottom + SPACING.md) + keyboardH,
          transform: [{ translateY }] }]}>

      {LIQUID_GLASS ? (
        <NativeGlass glassEffectStyle="regular"
          style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none" />
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

      {/* Собственная кромка не нужна поверх системного стекла: оно рисует свою */}
      {!LIQUID_GLASS && (
        <View style={[StyleSheet.absoluteFill, styles.clip, styles.rim]} pointerEvents="none" />
      )}

      <View style={styles.grab} {...pan.panHandlers}>
        <View style={styles.handle} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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

      {/* Шторка всегда прижата к низу: подъём над клавиатурой делается
          отступом внутри неё, а не перемещением всего контейнера. */}
      <View style={styles.anchor} pointerEvents="box-none">{sheet}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 998, elevation: 23 },
  anchor: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 999, elevation: 24 },
  sheetWrap: {
    borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  clip: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, overflow: 'hidden' },
  rim: { borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.28)', borderBottomWidth: 0 },
  grab: { paddingTop: SPACING.sm, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  handle: { width: 44, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)', alignSelf: 'center' },
  title: { ...TYPE.heading, color: COLORS.text, fontWeight: '800', marginTop: SPACING.md },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, paddingTop: SPACING.xs },
});
