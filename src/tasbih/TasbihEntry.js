import React, { memo, useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '../components/ScreenWrapper';
import { COLORS, SPACING } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import useTasbih from './useTasbih';
import TasbihScreen from './TasbihScreen';

// Вход в «Сад тасбиха» с главного экрана — листок без единой подписи: человек
// нажимает из любопытства и сам открывает сад. Лист нарисован в SVG цветом
// схемы, как силуэты деревьев: левая половина плотнее правой. Позади него мягкое
// свечение. В покое лист живёт: качается на «ветру», парит, свечение дышит,
// изредка на листе вспыхивает росинка. Анимации на нативном драйвере и только
// transform/opacity (петли туда-обратно RN перезапускает из JS раз в полупериод). Петли запускаются один раз и не зависят от перерисовок:
// главный экран обновляется каждую секунду (часы), поэтому лист и его части
// лежат в memo и получают только примитивы.

// Рисунок листа задан в координатах холста 44×58 (VB) и выводится в K раз
// крупнее: в натуральную величину листок выходил мелким и легко терялся.
// Зона нажатия чуть больше рисунка; свечение — круг шире зоны нажатия, оно
// выступает за неё, но ничего не ловит и не сдвигает.
const VB_W = 44;
const VB_H = 58;
const K = 1.3;
const LEAF_W = VB_W * K;
const LEAF_H = VB_H * K;
const HIT_W = 80;
const HIT_H = 90;
const GLOW_R = 56;

// Форма в координатах холста листа. Основание (22; 48,5), кончик (33; 2,5):
// ось изогнута к кончику, контур слегка несимметричен — левая половина полнее
// правой. Половины делит срединная жилка.
const STEM = 'M22 48.5C22.2 52.6 20.6 55.2 18.6 57.2';
const BLADE_LEFT = 'M22 48.5C18.5 39.7 8.1 40 9.2 27.5C13.8 12 23.1 13.8 33 2.5C25.6 17.7 22.5 33.3 22 48.5Z';
const BLADE_RIGHT = 'M22 48.5C25.4 39.6 33.1 39 34.4 26.5C39 11.5 30.5 13.5 33 2.5C25.6 17.7 22.5 33.3 22 48.5Z';
const RIB = 'M22 48.5C22.4 34.8 25 20.8 30.9 7.1';
// Четыре пары боковых жилок снизу вверх; правая жилка пары чуть выше левой,
// как на настоящем листе.
const VEINS = [
  'M22.1 40.7Q16.5 37.4 12.6 31.5', 'M22.1 39.3Q26.8 36 30.8 30.1',
  'M22.5 32.9Q16.8 29.7 13.6 24.1', 'M22.7 31.5Q27.9 28.3 32.2 22.7',
  'M23.7 25Q19.1 22.2 17.4 17.2', 'M24 23.7Q28.6 20.8 32.5 15.8',
  'M25.6 17.7Q23.4 15.4 23.8 11.2', 'M26.1 16.3Q29 14 31.5 9.9',
].join('');
// Качается лист вокруг основания черешка — это конец STEM (18,6; 57,2).
// Проценты для transformOrigin округлены до целых.
const PIVOT = `${Math.round((18.6 / VB_W) * 100)}% ${Math.round((57.2 / VB_H) * 100)}%`;
// Росинка лежит на правой, менее плотной половине: на ней белый блик заметнее.
const DEW = { x: 31.5, y: 17.5, size: 12 };
// Тёплая точка правее кончика листа.
const EMBER = { x: 37.5, y: 7, size: 14, core: 3.4 };

// Движение. Качание и парение идут с разными периодами, чтобы не совпадать в такт.
const SWAY_DEG = 5;
const SWAY_MS = 3800;
const DRIFT_PX = 2;
const DRIFT_MS = 5200;
const GLOW_LOW = 0.55;
const GLOW_HIGH = 0.9;
const GLOW_STILL = (GLOW_LOW + GLOW_HIGH) / 2;
const GLOW_MS = 4400;
const BEAT_MS = 1800;
// Пауза до росинки плюс сама вспышка в 900 мс: росинка раз в 7–9 секунд.
const DEW_GAP_MS = 6100;
const DEW_GAP_SPAN_MS = 2000;
const DEW_UP_MS = 360;
const DEW_DOWN_MS = 540;
const DEW_PEAK = 0.9;
// Нажатие: лист вжимается и возвращается с лёгким пружинным отскоком.
const PRESS_IN = { toValue: 0.88, damping: 20, stiffness: 320, mass: 0.7 };
const PRESS_OUT = { toValue: 1, damping: 11, stiffness: 240, mass: 0.7 };

// Туда-обратно по синусоиде: Easing.inOut(sin) в обе стороны даёт плавное
// качание без рывков на краях. Значение должно стартовать с from: на нём петля
// сбрасывается перед каждым кругом.
const SINE = Easing.inOut(Easing.sin);
function pingPong(value, from, to, halfMs) {
  return Animated.loop(Animated.sequence([
    Animated.timing(value, { toValue: to, duration: halfMs, easing: SINE, useNativeDriver: true }),
    Animated.timing(value, { toValue: from, duration: halfMs, easing: SINE, useNativeDriver: true }),
  ]));
}

// Свечение за листом: дышит прозрачностью слоя, а сам градиент неподвижен.
const LeafGlow = memo(function LeafGlow({ accent, reduceMotion }) {
  const [breath] = useState(() => new Animated.Value(GLOW_LOW));
  useEffect(() => {
    if (reduceMotion) { breath.setValue(GLOW_STILL); return undefined; }
    const loop = pingPong(breath, GLOW_LOW, GLOW_HIGH, GLOW_MS / 2);
    loop.start();
    return () => loop.stop();
  }, [breath, reduceMotion]);
  return (
    <Animated.View pointerEvents="none" style={[styles.glow, { opacity: breath }]}>
      <Svg width={GLOW_R * 2} height={GLOW_R * 2}>
        <Defs>
          <RadialGradient id="tasbihLeafGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={accent} stopOpacity="0.28" />
            <Stop offset="0.4" stopColor={accent} stopOpacity="0.15" />
            <Stop offset="0.7" stopColor={accent} stopOpacity="0.05" />
            <Stop offset="1" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW_R} cy={GLOW_R} r={GLOW_R} fill="url(#tasbihLeafGlow)" />
      </Svg>
    </Animated.View>
  );
});

