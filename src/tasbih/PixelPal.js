import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useReduceMotion } from '../components/ScreenWrapper';
import { TAB_ISLAND } from '../components/GlassTabBar';
import { COLORS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import useTasbih from './useTasbih';
import TasbihScreen from './TasbihScreen';

// Вход в «Сад тасбиха» — пиксельный росток-малыш без единой подписи. При
// открытии приложения он выпрыгивает из-за таб-бара, приземляется на его верхнюю
// кромку в случайном месте и дальше живёт: ходит по кромке, замирает, моргает,
// иногда подпрыгивает. Человек нажимает на него из любопытства и сам открывает
// сад. Рисунок — квадраты-«пиксели» цветов схемы: лист — accent, тело — tint,
// глаз — самый тёмный цвет фона.
//
// Слой лежит поверх всего экрана и касаний не забирает — ловит их только сам
// зверёк. Всё, что ниже верхней кромки таб-бара, обрезается: зверёк не виден,
// пока не выпрыгнул, и не перекрывает иконки. Движения — нативный драйвер, только
// transform и opacity; смену кадров и выбор следующего шага ведут таймеры.

// Пиксель в пунктах и размер кадра в пикселях.
const PX = 4;
const COLS = 12;
const ROWS = 13;
const SPRITE_W = COLS * PX;
const SPRITE_H = ROWS * PX;

// Кадры: '.' — пусто, 'L' — лист и стебель, 'B' — тело, 'W' — блик, 'E' — глаз.
// top — строка, с которой начинается кадр: в шаге-прыжке тело на пиксель выше.
const IDLE = [
  '.....LL.....',
  '....LLL.LL..',
  '......LLL...',
  '......L.....',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBWBBBBBBB.',
  '.BBEBBBBEBB.',
  '.BBEBBBBEBB.',
  '.BBBBBBBBBB.',
  '.BBBBBBBBBB.',
  '..BBBBBBBB..',
  '...B....B...',
];
const withRow = (rows, index, row) => rows.map((r, i) => (i === index ? row : r));
const FRAMES = {
  idle: { top: 0, rows: IDLE },
  // Шаг: ноги разведены.
  walkA: { top: 0, rows: withRow(IDLE, 12, '..B......B..') },
  // Шаг-прыжок: тело на пиксель выше, ноги сведены и вытянуты на два пикселя.
  walkB: { top: -1, rows: [...IDLE.slice(0, 12), '....B..B....', '....B..B....'] },
  // Моргание: на месте каждого глаза — короткая чёрточка вместо двух пикселей.
  blink: { top: 0, rows: withRow(withRow(IDLE, 7, '.BBBBBBBBBB.'), 8, '.BEEBBBBEEB.') },
  // Придавило: глаза зажмурены косыми чёрточками (> <), рот — удивлённое «о».
  squish: { top: 0, rows: withRow(withRow(withRow(IDLE, 7, '.BEBBBBBBEB.'), 8, '.BBEBBBBEBB.'), 10, '.BBBBEEBBBB.') },
};

// Строки сливаются в отрезки, а одинаковые отрезки подряд — в прямоугольники:
// вместо сотни View на кадр получается два-три десятка.
function buildRects({ top, rows }) {
  const open = new Map();
  const rects = [];
  rows.forEach((row, r) => {
    const y = top + r;
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w += 1;
      if (c !== '.') {
        const key = `${c}:${x}:${w}`;
        const prev = open.get(key);
        if (prev && prev.y + prev.h === y) {
          prev.h += 1;
        } else {
          const rect = { c, x, y, w, h: 1 };
          open.set(key, rect);
          rects.push(rect);
        }
      }
      x += w;
    }
  });
  return rects;
}
const RECTS = Object.fromEntries(Object.entries(FRAMES).map(([name, def]) => [name, buildRects(def)]));

