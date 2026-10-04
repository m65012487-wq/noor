import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Animated, Easing, Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '../components/ScreenWrapper';
import { TAB_ISLAND } from '../components/GlassTabBar';
import { COLORS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import useTasbih from './useTasbih';
import TasbihScreen from './TasbihScreen';
import { TWIG_ART } from './twigArt';

// Вход в «Сад тасбиха» — веточка без единой подписи. При открытии приложения
// она выпадает из-за правого края экрана, будто с дерева, что растёт рядом:
// входит, качнувшись, и тянется над таб-баром кончиком вверх — срез внизу у
// края, ветка растёт вверх-влево, как побег к свету, — чуть покачиваясь на ветру. Человек нажимает из любопытства и сам открывает сад. Веточка —
// плоский силуэт цвета схемы, как сцены на обоях; каждый раз другая (набор
// силуэтов Krea-2, twigArt.js).
//
// Слой лежит поверх всего экрана и касаний не забирает — ловит их только сама
// веточка. Движения — нативный драйвер, только transform и opacity.

// Ширина веточки на экране и предел высоты, в пунктах. Срез стебля уходит за
// край экрана на TUCK, чтобы не было видно, что ветка обрезана.
const TWIG_W = 136;
const TWIG_MAX_H = 84;
const TUCK = 8;
// Зазор между веточкой и верхом острова таб-бара.
const BAR_GAP = 8;
// Тише текста и иконок: веточка — часть обоев, а не кнопка.
const TWIG_OPACITY = 0.82;
// Если приложение пролежало в фоне дольше этого, веточка входит заново, другая.
const AWAY_MS = 5 * 60 * 1000;
// Экран успевает появиться, и ветка выпадает на глазах.
const ENTER_DELAY_MS = 600;
const ENTER_MS = 1500;
// Насколько ветка поднята: угол от горизонтали, кончиком вверх. Каждый вход —
// свой угол из этого диапазона: одинаково торчащая ветка выглядела бы как значок.
const RISE_MIN = 26;
const RISE_MAX = 38;
const SWAY_DEG = 1.8;
const SWAY_MS = 4600;
const BEAT_MS = 1800;
const EMBER = { size: 14, core: 3.4 };
const PRESS_IN = { toValue: 0.94, damping: 20, stiffness: 320, mass: 0.7 };
const PRESS_OUT = { toValue: 1, damping: 11, stiffness: 240, mass: 0.7 };

const SINE = Easing.inOut(Easing.sin);

function pingPong(value, from, to, halfMs) {
  return Animated.loop(Animated.sequence([
    Animated.timing(value, { toValue: to, duration: halfMs, easing: SINE, useNativeDriver: true, isInteraction: false }),
    Animated.timing(value, { toValue: from, duration: halfMs, easing: SINE, useNativeDriver: true, isInteraction: false }),
  ]));
}

// Размер веточки на экране (aspect — ширина к высоте).
function twigSize(art) {
  const h = Math.min(TWIG_W / art.aspect, TWIG_MAX_H);
  return { w: h * art.aspect, h };
}

// Тёплая точка у кончика: есть зёрна для посадки или невидимое выпадение.
const Ember = memo(function Ember({ reduceMotion }) {
  const [beat] = useState(() => new Animated.Value(0));
  const style = useMemo(() => ({
    opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
    transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) }],
  }), [beat]);
  useEffect(() => {
    if (reduceMotion) { beat.setValue(1); return undefined; }
    const loop = pingPong(beat, 0, 1, BEAT_MS / 2);
    loop.start();
    return () => loop.stop();
  }, [beat, reduceMotion]);
  const mid = EMBER.size / 2;
  return (
    <Animated.View pointerEvents="none" style={[styles.ember, style]}>
      <Svg width={EMBER.size} height={EMBER.size}>
        <Defs>
          <RadialGradient id="tasbihEmber" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={COLORS.ember} stopOpacity="0.55" />
            <Stop offset="0.5" stopColor={COLORS.ember} stopOpacity="0.28" />
            <Stop offset="1" stopColor={COLORS.ember} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={mid} cy={mid} r={mid} fill="url(#tasbihEmber)" />
        <Circle cx={mid} cy={mid} r={EMBER.core} fill={COLORS.ember} />
      </Svg>
    </Animated.View>
  );
});

