import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Animated, Easing, Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '../components/ScreenWrapper';
import { TAB_ISLAND } from '../components/GlassTabBar';
import { COLORS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import useTasbih from './useTasbih';
import TasbihScreen from './TasbihScreen';
import { activeTree } from './model';
import { LEAF_ART } from './leafArt';

// Вход в «Сад тасбиха» — листок без единой подписи. При открытии приложения он
// срывается сверху, кружит в воздухе и ложится на таб-бар в случайном месте;
// человек нажимает из любопытства и сам открывает сад. Лист — с дерева,
// которое сейчас растёт (рисунок по породе, Krea-2). Лёжа он не замирает
// намертво: изредка его трогает ветер и на нём вспыхивает росинка.
//
// Слой лежит поверх всего экрана и касаний не забирает — ловит их только сам
// листок. Все движения — нативный драйвер, только transform и opacity; полёт
// рассчитывается заранее и проигрывается одной анимацией по ключевым кадрам.

// Размер листа задан площадью, а не длинной стороной: узкий лист оливы и
// широкий инжира тогда весят на экране одинаково. Длинная сторона — не больше
// LEAF_MAX. Зона нажатия — квадрат HIT, в пунктах.
const LEAF_AREA = 1300;
const LEAF_MAX = 60;
const HIT = 76;
const GLOW_R = 46;
// Зазор между листом и верхом острова и запас от его скруглённых концов.
const REST_GAP = 3;
const REST_EDGE = 30;
// Если приложение пролежало в фоне дольше этого, листок падает заново.
const AWAY_MS = 5 * 60 * 1000;
// Пауза перед падением: экран успевает появиться, и лист срывается на глазах.
const START_DELAY_MS = 450;
const SETTLE_MS = 700;
const SAMPLES = 72;

const GLOW_LOW = 0.55;
const GLOW_HIGH = 0.9;
const GLOW_MS = 4400;
const BEAT_MS = 1800;
const DEW = { x: 0.5, y: 0.42, size: 12 };
const DEW_GAP_MS = 6100;
const DEW_GAP_SPAN_MS = 2400;
const DEW_UP_MS = 360;
const DEW_DOWN_MS = 540;
const DEW_PEAK = 0.9;
// Порыв ветра: лист приподнимается и покачивается. Раз в 9–15 секунд.
const GUST_GAP_MS = 9000;
const GUST_GAP_SPAN_MS = 6000;
const GUST_MS = 1100;
const EMBER = { size: 14, core: 3.4 };
const PRESS_IN = { toValue: 0.88, damping: 20, stiffness: 320, mass: 0.7 };
const PRESS_OUT = { toValue: 1, damping: 11, stiffness: 240, mass: 0.7 };

const SINE = Easing.inOut(Easing.sin);
const rad = deg => (deg * Math.PI) / 180;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round4 = v => Math.round(v * 10000) / 10000;
const smooth = p => p * p * (3 - 2 * p);

function pingPong(value, from, to, halfMs) {
  return Animated.loop(Animated.sequence([
    Animated.timing(value, { toValue: to, duration: halfMs, easing: SINE, useNativeDriver: true, isInteraction: false }),
    Animated.timing(value, { toValue: from, duration: halfMs, easing: SINE, useNativeDriver: true, isInteraction: false }),
  ]));
}

// Размер рисунка на экране (aspect — ширина к высоте).
function leafSize(art) {
  const h = Math.sqrt(LEAF_AREA / art.aspect);
  const w = h * art.aspect;
  const k = Math.min(1, LEAF_MAX / Math.max(w, h));
  return { w: w * k, h: h * k };
}

// Где лист ляжет. Рисунок стоит черенком вниз; лёжа он повёрнут поперёк —
// кончиком вправо или влево, с разбросом. Высоту лежащего листа считаем как у
// эллипса с полуосями рисунка: по габаритной рамке повёрнутого прямоугольника
// лист «висел» бы над островом на диагональных углах.
function planRest(width, barTop, size) {
  const islandW = Math.min(width - TAB_ISLAND.sideGap * 2, TAB_ISLAND.maxWidth);
  const left = (width - islandW) / 2;
  const rot = (Math.random() < 0.5 ? -1 : 1) * rand(66, 114);
  const a = size.h / 2;
  const b = size.w / 2;
  const s = Math.sin(rad(rot));
  const c = Math.cos(rad(rot));
  const halfH = Math.sqrt(a * a * c * c + b * b * s * s);
  const halfW = Math.sqrt(a * a * s * s + b * b * c * c);
  const lo = left + REST_EDGE + halfW;
  const hi = left + islandW - REST_EDGE - halfW;
  return { x: hi > lo ? rand(lo, hi) : width / 2, y: barTop - REST_GAP - halfH, rot, halfW, halfH, barTop };
}

// Полёт падающего листа: маятник. Лист качается из стороны в сторону, в
// крайних точках чуть взмывает и наклоняется по ходу дуги, а через середину
// проходит быстрее и ниже — так падают настоящие листья. Размах растёт после
// отрыва и сходит на нет к земле, поэтому лист садится точно в выбранное место.
// Вдобавок он медленно доворачивается к позе, в которой ляжет. После касания —
// короткое затухающее покачивание.
function planFall(width, startY, rest, reduceMotion) {
  // Без движения лист не падает, а проявляется на месте за 300 мс.
  if (reduceMotion) {
    return { rest, total: 300, input: [0, 1], x: [0, 0], y: [0, 0], rot: [rest.rot, rest.rot], show: [[0, 1], [0, 1]] };
  }
  const swings = [2, 2.5, 3][Math.floor(Math.random() * 3)];
  const amp = rand(34, 56);
  const x0 = clamp(rest.x + rand(-0.35, 0.35) * width, LEAF_MAX, width - LEAF_MAX);
  const drop = rest.y - startY;
  const fallMs = clamp(drop * 5.4, 3000, 4600);
  const total = fallMs + SETTLE_MS;
  const spin = rand(-160, 160);
  const tilt = rand(20, 32);
  const input = [];
  const x = [];
  const y = [];
  const rot = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const p = i / SAMPLES;
    const theta = 2 * Math.PI * swings * p;
    const env = Math.sqrt(4 * p * (1 - p));
    const sway = Math.sin(theta);
    const cx = x0 + (rest.x - x0) * smooth(p);
    const px = clamp(cx + amp * env * sway, LEAF_MAX / 2, width - LEAF_MAX / 2);
    const py = startY + drop * (0.5 * p + 0.5 * smooth(p)) - 0.32 * amp * env * sway * sway;
    input.push(round4((p * fallMs) / total));
    x.push(px - rest.x);
    y.push(py - rest.y);
    rot.push(rest.rot + spin * (1 - p) ** 1.6 - tilt * env * sway);
  }
  [-5, 3, -1.2, 0].forEach((deg, k, list) => {
    input.push(round4((fallMs + (SETTLE_MS * (k + 1)) / list.length) / total));
    x.push(0);
    y.push(0);
    rot.push(rest.rot + deg);
  });
  // show — когда проступают свечение и тень: к моменту касания и после.
  const landAt = round4(fallMs / total);
  return { rest, total, input, x, y, rot, show: [[0, Math.max(0.001, round4(landAt - 0.1)), landAt, 1], [0, 0, 0.6, 1]] };
}