// Ходьба и повадки.
const STEP_MS = 1000 / 6;                // смена кадров ходьбы
const WALK_SPEED = 26;                   // пунктов в секунду
const WALK_MIN = 30;
const WALK_MAX = 110;
const BLINK_EVERY = [3000, 6000];
const BLINK_MS = 150;
const HOP_IDLE = 13;                     // высота прыжка на месте
const HOP_JOY = 22;                      // радостный прыжок после нажатия
// Вход: экран успевает появиться, и зверёк выпрыгивает на глазах.
const ENTER_DELAY_MS = 600;
const ENTER_PEAK = 46;
const HIDE_Y = SPRITE_H + 2;             // целиком ниже кромки
// Если приложение пролежало в фоне дольше этого, зверёк входит заново.
const AWAY_MS = 5 * 60 * 1000;
// Верхняя кромка острова ровная только между его скруглёнными краями; ноги
// (пиксели 3…8 из 12) не должны выходить за эту часть.
const FOOT_L = 3 * PX;
const FOOT_R = 9 * PX;
const EDGE_MARGIN = 4;
const SHADOW = { w: 28, h: 6, opacity: 0.25 };
const EMBER_SIZE = 8;
const BEAT_MS = 1800;

const rand = (from, to) => from + Math.random() * (to - from);

function timing(value, toValue, duration, easing = Easing.linear) {
  return Animated.timing(value, { toValue, duration, easing, useNativeDriver: true, isInteraction: false });
}

// Значения анимации создаются один раз на вход. y — сдвиг вверх/вниз от кромки
// (0 — стоит, меньше нуля — в воздухе), sq — сжатие в приседе, fade — только для
// «уменьшения движения».
function makeMotion(startX) {
  return {
    start: startX,
    x: new Animated.Value(startX),
    y: new Animated.Value(HIDE_Y),
    sq: new Animated.Value(0),
    // Придавленность раскрытым расписанием: 0 — обычный, 1 — сплющен.
    press: new Animated.Value(0),
    fade: new Animated.Value(1),
  };
}

// Прыжок: присед, взлёт, падение (Easing.in — как под тяжестью) и приземление
// с пружинкой сжатия.
function makeHop(m, height) {
  const up = 110 + height * 6;
  return Animated.sequence([
    timing(m.sq, 1, 60, Easing.out(Easing.quad)),
    Animated.parallel([
      timing(m.y, -height, up, Easing.out(Easing.quad)),
      timing(m.sq, 0, up, Easing.out(Easing.quad)),
    ]),
    timing(m.y, 0, up, Easing.in(Easing.quad)),
    timing(m.sq, 1, 50, Easing.out(Easing.quad)),
    timing(m.sq, 0, 110, Easing.out(Easing.quad)),
  ]);
}

// Выпрыгивание из-за таб-бара: высокий прыжок снизу, падение на кромку и
// маленький подскок пружинкой.
function makeEnter(m) {
  return Animated.sequence([
    timing(m.y, -ENTER_PEAK, 420, Easing.out(Easing.cubic)),
    timing(m.y, 0, 300, Easing.in(Easing.quad)),
    makeHop(m, 11),
  ]);
}

// Лист, тело, блик, глаз — цвета схемы.
const Sprite = memo(function Sprite({ frame, colors }) {
  return (
    <View style={styles.sprite}>
      {RECTS[frame].map(r => (
        <View key={`${r.c}:${r.x}:${r.y}`} style={{
          position: 'absolute', left: r.x * PX, top: r.y * PX, width: r.w * PX, height: r.h * PX,
          backgroundColor: colors[r.c],
        }} />
      ))}
    </View>
  );
});

// Тёплая точка над макушкой: есть зёрна для посадки.
const Ember = memo(function Ember({ reduceMotion }) {
  const [beat] = useState(() => new Animated.Value(0));
  const style = useMemo(() => ({
    opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
  }), [beat]);
  useEffect(() => {
    if (reduceMotion) { beat.setValue(1); return undefined; }
    // Петля начинается и кончается в одном значении: Animated.loop перед каждым
    // витком возвращает его к стартовому.
    const loop = Animated.loop(Animated.sequence([
      timing(beat, 1, BEAT_MS / 2, Easing.inOut(Easing.sin)),
      timing(beat, 0, BEAT_MS / 2, Easing.inOut(Easing.sin)),
    ]));
    loop.start();
    return () => loop.stop();
  }, [beat, reduceMotion]);
  return <Animated.View pointerEvents="none" style={[styles.ember, style]} />;
});

