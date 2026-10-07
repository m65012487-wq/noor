import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useReduceMotion, useScreenFocused } from './ScreenWrapper';
import { COLS, ROWS, Sprite, useSproutColors } from '../tasbih/sproutArt';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { COLORS, SPACING, RADIUS, TYPE } from '../constants/theme';

// Росток-спутник в обучении — тот же, что гуляет по таб-бару главного экрана.
// Он «говорит» объяснения (рот шевелится, пока появляется реплика), моргает и
// дышит, радуется верному ответу и пройденному уроку прыжками с салютом из
// пикселей, огорчается ошибке. Движения — нативный драйвер, только transform и
// opacity; смену кадров ведут таймеры. При «Уменьшении движения» прыжков и
// дыхания нет, остаются выражения лица.

const native = { useNativeDriver: true, isInteraction: false };
const tween = (value, toValue, duration, easing = Easing.out(Easing.quad)) =>
  Animated.timing(value, { toValue, duration, easing, ...native });

// Сколько «говорить» над репликой: примерно как она читается, но не дольше
// трёх секунд — рот, хлопающий без звука, дальше только отвлекает.
export function talkTime(text) {
  return Math.max(700, Math.min(3000, (text || '').length * 40));
}

// Прыжок: присед, взлёт, падение (Easing.in — как под тяжестью) и приземление
// с пружинкой. С искрами — ещё и салют из пикселей от макушки.
function jump(m, height, sparks) {
  const up = 110 + height * 5;
  const body = Animated.sequence([
    tween(m.sq, 1, 70),
    Animated.parallel([tween(m.y, -height, up), tween(m.sq, 0, up)]),
    tween(m.y, 0, up, Easing.in(Easing.quad)),
    tween(m.sq, 1, 60),
    tween(m.sq, 0, 120),
  ]);
  if (!sparks) return body;
  return Animated.parallel([
    body,
    Animated.sequence([tween(m.burst, 0, 0), tween(m.burst, 1, 760, Easing.out(Easing.cubic))]),
  ]);
}

// Приложение на экране. Вкладки остаются смонтированными после первого
// открытия, поэтому росток без этого дышал бы и прыгал за кадром.
function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

// Искры салюта: направление разлёта в долях размера ростка и цвет.
const SPARKS = [
  { dx: -1.0, dy: -0.9, c: 'L' }, { dx: 1.0, dy: -1.0, c: 'W' }, { dx: -1.5, dy: -0.2, c: 'W' },
  { dx: 1.5, dy: -0.3, c: 'L' }, { dx: -0.4, dy: -1.4, c: 'P' }, { dx: 0.5, dy: -1.35, c: 'L' },
];