// Свечение позади лежащего листа — приглашение нажать. Дышит прозрачностью.
const LeafGlow = memo(function LeafGlow({ accent, reduceMotion, appear }) {
  const [breath] = useState(() => new Animated.Value(GLOW_LOW));
  useEffect(() => {
    if (reduceMotion) { breath.setValue((GLOW_LOW + GLOW_HIGH) / 2); return undefined; }
    const loop = pingPong(breath, GLOW_LOW, GLOW_HIGH, GLOW_MS / 2);
    loop.start();
    return () => loop.stop();
  }, [breath, reduceMotion]);
  const opacity = useMemo(() => Animated.multiply(breath, appear), [breath, appear]);
  return (
    <Animated.View pointerEvents="none" style={[styles.glow, { opacity }]}>
      <Svg width={GLOW_R * 2} height={GLOW_R * 2}>
        <Defs>
          <RadialGradient id="tasbihLeafGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={accent} stopOpacity="0.3" />
            <Stop offset="0.45" stopColor={accent} stopOpacity="0.14" />
            <Stop offset="0.75" stopColor={accent} stopOpacity="0.04" />
            <Stop offset="1" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW_R} cy={GLOW_R} r={GLOW_R} fill="url(#tasbihLeafGlow)" />
      </Svg>
    </Animated.View>
  );
});

// Повторяющееся событие со случайной паузой: росинка и порыв ветра. Пауза —
// setTimeout, а не Animated.delay: тот идёт на JS-драйвере и всю паузу держит
// открытым InteractionManager.
function useRandomBeat(enabled, gap, span, make) {
  const makeRef = useRef(make);
  makeRef.current = make;
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    let timer = null;
    let current = null;
    const next = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        current = makeRef.current();
        current.start(({ finished }) => { if (alive && finished) next(); });
      }, gap + Math.random() * span);
    };
    next();
    return () => { alive = false; clearTimeout(timer); current?.stop(); };
  }, [enabled, gap, span]);
}