// Сам зверёк: выпрыгивание, прогулка по кромке, моргание, прыжки, нажатие.
// active — приложение на экране, вкладка в фокусе, сад не открыт.
const Pal = memo(function Pal({ place, colors, hasGift, active, squashed, reduceMotion, label, hint, onOpen }) {
  const [motion] = useState(() => makeMotion(rand(place.minX, place.maxX)));
  const [landed, setLanded] = useState(false);
  const [base, setBase] = useState('idle');
  const [blink, setBlink] = useState(false);
  const [facing, setFacing] = useState(1);
  const pos = useRef(motion.start);
  const walking = useRef(false);
  const hop = useRef(null);
  const { minX, maxX } = place;

  // isInteraction: false — иначе InteractionManager ждал бы конца входа.
  useEffect(() => {
    const { y, sq, fade } = motion;
    setLanded(false);
    sq.setValue(0);
    y.setValue(reduceMotion ? 0 : HIDE_Y);
    fade.setValue(reduceMotion ? 0 : 1);
    let animation = null;
    const timer = setTimeout(() => {
      animation = reduceMotion ? timing(fade, 1, 300) : makeEnter(motion);
      animation.start(({ finished }) => { if (finished) setLanded(true); });
    }, reduceMotion ? 0 : ENTER_DELAY_MS);
    return () => { clearTimeout(timer); animation?.stop(); };
  }, [motion, reduceMotion]);

  // Придавило — пружина с небольшим «дрожанием», отпустило — с перехлёстом:
  // он на миг вытягивается выше обычного и только потом успокаивается.
  useEffect(() => {
    // До приземления росток не придавлен: при новом входе форма обычная.
    if (!landed) { motion.press.setValue(0); return undefined; }
    if (reduceMotion) { motion.press.setValue(squashed ? 1 : 0); return undefined; }
    if (squashed) hop.current?.stop();
    const anim = Animated.spring(motion.press, squashed
      ? { toValue: 1, friction: 5, tension: 200, useNativeDriver: true, isInteraction: false }
      : { toValue: 0, friction: 3, tension: 110, useNativeDriver: true, isInteraction: false });
    anim.start();
    return () => anim.stop();
  }, [squashed, landed, reduceMotion, motion]);

  const playHop = useCallback(height => {
    hop.current?.stop();
    hop.current = makeHop(motion, height);
    hop.current.start();
  }, [motion]);

  // Прогулка: идти, постоять, подпрыгнуть — и снова. Всё на таймерах и нативных
  // анимациях, при потере активности гасится целиком.
  useEffect(() => {
    if (!landed || !active || reduceMotion || squashed) return undefined;
    let timer = null;
    let steps = null;
    let walk = null;
    const later = (fn, ms) => { timer = setTimeout(fn, ms); };

    const pickTarget = () => {
      const from = pos.current;
      const clamp = v => Math.min(maxX, Math.max(minX, v));
      let dir = Math.random() < 0.5 ? -1 : 1;
      let to = clamp(from + dir * rand(WALK_MIN, WALK_MAX));
      if (Math.abs(to - from) < WALK_MIN / 2) {
        dir = -dir;
        to = clamp(from + dir * rand(WALK_MIN, WALK_MAX));
      }
      return Math.abs(to - from) < WALK_MIN / 2 ? null : to;
    };

    const next = () => {
      const roll = Math.random();
      const to = roll < 0.55 ? pickTarget() : null;
      if (to != null) {
        const from = pos.current;
        setFacing(to < from ? -1 : 1);
        walking.current = true;
        setBase('walkA');
        steps = setInterval(() => setBase(f => (f === 'walkA' ? 'walkB' : 'walkA')), STEP_MS);
        walk = timing(motion.x, to, (Math.abs(to - from) / WALK_SPEED) * 1000);
        walk.start(({ finished }) => {
          if (!finished) return;
          pos.current = to;
          walking.current = false;
          clearInterval(steps);
          setBase('idle');
          later(next, rand(700, 1800));
        });
      } else if (roll < 0.75) {
        playHop(HOP_IDLE);
        later(next, rand(1100, 2200));
      } else {
        later(next, rand(900, 2400));
      }
    };

    later(next, rand(500, 1200));
    return () => {
      clearTimeout(timer);
      clearInterval(steps);
      if (walking.current) motion.x.stopAnimation(v => { pos.current = v; });
      walk?.stop();
      walking.current = false;
      hop.current?.stop();
      motion.y.setValue(0);
      motion.sq.setValue(0);
      setBase('idle');
    };
  }, [landed, active, reduceMotion, squashed, motion, minX, maxX, playHop]);

  // Моргание — на стоянке, раз в 3–6 секунд; на ходу пропускаем.
  useEffect(() => {
    if (!landed || !active || squashed) return undefined;
    let timer = null;
    const schedule = () => {
      timer = setTimeout(() => {
        if (walking.current) { schedule(); return; }
        setBlink(true);
        timer = setTimeout(() => { setBlink(false); schedule(); }, BLINK_MS);
      }, rand(BLINK_EVERY[0], BLINK_EVERY[1]));
    };
    schedule();
    return () => { clearTimeout(timer); setBlink(false); };
  }, [landed, active, squashed]);

  const frame = squashed && landed ? 'squish' : blink && base === 'idle' ? 'blink' : base;

  const palStyle = useMemo(() => ({ transform: [{ translateX: motion.x }] }), [motion]);
  const bodyStyle = useMemo(() => ({
    opacity: motion.fade,
    transform: [
      { translateY: motion.y },
      // Присед и придавленность перемножаются: повторять ключ scale в
      // transform нельзя.
      { scaleX: Animated.multiply(
        motion.sq.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }),
        motion.press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] })) },
      { scaleY: Animated.multiply(
        motion.sq.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] }),
        motion.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] })) },
    ],
  }), [motion]);
  // Тень появляется, когда зверёк уже над кромкой, и сжимается в прыжке.
  const shadowStyle = useMemo(() => ({
    opacity: motion.y.interpolate({
      inputRange: [-200, 0, 6], outputRange: [SHADOW.opacity, SHADOW.opacity, 0], extrapolate: 'clamp',
    }),
    transform: [{ scale: motion.y.interpolate({ inputRange: [-60, 0], outputRange: [0.65, 1], extrapolate: 'clamp' }) }],
  }), [motion]);

  const press = () => {
    hapticLight();
    if (!reduceMotion) playHop(HOP_JOY);
    onOpen();
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.pal, { top: place.barTop - SPRITE_H }, palStyle]}>
      <Animated.View pointerEvents="none" style={[styles.shadow, shadowStyle]} />
      <Animated.View pointerEvents={landed ? 'box-none' : 'none'} style={[styles.body, bodyStyle]}>
        {/* Зона нажатия шире рисунка; вниз — без запаса, там таб-бар. */}
        <Pressable onPress={press} hitSlop={{ top: 18, left: 14, right: 14, bottom: 0 }}
          accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
          style={StyleSheet.absoluteFill}>
          <View style={{ transform: [{ scaleX: facing }] }}>
            <Sprite frame={frame} colors={colors} />
          </View>
        </Pressable>
        {hasGift && landed ? <Ember reduceMotion={reduceMotion} /> : null}
      </Animated.View>
    </Animated.View>
  );
});