// Сам рисунок листа, без движения. ink — нижний цвет фона схемы: жилки им
// получаются «своими» на любой схеме, а не чужой серой линией.
const LeafArt = memo(function LeafArt({ accent, ink }) {
  return (
    <Svg width={LEAF_W} height={LEAF_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Path d={STEM} stroke={accent} strokeOpacity={0.95} strokeWidth={1.9} strokeLinecap="round" fill="none" />
      <Path d={BLADE_LEFT} fill={accent} fillOpacity={0.95} />
      <Path d={BLADE_RIGHT} fill={accent} fillOpacity={0.7} />
      <Path d={RIB} stroke={ink} strokeOpacity={0.5} strokeWidth={1} fill="none" />
      <Path d={VEINS} stroke={ink} strokeOpacity={0.42} strokeWidth={0.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
});

// Росинка: раз в 7–9 секунд на листе вспыхивает белый блик. Монтируется только
// когда движение разрешено, поэтому «Уменьшение движения» оставляет лист без бликов.
const Dew = memo(function Dew() {
  const [glint] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let alive = true;
    let current = null;
    let timer = null;
    // Паузу каждый раз выбираем заново: ровный счёт выглядел бы как мигалка.
    // Пауза — обычный таймер, а не Animated.delay: тот идёт на JS-драйвере и
    // всю паузу держит открытым InteractionManager, откладывая чужие задачи.
    const next = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        current = Animated.sequence([
          Animated.timing(glint, { toValue: DEW_PEAK, duration: DEW_UP_MS, easing: SINE, useNativeDriver: true }),
          Animated.timing(glint, { toValue: 0, duration: DEW_DOWN_MS, easing: SINE, useNativeDriver: true }),
        ]);
        current.start(({ finished }) => { if (alive && finished) next(); });
      }, DEW_GAP_MS + Math.random() * DEW_GAP_SPAN_MS);
    };
    next();
    return () => { alive = false; clearTimeout(timer); current?.stop(); glint.setValue(0); };
  }, [glint]);
  const mid = DEW.size / 2;
  return (
    <Animated.View pointerEvents="none" style={[styles.dew, { opacity: glint }]}>
      <Svg width={DEW.size} height={DEW.size}>
        <Defs>
          <RadialGradient id="tasbihDew" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={COLORS.white} stopOpacity="0.95" />
            <Stop offset="0.3" stopColor={COLORS.white} stopOpacity="0.55" />
            <Stop offset="1" stopColor={COLORS.white} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={mid} cy={mid} r={mid} fill="url(#tasbihDew)" />
        <Path d={`M${mid - 3.4} ${mid}H${mid + 3.4}M${mid} ${mid - 3.4}V${mid + 3.4}`}
          stroke={COLORS.white} strokeOpacity={0.85} strokeWidth={0.6} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
});

// Тёплая точка: у человека есть зёрна для посадки или невидимое выпадение.
// Мягко пульсирует; при «Уменьшении движения» стоит на месте.
function makeEmber() {
  const beat = new Animated.Value(0);
  return {
    beat,
    style: {
      opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
      transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) }],
    },
  };
}
const Ember = memo(function Ember({ reduceMotion }) {
  const [{ beat, style }] = useState(makeEmber);
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

// Покачивание — поворот ±5° вокруг основания черешка, парение — сдвиг по
// вертикали на ±2. Интерполяции собраны один раз: пересоздавать нативные узлы
// при каждой перерисовке незачем.
function makeSway() {
  const sway = new Animated.Value(0);
  const drift = new Animated.Value(0);
  return {
    sway, drift,
    style: {
      transform: [
        { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [DRIFT_PX, -DRIFT_PX] }) },
        { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: [`${-SWAY_DEG}deg`, `${SWAY_DEG}deg`] }) },
      ],
    },
  };
}