const Dew = memo(function Dew({ size }) {
  const [glint] = useState(() => new Animated.Value(0));
  useRandomBeat(true, DEW_GAP_MS, DEW_GAP_SPAN_MS, () => Animated.sequence([
    Animated.timing(glint, { toValue: DEW_PEAK, duration: DEW_UP_MS, easing: SINE, useNativeDriver: true, isInteraction: false }),
    Animated.timing(glint, { toValue: 0, duration: DEW_DOWN_MS, easing: SINE, useNativeDriver: true, isInteraction: false }),
  ]));
  const mid = DEW.size / 2;
  return (
    <Animated.View pointerEvents="none" style={[styles.dew, {
      left: size.w * DEW.x - mid, top: size.h * DEW.y - mid, opacity: glint,
    }]}>
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

// Тёплая точка над листом: есть зёрна для посадки или невидимое выпадение.
const Ember = memo(function Ember({ reduceMotion, left, top }) {
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
    <Animated.View pointerEvents="none" style={[styles.ember, { left, top }, style]}>
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

// Анимационные значения листа создаются один раз.
function makeMotion() {
  return { fall: new Animated.Value(0), gust: new Animated.Value(0), press: new Animated.Value(1) };
}

// Падающий и лежащий лист. Пропсы — примитивы и стабильные объекты: главный
// экран перерисовывается каждую секунду (часы), и петли не должны
// перезапускаться.
const FallingLeaf = memo(function FallingLeaf({ plan, art, accent, hasGift, enabled, reduceMotion, label, hint, onOpen }) {
  const [motion] = useState(makeMotion);
  const [landed, setLanded] = useState(false);
  const size = leafSize(art);
  const { rest } = plan;

  // Весь полёт, посадка и проявление свечения — одна нативная анимация.
  // isInteraction: false — иначе InteractionManager ждал бы конца полёта,
  // откладывая чужие задачи старта на пять секунд.
  useEffect(() => {
    const { fall, gust } = motion;
    setLanded(false);
    fall.setValue(0);
    gust.setValue(0);
    let animation = null;
    const timer = setTimeout(() => {
      animation = Animated.timing(fall, {
        toValue: 1, duration: plan.total, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
      });
      animation.start(({ finished }) => { if (finished) setLanded(true); });
    }, reduceMotion ? 0 : START_DELAY_MS);
    return () => { clearTimeout(timer); animation?.stop(); };
  }, [plan, motion, reduceMotion]);

  // Ветер трогает только лежащий лист.
  useRandomBeat(landed && !reduceMotion, GUST_GAP_MS, GUST_GAP_SPAN_MS, () => {
    motion.gust.setValue(0);
    return Animated.timing(motion.gust, {
      toValue: 1, duration: GUST_MS, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    });
  });

  // Порыв ветра и полёт складываются числами, а уже сумма переводится в
  // градусы: повторять один ключ transform дважды ненадёжно.
  const styleFor = useMemo(() => {
    const { fall, gust, press } = motion;
    const frames = out => fall.interpolate({ inputRange: plan.input, outputRange: out.map(round4) });
    const gustIn = [0, 0.25, 0.55, 0.8, 1];
    const gustY = gust.interpolate({ inputRange: gustIn, outputRange: [0, -4, -0.5, -1.5, 0] });
    const gustRot = gust.interpolate({ inputRange: gustIn, outputRange: [0, -7, 4, -1.5, 0] });
    const show = fall.interpolate({ inputRange: plan.show[0], outputRange: plan.show[1] });
    const rotate = Animated.add(frames(plan.rot), gustRot)
      .interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] });
    return {
      show,
      // Лист в полёте виден целиком; без движения — проявляется на месте.
      mover: {
        opacity: reduceMotion ? show : 1,
        transform: [{ translateX: frames(plan.x) }, { translateY: Animated.add(frames(plan.y), gustY) }],
      },
      leaf: { transform: [{ rotate }, { scale: press }] },
      shadow: { opacity: Animated.multiply(show, 0.3) },
    };
  }, [motion, plan, reduceMotion]);

  const pressTo = config => {
    if (reduceMotion) return;
    Animated.spring(motion.press, { ...config, useNativeDriver: true, isInteraction: false }).start();
  };

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.shadow, {
        left: rest.x - rest.halfW * 0.9, top: rest.barTop - 4, width: rest.halfW * 1.8,
      }, styleFor.shadow]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 8" preserveAspectRatio="none">
          <Ellipse cx={50} cy={4} rx={50} ry={4} fill="#000" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="box-none"
        style={[styles.mover, { left: rest.x - HIT / 2, top: rest.y - HIT / 2 }, styleFor.mover]}>
        <Pressable onPress={() => { hapticLight(); onOpen(); }} disabled={!enabled}
          onPressIn={() => pressTo(PRESS_IN)} onPressOut={() => pressTo(PRESS_OUT)}
          accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
          style={styles.hit}>
          <View pointerEvents="none" style={styles.hit}
            accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <LeafGlow accent={accent} reduceMotion={reduceMotion} appear={styleFor.show} />
            <Animated.View style={[styles.leaf, {
              width: size.w, height: size.h, left: (HIT - size.w) / 2, top: (HIT - size.h) / 2,
            }, styleFor.leaf]}>
              <Image source={art.source} style={{ width: size.w, height: size.h }} resizeMode="contain" />
              {reduceMotion ? null : <Dew size={size} />}
            </Animated.View>
            {hasGift ? (
              <Ember reduceMotion={reduceMotion}
                left={HIT / 2 + rest.halfW * 0.55 - EMBER.size / 2} top={HIT / 2 - rest.halfH - 4 - EMBER.size / 2} />
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </>
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
  const [fallKey, setFallKey] = useState(0);
  const [plan, setPlan] = useState(null);

  // Положение слоя в окне: по нему считаем, где верх таб-бара и край экрана.
  const measure = () => {
    layer.current?.measureInWindow((x, y, w, h) => {
      if (!w || !h) return;
      setFrame(prev => (prev && Math.abs(prev.y - y) < 0.5 && Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5
        ? prev : { y, w, h }));
    });
  };

  // Вернулись в приложение после долгой паузы — лист падает заново, на новое место.
  useEffect(() => {
    let leftAt = null;
    const sub = AppState.addEventListener('change', status => {
      if (status === 'active') {
        if (leftAt != null && Date.now() - leftAt >= AWAY_MS) setFallKey(k => k + 1);
        leftAt = null;
      } else if (leftAt == null) {
        leftAt = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  const tree = state ? activeTree(state) : null;
  const art = LEAF_ART[tree?.species] || LEAF_ART.olive;
  const enabled = !!state || !!error;
  const size = useMemo(() => leafSize(art), [art]);

  // Новый полёт: при первом появлении (когда состояние прочитано и слой
  // измерен) и после долгой паузы. Смена породы или размеров окна лист не
  // роняет заново — он остаётся там, где лежит. Системный флаг «Уменьшение
  // движения» приходит асинхронно: если он сменился, план пересчитывается.
  const ready = enabled && !!frame;
  const planned = useRef(null);
  useEffect(() => {
    const key = `${fallKey}:${reduceMotion}`;
    if (!ready || planned.current === key) return;
    planned.current = key;
    const barTop = height - insets.bottom - TAB_ISLAND.bottomGap - TAB_ISLAND.height - frame.y;
    const rest = planRest(frame.w, barTop, size);
    setPlan(planFall(frame.w, -frame.y - LEAF_MAX, rest, reduceMotion));
  }, [ready, fallKey, frame, height, insets.bottom, size, reduceMotion]);

  const hasGift = !!state && (
    Object.values(state.seeds || {}).reduce((sum, n) => sum + n, 0) > 0 || (state.pendingDrops?.length ?? 0) > 0
  );
  const openGarden = useCallback(() => setOpen(true), []);
  const label = ru ? 'Сад тасбиха' : 'Tasbih garden';
  const hint = (ru ? 'Открывает счётчик зикра и дерево' : 'Opens the dhikr counter and the tree')
    + (hasGift ? (ru ? '. Есть зёрна для посадки.' : '. Seeds are ready to plant.') : '');

  return (
    <View ref={layer} onLayout={measure} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Новый полёт — новый экземпляр: его значения анимации стартуют с нуля,
          и лист не мелькает на новом месте посадки до начала падения. */}
      {plan ? (
        <FallingLeaf key={fallKey} plan={plan} art={art} accent={accent} hasGift={hasGift} enabled={enabled}
          reduceMotion={reduceMotion} label={label} hint={hint} onOpen={openGarden} />
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

// Сколько места снизу прокрутки занимает лежащий лист: главный экран добавляет
// это к отступу под таб-бар, чтобы последняя строка поднималась выше листа.
// Лежащий лист не выше ~40 пунктов при любой породе (площадь LEAF_AREA).
export const LEAF_CLEARANCE = 44;

const styles = StyleSheet.create({
  mover: { position: 'absolute', width: HIT, height: HIT },
  hit: { width: HIT, height: HIT },
  glow: {
    position: 'absolute', width: GLOW_R * 2, height: GLOW_R * 2,
    left: HIT / 2 - GLOW_R, top: HIT / 2 - GLOW_R,
  },
  leaf: { position: 'absolute' },
  dew: { position: 'absolute', width: DEW.size, height: DEW.size },
  ember: { position: 'absolute', width: EMBER.size, height: EMBER.size },
  shadow: { position: 'absolute', height: 8 },
});