// Мемоизирован и без пропсов: обновляется только вместе с состоянием тасбиха,
// языком и схемой, а не с каждым тиком часов главного экрана.
export default memo(function PixelPal({ squashed = false }) {
  const { state, error } = useTasbih();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent, tint, schemeColors } = useAppearance();
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const [open, setOpen] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  // Модальное окно на iOS живёт в своём UIWindow, и внутри него отступы
  // безопасной зоны приходится передать явно — иначе шапка экрана лезет
  // под вырез.
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layer = useRef(null);
  const [frame, setFrame] = useState(null);
  const [entryKey, setEntryKey] = useState(0);

  // Положение слоя в окне: по нему считаем, где верх таб-бара и края острова.
  const measure = () => {
    layer.current?.measureInWindow((x, y, w, h) => {
      if (!w || !h) return;
      setFrame(prev => (prev && Math.abs(prev.y - y) < 0.5 && Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5
        ? prev : { y, w, h }));
    });
  };

  // Вернулись в приложение после долгой паузы — зверёк выпрыгивает заново.
  useEffect(() => {
    let leftAt = null;
    const sub = AppState.addEventListener('change', status => {
      setAppActive(status === 'active');
      if (status === 'active') {
        if (leftAt != null && Date.now() - leftAt >= AWAY_MS) setEntryKey(k => k + 1);
        leftAt = null;
      } else if (leftAt == null) {
        leftAt = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  const enabled = !!state || !!error;
  // barTop — верх острова в координатах слоя; minX/maxX — где могут стоять
  // ноги, чтобы не сойти с ровной части кромки.
  const place = useMemo(() => {
    if (!frame) return null;
    const islandW = Math.min(frame.w - TAB_ISLAND.sideGap * 2, TAB_ISLAND.maxWidth);
    const left = (frame.w - islandW) / 2;
    const edge = TAB_ISLAND.height / 2 + EDGE_MARGIN;
    const minX = left + edge - FOOT_L;
    return {
      barTop: Math.max(0, height - insets.bottom - TAB_ISLAND.bottomGap - TAB_ISLAND.height - frame.y),
      minX,
      maxX: Math.max(minX, left + islandW - edge - FOOT_R),
    };
  }, [frame, height, insets.bottom]);
  const colors = useMemo(() => ({
    L: accent,
    B: `rgba(${tint || '150,200,225'},1)`,
    W: 'rgba(255,255,255,0.9)',
    E: schemeColors.bg[1],
  }), [accent, tint, schemeColors]);
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
          состояние прочитано и слой измерен, чтобы зверёк вышел один раз.
          Окно обрезки кончается на верхней кромке таб-бара: всё ниже скрыто. */}
      {enabled && place ? (
        <View pointerEvents="box-none" style={[styles.clip, { height: place.barTop }]}>
          <Pal key={entryKey} place={place} colors={colors} hasGift={hasGift}
            active={appActive && focused && !open} squashed={squashed} reduceMotion={reduceMotion}
            label={label} hint={hint} onOpen={openGarden} />
        </View>
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

// Сколько места снизу прокрутки занимает зверёк на кромке: главный экран
// добавляет это к отступу под таб-бар, чтобы последняя строка поднималась выше.
export const ENTRY_CLEARANCE = SPRITE_H + 6;

const styles = StyleSheet.create({
  clip: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  pal: { position: 'absolute', left: 0, width: SPRITE_W, height: SPRITE_H },
  body: { width: SPRITE_W, height: SPRITE_H, transformOrigin: '50% 100%' },
  sprite: { width: SPRITE_W, height: SPRITE_H },
  shadow: {
    position: 'absolute', left: (SPRITE_W - SHADOW.w) / 2, top: SPRITE_H - SHADOW.h + 1,
    width: SHADOW.w, height: SHADOW.h, borderRadius: SHADOW.h / 2, backgroundColor: '#000',
  },
  ember: {
    position: 'absolute', right: -2, top: -EMBER_SIZE, width: EMBER_SIZE, height: EMBER_SIZE,
    borderRadius: EMBER_SIZE / 2, backgroundColor: COLORS.ember,
  },
});