// mood: 'idle' — стоит и дышит, 'happy' — радуется, 'sad' — огорчён.
// talkKey — смена реплики: росток «проговаривает» её talkMs миллисекунд.
// cheerKey — повод порадоваться заново (новый верный ответ, новый урок).
// hopKey — смена шага: один маленький подскок.
export const Sprout = memo(function Sprout({ mood = 'idle', talkKey, talkMs = 1200, cheerKey, hopKey, px = 3 }) {
  const colors = useSproutColors();
  const reduceMotion = useReduceMotion();
  // Вне экрана (другая вкладка, приложение в фоне) росток замирает целиком:
  // ни дыхания, ни моргания, ни прыжков.
  const focused = useScreenFocused();
  const appActive = useAppActive();
  const live = focused && appActive;
  const [m] = useState(() => ({
    y: new Animated.Value(0), sq: new Animated.Value(0),
    breath: new Animated.Value(0), burst: new Animated.Value(0),
  }));
  const [mouth, setMouth] = useState(null);
  const [blink, setBlink] = useState(false);
  const [tapKey, setTapKey] = useState(0);
  const hop = useRef(null);
  const lastHop = useRef(hopKey);
  const W = COLS * px;
  const H = ROWS * px;

  // Реплика сменилась — рот шевелится, пока её читают.
  useEffect(() => {
    if (talkKey === undefined || talkKey === null) return undefined;
    const beats = ['talk', 'talkHalf', 'talk', null, 'talkHalf', 'talk', 'talkHalf', null];
    let i = 0;
    const flap = setInterval(() => { setMouth(beats[i % beats.length]); i += 1; }, 120);
    const stop = setTimeout(() => { clearInterval(flap); setMouth(null); }, talkMs);
    return () => { clearInterval(flap); clearTimeout(stop); setMouth(null); };
  }, [talkKey, talkMs]);

  // Моргает раз в несколько секунд; радостные глаза-дуги и так закрыты.
  useEffect(() => {
    if (mood === 'happy' || !live) return undefined;
    let timer = null;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => { setBlink(false); schedule(); }, 140);
      }, 2500 + Math.random() * 3000);
    };
    schedule();
    return () => { clearTimeout(timer); setBlink(false); };
  }, [mood, live]);

  // Дыхание: чуть шире и ниже — и обратно. Огорчённый дышит медленнее.
  useEffect(() => {
    if (reduceMotion || mood === 'happy' || !live) { m.breath.setValue(0); return undefined; }
    const half = mood === 'sad' ? 1400 : 900;
    // Петля начинается и кончается в нуле: Animated.loop перед витком
    // возвращает значение к стартовому.
    const loop = Animated.loop(Animated.sequence([
      tween(m.breath, 1, half, Easing.inOut(Easing.sin)),
      tween(m.breath, 0, half, Easing.inOut(Easing.sin)),
    ]));
    loop.start();
    return () => { loop.stop(); m.breath.setValue(0); };
  }, [mood, reduceMotion, live, m]);

  // Радость: три прыжка с салютом, дальше — подскок раз в пару секунд, пока
  // настроение не сменится. Нажатие на радостного ростка празднует заново.
  useEffect(() => {
    if (mood !== 'happy' || reduceMotion || !live) return undefined;
    let alive = true;
    let timer = null;
    let current = null;
    const run = (anim, then) => {
      current = anim;
      anim.start(({ finished }) => { if (finished && alive) then(); });
    };
    const again = () => {
      timer = setTimeout(() => run(jump(m, px * 4, Math.random() < 0.5), again), 2200 + Math.random() * 1600);
    };
    run(Animated.sequence([jump(m, px * 6, true), jump(m, px * 3.5, false), jump(m, px * 6, true)]), again);
    return () => {
      alive = false;
      clearTimeout(timer);
      current?.stop();
      m.y.setValue(0);
      m.sq.setValue(0);
      m.burst.setValue(0);
    };
  }, [mood, cheerKey, tapKey, reduceMotion, live, m, px]);

  // Новый шаг — маленький подскок, без салюта.
  useEffect(() => {
    if (lastHop.current === hopKey) return;
    lastHop.current = hopKey;
    if (reduceMotion || mood === 'happy') return;
    hop.current?.stop();
    hop.current = jump(m, px * 3, false);
    hop.current.start();
  }, [hopKey, reduceMotion, mood, m, px]);

  const tap = () => {
    hapticLight();
    if (reduceMotion) return;
    if (mood === 'happy') { setTapKey((k) => k + 1); return; }
    hop.current?.stop();
    hop.current = jump(m, px * 4, true);
    hop.current.start();
  };

  const bodyStyle = useMemo(() => ({
    transform: [
      { translateY: m.y },
      // Присед и дыхание перемножаются: повторять ключ scale в transform нельзя.
      { scaleX: Animated.multiply(
        m.sq.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }),
        m.breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })) },
      { scaleY: Animated.multiply(
        m.sq.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }),
        m.breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] })) },
    ],
  }), [m]);

  const spark = Math.max(3, Math.round(px * 1.5));
  const sparkStyles = useMemo(() => SPARKS.map((s) => ({
    opacity: m.burst.interpolate({ inputRange: [0, 0.1, 0.65, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateX: m.burst.interpolate({ inputRange: [0, 1], outputRange: [0, s.dx * W * 0.75] }) },
      { translateY: m.burst.interpolate({ inputRange: [0, 1], outputRange: [0, s.dy * H * 0.7] }) },
    ],
  })), [m, W, H]);

  const frame = mood === 'happy' ? 'happy'
    : mouth || (mood === 'sad' ? 'sad' : blink ? 'blink' : 'idle');

  return (
    <Pressable onPress={tap} hitSlop={8} accessible={false} style={{ width: W, height: H }}>
      {SPARKS.map((s, i) => (
        <Animated.View key={i} pointerEvents="none" style={[styles.spark, {
          width: spark, height: spark, left: (W - spark) / 2, top: H * 0.2, backgroundColor: colors[s.c],
        }, sparkStyles[i]]} />
      ))}
      <Animated.View style={[{ width: W, height: H }, styles.body, bodyStyle]}>
        <Sprite frame={frame} colors={colors} px={px} />
      </Animated.View>
    </Pressable>
  );
});

// Росток стоит на верхней кромке карточки (как на таб-баре) и «проговаривает»
// её содержимое. Сверху оставлено место под его рост.
export function SproutPerch({ children, side = 'left', px = 3, style, ...sprout }) {
  const H = ROWS * px;
  return (
    <View style={[{ marginTop: H }, style]}>
      {children}
      <View pointerEvents="box-none" style={[styles.perch, { top: -H, [side]: SPACING.lg }]}>
        <Sprout px={px} {...sprout} />
      </View>
    </View>
  );
}

// Росток и реплика в облачке рядом с ним — для коротких фраз: задание в
// проверке, похвала, приглашение к следующему шагу.
export function SproutSays({ text, mood = 'idle', talkKey, cheerKey, hopKey, px = 3, style }) {
  const { tint } = useAppearance();
  const fill = { backgroundColor: `rgba(${tint || '150,200,225'},0.14)` };
  return (
    <View style={[styles.says, style]}>
      <Sprout px={px} mood={mood} talkKey={talkKey === undefined ? text : talkKey}
        talkMs={talkTime(text)} cheerKey={cheerKey} hopKey={hopKey} />
      <View style={[styles.bubble, { marginLeft: px * 3 }, fill]}>
        {/* Хвостик облачка — две ступеньки «пикселей» ко рту ростка. */}
        <View style={[styles.tail, fill, { left: -px * 2, width: px * 2, height: px * 2, bottom: px * 3 }]} />
        <View style={[styles.tail, fill, { left: -px * 3, width: px, height: px, bottom: px * 3 }]} />
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { transformOrigin: '50% 100%' },
  spark: { position: 'absolute' },
  perch: { position: 'absolute' },
  says: { flexDirection: 'row', alignItems: 'flex-end' },
  bubble: { flexShrink: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tail: { position: 'absolute' },
  bubbleText: { ...TYPE.callout, color: COLORS.white, fontWeight: '600' },
});