// Лист целиком: рисунок, росинка и точка качаются вместе. Мемоизирован, пропсы —
// примитивы: перерисовки главного экрана не должны перезапускать петли.
const GardenLeaf = memo(function GardenLeaf({ accent, ink, hasGift, reduceMotion }) {
  const [{ sway, drift, style }] = useState(makeSway);
  useEffect(() => {
    // Лист в покое — ровно, без поворота и сдвига (середина обоих диапазонов).
    if (reduceMotion) { sway.setValue(0.5); drift.setValue(0.5); return undefined; }
    const loops = [pingPong(sway, 0, 1, SWAY_MS / 2), pingPong(drift, 0, 1, DRIFT_MS / 2)];
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [sway, drift, reduceMotion]);
  return (
    <Animated.View pointerEvents="none" style={[styles.leaf, style]}>
      <LeafArt accent={accent} ink={ink} />
      {reduceMotion ? null : <Dew />}
      {hasGift ? <Ember reduceMotion={reduceMotion} /> : null}
    </Animated.View>
  );
});

// Значение нажатия и его стиль собираются один раз.
function makePress() {
  const scale = new Animated.Value(1);
  return { scale, style: { transform: [{ scale }] } };
}

// Мемоизирован: главный экран перерисовывается каждую секунду, а у входа нет
// пропсов — он обновляется только вместе с состоянием тасбиха, языком и схемой.
export default memo(function TasbihEntry() {
  const { state, error } = useTasbih();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent, schemeColors } = useAppearance();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  // Модальное окно на iOS живёт в своём UIWindow, и внутри него отступы
  // безопасной зоны приходится передать явно — иначе шапка экрана лезет
  // под вырез.
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Только нативный драйвер: у значения нет ни одной JS-анимации, а
  // анимируется один transform.
  const [press] = useState(makePress);
  const pressTo = config => {
    if (reduceMotion) return;
    Animated.spring(press.scale, { ...config, useNativeDriver: true }).start();
  };

  // Непосаженные зёрна или выпадение, о котором человек ещё не узнал. Строго
  // булево значение: число вне <Text> (0 из `n && …`) на iOS роняет экран.
  const hasGift = !!state && (
    Object.values(state.seeds || {}).reduce((sum, n) => sum + n, 0) > 0 || (state.pendingDrops?.length ?? 0) > 0
  );
  // Пока состояние не загрузилось и нет ошибки, лист приглушён и не нажимается.
  // С ошибкой нажатие открывает экран, где её можно повторить.
  const enabled = !!state || !!error;
  const label = ru ? 'Сад тасбиха' : 'Tasbih garden';
  const hint = (ru ? 'Открывает счётчик зикра и дерево' : 'Opens the dhikr counter and the tree')
    + (hasGift ? (ru ? '. Есть зёрна для посадки.' : '. Seeds are ready to plant.') : '');

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => { hapticLight(); setOpen(true); }} disabled={!enabled}
        onPressIn={() => pressTo(PRESS_IN)} onPressOut={() => pressTo(PRESS_OUT)}
        accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
        style={[styles.hit, !enabled && styles.waiting]}>
        {/* Вжимается рисунок, а не сама зона нажатия: иначе она сжималась бы
            вместе с ним и касание у края срывалось. */}
        <Animated.View pointerEvents="none" style={[styles.hit, press.style]}
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <LeafGlow accent={accent} reduceMotion={reduceMotion} />
          <GardenLeaf accent={accent} ink={schemeColors.bg[1]} hasGift={hasGift} reduceMotion={reduceMotion} />
        </Animated.View>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
          <TasbihScreen onClose={() => setOpen(false)} />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  // Листок по центру колонки; отступы сверху и снизу — SPACING.md. Свечение
  // (круг Ø112) выходит за зону нажатия 80×90 на 11 пунктов сверху и снизу —
  // меньше отступа, так что до соседей не дотягивается.
  wrap: { alignSelf: 'center', marginVertical: SPACING.md },
  hit: { width: HIT_W, height: HIT_H },
  waiting: { opacity: 0.5 },
  glow: {
    position: 'absolute', width: GLOW_R * 2, height: GLOW_R * 2,
    left: HIT_W / 2 - GLOW_R, top: HIT_H / 2 - GLOW_R,
  },
  leaf: {
    position: 'absolute', width: LEAF_W, height: LEAF_H,
    left: (HIT_W - LEAF_W) / 2, top: (HIT_H - LEAF_H) / 2,
    transformOrigin: PIVOT,
  },
  // Росинка и точка заданы в координатах холста листа — переводим в пункты.
  dew: {
    position: 'absolute', width: DEW.size, height: DEW.size,
    left: DEW.x * K - DEW.size / 2, top: DEW.y * K - DEW.size / 2,
  },
  ember: {
    position: 'absolute', width: EMBER.size, height: EMBER.size,
    left: EMBER.x * K - EMBER.size / 2, top: EMBER.y * K - EMBER.size / 2,
  },
});