// Значения анимации создаются один раз на вход.
function makeMotion() {
  return { enter: new Animated.Value(0), sway: new Animated.Value(0.5), press: new Animated.Value(1) };
}

// Ветер: 0.5 → 1 → 0 → 0.5. Петля начинается и кончается в середине, где ветка
// стоит ровно: Animated.loop перед каждым витком возвращает значение к
// стартовому, и петля 0 ↔ 1 со стартом в 0.5 дёргала бы ветку раз в виток.
function swayLoop(value) {
  const step = (to, ms) => Animated.timing(value, {
    toValue: to, duration: ms, easing: SINE, useNativeDriver: true, isInteraction: false,
  });
  return Animated.loop(Animated.sequence([step(1, SWAY_MS / 4), step(0, SWAY_MS / 2), step(0.5, SWAY_MS / 4)]));
}

// Веточка: вход и покачивание вокруг среза стебля у правого края. Вход — одна
// нативная анимация: ветка въезжает из-за края, опустив кончик, взмывает чуть
// выше своего угла, обратно и замирает. Потом её едва качает ветер. В RN
// положительный поворот — по часовой стрелке, и кончик слева от оси от него
// поднимается.
const Twig = memo(function Twig({ art, rise, place, accent, hasGift, enabled, reduceMotion, label, hint, onOpen }) {
  const [motion] = useState(makeMotion);
  const [landed, setLanded] = useState(false);
  const size = twigSize(art);
  // Срез — внизу у края, над таб-баром: ветка поднимается от него вверх.
  const a = (rise * Math.PI) / 180;
  const stemY = place.bottom - 0.5 * size.h * Math.cos(a);

  // isInteraction: false — иначе InteractionManager ждал бы конца входа.
  useEffect(() => {
    const { enter } = motion;
    enter.setValue(0);
    setLanded(false);
    let animation = null;
    const timer = setTimeout(() => {
      animation = Animated.timing(enter, {
        toValue: 1, duration: reduceMotion ? 300 : ENTER_MS, easing: Easing.linear,
        useNativeDriver: true, isInteraction: false,
      });
      animation.start(({ finished }) => { if (finished) setLanded(true); });
    }, reduceMotion ? 0 : ENTER_DELAY_MS);
    return () => { clearTimeout(timer); animation?.stop(); };
  }, [motion, reduceMotion]);

  useEffect(() => {
    if (!landed || reduceMotion) return undefined;
    const loop = swayLoop(motion.sway);
    loop.start();
    return () => loop.stop();
  }, [landed, reduceMotion, motion]);

  // Наклон входа и ветер складываются числами, а уже сумма переводится в
  // градусы: повторять один ключ transform дважды ненадёжно.
  const style = useMemo(() => {
    const { enter, sway, press } = motion;
    if (reduceMotion) return { opacity: enter, transform: [{ rotate: `${rise}deg` }, { scale: press }] };
    // Въезд из-за края за первые 45% входа, дальше затухающее качание.
    const input = [0, 0.45, 0.62, 0.78, 0.9, 1];
    const tilt = enter.interpolate({ inputRange: input, outputRange: [-40, -4, 6, -2.5, 1, 0].map(v => v + rise) });
    const swing = sway.interpolate({ inputRange: [0, 1], outputRange: [-SWAY_DEG, SWAY_DEG] });
    return {
      transform: [
        { translateX: enter.interpolate({ inputRange: [0, 0.45, 1], outputRange: [size.w * 0.85, 0, 0] }) },
        { rotate: Animated.add(tilt, swing).interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
        { scale: press },
      ],
    };
  }, [motion, reduceMotion, size.w, rise]);

  const pressTo = config => {
    if (reduceMotion) return;
    Animated.spring(motion.press, { ...config, useNativeDriver: true, isInteraction: false }).start();
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.twig, {
      width: size.w, height: size.h, left: place.right + TUCK - size.w, top: stemY - (size.h * art.stem) / 100,
      // Качается вокруг среза стебля; проценты целые — RN разбирает строку
      // transformOrigin регэкспом \d+(?:%|px).
      transformOrigin: `100% ${art.stem}%`,
    }, style]}>
      <Pressable onPress={() => { hapticLight(); onOpen(); }} disabled={!enabled}
        onPressIn={() => pressTo(PRESS_IN)} onPressOut={() => pressTo(PRESS_OUT)}
        hitSlop={8} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
        style={StyleSheet.absoluteFill}>
        {/* Силуэт белый с альфой: цвет даёт схема, как сценам на обоях. */}
        <Image source={art.source} resizeMode="contain"
          style={{ width: size.w, height: size.h, tintColor: accent, opacity: TWIG_OPACITY }} />
        {hasGift ? <Ember reduceMotion={reduceMotion} /> : null}
      </Pressable>
    </Animated.View>
  );
});

