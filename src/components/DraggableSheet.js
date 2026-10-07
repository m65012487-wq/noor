import React, { useRef, useEffect, useState } from 'react';
import { Modal, View, Animated, Easing, PanResponder, StyleSheet, Dimensions, TouchableWithoutFeedback, Keyboard, Platform, ScrollView } from 'react-native';
import Text from './AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { GlassView as NativeGlass } from 'expo-glass-effect';
import { LIQUID_GLASS } from './GlassView';

const SCREEN_H = Dimensions.get('window').height;

// Насколько стекло продлевается ниже края экрана. Клавиатуры на всех
// актуальных iPhone ниже этого значения, включая панель автодополнения.
const KEYBOARD_EXTRA = 420;

// Параметры анимаций. Всё идёт на нативном драйвере (transform и opacity)
// и с isInteraction: false — иначе каждая шторка держит InteractionManager
// занятым и откладывает чужую отложенную работу.
const OPEN_MS = 320;
const CLOSE_MS = 220;
const OPEN_EASE = Easing.out(Easing.cubic);
const SPRING_BACK = { damping: 30, stiffness: 300, mass: 1 };

// Матовая нижняя шторка. Неподвижная верхняя зона (полоска и заголовок) —
// область перетаскивания: она вынесена из списка, поэтому PanResponder
// надёжно владеет жестом на iOS, где JS-респондер не может отобрать жест
// у нативного ScrollView. Тело прокручивается отдельно.
export default function DraggableSheet({
  visible, onClose, children, title, maxHeightPct = 0.85,
  contentContainerStyle, keyboardAvoiding = false, scrollRef,
}) {
  const insets = useSafeAreaInsets();
  const { tint } = useAppearance();
  // Высота клавиатуры (только при keyboardAvoiding): шторку, поднятую над ней,
  // нельзя оставлять выше свободного места, иначе её верх уйдёт за экран.
  const [kbHeight, setKbHeight] = useState(0);
  const SHEET_MAX = kbHeight > 0
    ? Math.min(SCREEN_H * maxHeightPct, SCREEN_H - kbHeight - insets.top - SPACING.sm)
    : SCREEN_H * maxHeightPct;
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const lastY = useRef(0);
  // Modal остаётся смонтированным, пока шторка уезжает: если родитель закрыл её
  // сам (кнопка «Готово» без dismiss), анимация выхода всё равно проигрывается,
  // а не обрывается мгновенным скрытием Modal.
  const [mounted, setMounted] = useState(!!visible);
  const closing = useRef(false);
  const closedRef = useRef(!visible);
  const visibleRef = useRef(visible);
  const onCloseRef = useRef(onClose);
  // Подъём над клавиатурой. Первая попытка прибавляла высоту клавиатуры
  // к нижнему отступу — и шторка пропадала: у неё overflow hidden, коробка
  // становилась выше экрана, а содержимое прижато к её верху и уезжало
  // за верхнюю границу. Видимой оставалась одна пустая набивка.
  //
  // Правильно не растить коробку, а поднимать её целиком. Чтобы под ней
  // не открывалась полоса без фона, стекло продлено на EXTRA вниз:
  // отрицательный marginBottom опускает коробку, равный ему paddingBottom
  // возвращает содержимое на место.
  const kbLift = useRef(new Animated.Value(0)).current;
  // Сумма создаётся один раз: раньше Animated.add вызывался прямо в render, и
  // каждый ререндер (клавиатура, родитель) пересоздавал нативный узел и
  // перепривязывал transform на лету — отсюда рывки.
  const sheetY = useRef(Animated.add(translateY, kbLift)).current;

  useEffect(() => {
    if (!keyboardAvoiding) return undefined;
    // willShow на iOS приходит до начала анимации клавиатуры, поэтому
    // подъём идёт синхронно с ней, а не догоняет её.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const lift = (to, duration) => {
      Animated.timing(kbLift, {
        toValue: to, duration: duration || 250, useNativeDriver: true, isInteraction: false,
      }).start();
    };
    const show = Keyboard.addListener(showEvent, (e) => {
      lift(-(e.endCoordinates?.height || 0), e.duration);
      setKbHeight(e.endCoordinates?.height || 0);
    });
    const hide = Keyboard.addListener(hideEvent, (e) => { lift(0, e?.duration); setKbHeight(0); });
    return () => { show.remove(); hide.remove(); };
  }, [keyboardAvoiding, kbLift]);
  useEffect(() => { visibleRef.current = visible; onCloseRef.current = onClose; });

  // Уход шторки. Единый путь и для dismiss, и для закрытия родителем.
  const runExit = (ms, done) => {
    closing.current = true;
    // С поднятой клавиатурой шторка не уехала бы целиком: kbLift держит её выше.
    if (keyboardAvoiding) Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN_H, duration: ms,
        easing: OPEN_EASE, useNativeDriver: true, isInteraction: false }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: Math.min(ms, 200),
        useNativeDriver: true, isInteraction: false }),
    ]).start(({ finished }) => {
      // Прервано повторным открытием или пальцем на шапке: уход отменён,
      // иначе closing остался бы true, и шторку больше нельзя было бы закрыть.
      if (!finished) { closing.current = false; return; }
      closedRef.current = true;
      if (done) done();
      // Родитель уже закрыл шторку, пока она уезжала: теперь можно спрятать Modal
      if (!visibleRef.current) setMounted(false);
    });
  };

  // Выезд: сначала монтируем Modal с содержимым (шторка ещё за экраном) и
  // только через пару кадров запускаем анимацию. Тяжёлый первый рендер детей
  // так не попадает внутрь движения — раньше он съедал кадры.
  useEffect(() => {
    if (visible && !mounted) { setMounted(true); return undefined; }
    if (visible) {
      closing.current = false;
      closedRef.current = false;
      let raf2;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          Animated.parallel([
            Animated.timing(translateY, { toValue: 0, duration: OPEN_MS,
              easing: OPEN_EASE, useNativeDriver: true, isInteraction: false }),
            // Затемнение — отдельная opacity, не привязанная к движению шторки
            Animated.timing(backdropOpacity, { toValue: 1, duration: OPEN_MS - 40,
              easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
          ]).start();
        });
      });
      return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2); };
    }
    if (mounted) {
      // dismiss уже увёл шторку за экран и вызвал onClose — прячем Modal сразу
      if (closedRef.current) setMounted(false);
      else if (!closing.current) runExit(CLOSE_MS);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted]);

  const dismiss = (ms = CLOSE_MS) => {
    if (closing.current) return; // повторный тап по фону или «назад» во время ухода
    runExit(ms, () => onCloseRef.current && onCloseRef.current());
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (e, gs) => Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => { translateY.stopAnimation((v) => { dragStart.current = v; lastY.current = v; }); },
      onPanResponderMove: (e, gs) => {
        let y = dragStart.current + gs.dy;
        if (y < 0) y = y / 3; // rubber-band above the resting point
        lastY.current = y;
        translateY.setValue(y);
      },
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 100 || gs.vy > 0.6) {
          // Оставшийся путь короче — уходим быстрее, чтобы скорость не «ломалась»
          const left = Math.max(0, SCREEN_H - lastY.current) / (SCREEN_H * 0.6);
          dismiss(Math.round(Math.max(140, Math.min(CLOSE_MS, CLOSE_MS * left))));
        } else if (!visibleRef.current) {
          // Родитель уже закрыл шторку, а палец перехватил уход — доводим его.
          runExit(CLOSE_MS);
        } else {
          Animated.spring(translateY, { toValue: 0, velocity: gs.vy, useNativeDriver: true,
            isInteraction: false, ...SPRING_BACK }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Как и при отпускании: если родитель уже закрыл шторку — доводим уход.
        if (!visibleRef.current) { runExit(CLOSE_MS); return; }
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true,
          isInteraction: false, ...SPRING_BACK }).start();
      },
    })
  ).current;

  const base = 0.08;
  const rgb = tint || '150,200,225';
  const blurI = Math.round(34 + base * 120);

  const sheet = (
    <Animated.View
      style={[styles.sheetWrap,
        // Коробка опущена на EXTRA и на столько же добита отступом: стекло
        // уходит ниже края экрана, поэтому при подъёме над клавиатурой под
        // шторкой не открывается полоса без фона и без скругления.
        { maxHeight: SHEET_MAX + KEYBOARD_EXTRA,
          marginBottom: -KEYBOARD_EXTRA,
          paddingBottom: KEYBOARD_EXTRA + insets.bottom + SPACING.md,
          transform: [{ translateY: sheetY }] }]}>
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

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, contentContainerStyle]}>
        {children}
      </ScrollView>
    </Animated.View>
  );

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={() => dismiss()}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableWithoutFeedback onPress={() => dismiss()}>
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