// Мемоизирован и без пропсов: обновляется только вместе с состоянием тасбиха,
// языком и схемой, а не с каждым тиком часов главного экрана.
export default memo(function TasbihEntry() {
  const { state, error } = useTasbih();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  // Модальное окно на iOS живёт в своём UIWindow, и внутри него отступы
  // безопасной зоны приходится передать явно — иначе шапка экрана лезет
  // под вырез.
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layer = useRef(null);
  const [frame, setFrame] = useState(null);
  const [entryKey, setEntryKey] = useState(0);
  const [entry, setEntry] = useState(null);

  // Положение слоя в окне: по нему считаем, где верх таб-бара и правый край.
  const measure = () => {
    layer.current?.measureInWindow((x, y, w, h) => {
      if (!w || !h) return;
      setFrame(prev => (prev && Math.abs(prev.y - y) < 0.5 && Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5
        ? prev : { y, w, h }));
    });
  };

  // Вернулись в приложение после долгой паузы — веточка входит заново, другая.
  useEffect(() => {
    let leftAt = null;
    const sub = AppState.addEventListener('change', status => {
      if (status === 'active') {
        if (leftAt != null && Date.now() - leftAt >= AWAY_MS) setEntryKey(k => k + 1);
        leftAt = null;
      } else if (leftAt == null) {
        leftAt = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  // Каждый вход — другая веточка (первая случайная, дальше сдвиг на 1…n-1) и
  // свой угол подъёма.
  useEffect(() => {
    setEntry(prev => {
      const index = !prev || TWIG_ART.length < 2 ? Math.floor(Math.random() * TWIG_ART.length)
        : (prev.index + 1 + Math.floor(Math.random() * (TWIG_ART.length - 1))) % TWIG_ART.length;
      return { key: entryKey, index, rise: RISE_MIN + Math.random() * (RISE_MAX - RISE_MIN) };
    });
  }, [entryKey]);

  const enabled = !!state || !!error;
  const place = useMemo(() => (frame ? {
    right: frame.w,
    bottom: height - insets.bottom - TAB_ISLAND.bottomGap - TAB_ISLAND.height - frame.y - BAR_GAP,
  } : null), [frame, height, insets.bottom]);
  const hasGift = !!state && (
    Object.values(state.seeds || {}).reduce((sum, n) => sum + n, 0) > 0 || (state.pendingDrops?.length ?? 0) > 0
  );
  const openGarden = useCallback(() => setOpen(true), []);
  const label = ru ? 'Сад тасбиха' : 'Tasbih garden';
  const hint = (ru ? 'Открывает счётчик зикра и дерево' : 'Opens the dhikr counter and the tree')
    + (hasGift ? (ru ? '. Есть зёрна для посадки.' : '. Seeds are ready to plant.') : '');

  return (
    <View ref={layer} onLayout={measure} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Новый вход — новый экземпляр: анимация стартует с нуля. Ждём, пока
          состояние прочитано и слой измерен, чтобы ветка вошла один раз. */}
      {enabled && place && entry ? (
        <Twig key={entry.key} art={TWIG_ART[entry.index]} rise={entry.rise} place={place} accent={accent} hasGift={hasGift}
          enabled={enabled} reduceMotion={reduceMotion} label={label} hint={hint} onOpen={openGarden} />
      ) : null}

      <Modal visible={open} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
          <TasbihScreen onClose={() => setOpen(false)} />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
});

// Сколько места снизу прокрутки занимает основание веточки у края: главный
// экран добавляет это к отступу под таб-бар, чтобы последняя строка поднималась
// выше. Поднятый кончик лежит поверх прокрутки — он лишь украшение у правого края.
export const ENTRY_CLEARANCE = Math.round(TWIG_MAX_H * 0.6 + BAR_GAP);

const styles = StyleSheet.create({
  twig: { position: 'absolute' },
  ember: { position: 'absolute', left: 2, top: -6, width: EMBER.size, height: EMBER.size },
});
