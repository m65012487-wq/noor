import React, { memo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import GlassView from '../components/GlassView';
import Icon from '../components/Icon';
import { useReduceMotion } from '../components/ScreenWrapper';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { localDateKey } from '../utils/calendarDate';
import { hapticLight } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import useTasbih from './useTasbih';
import { TreeSilhouette } from './TreeView';
import { TREE_BOUNDS } from './treeShapes';
import TasbihScreen from './TasbihScreen';
import { activeTree, growthRatio, SPECIES, STAGES, STAGE_NAMES } from './model';

// «Окно в сад»: круглый медальон Ø40 с мягким свечением цвета схемы и полоской
// земли; вокруг него тонкое кольцо — путь до следующей стадии. Дерево стоит
// на горизонте и растёт вместе со стадией: это тот же силуэт, что и внутри
// экрана, без отдельных картинок.
const WINDOW = 40;
const RING_STROKE = 2.5;
// Зазор между медальоном и кольцом 1,5 пункта: кольцо читается отдельной
// линией, а не обводкой медальона.
const RING = WINDOW + 2 * (RING_STROKE + 1.5);
const RING_RADIUS = (RING - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
// Высота пилюли: кольцо плюс отступ сверху и снизу — 56.
const PILL_HEIGHT = RING + 2 * SPACING.xs;
// Горизонт: выше него небо сада, ниже — земля. Комель заглублён в землю на
// пару пунктов, чтобы дерево стояло, а не висело над ней.
const HORIZON = 30;
const TREE_BASE = 32;
const TREE_MAX_W = 26;
const TREE_MAX_H = 24;
// Без верхнего предела зерно (44×39) раздувалось бы до ширины всего медальона
// и выглядело крупнее взрослого дерева.
const TREE_MAX_SCALE = 0.5;
const TREE_FALLBACK = { width: 20, height: 24 };

// Холст дерева обрезан по самой фигуре (crop), поэтому и рамка под него
// берётся по пропорциям фигуры: тогда низ силуэта лежит ровно на нижней
// кромке рамки, то есть на земле.
function treeBox(species, stage) {
  const bounds = species ? TREE_BOUNDS?.[species]?.[stage] : null;
  if (!bounds || !(bounds.width > 0) || !(bounds.height > 0)) return TREE_FALLBACK;
  const scale = Math.min(TREE_MAX_W / bounds.width, TREE_MAX_H / bounds.height, TREE_MAX_SCALE);
  return { width: bounds.width * scale, height: bounds.height * scale };
}

// Мемоизирован: главный экран перерисовывается каждую секунду (часы), а
// медальон с градиентами и кольцом меняется только вместе с деревом. Пропсы
// — примитивы, чтобы сравнение не ломалось от новой ссылки на объект дерева.
const GardenMedallion = memo(function GardenMedallion({ species, stage, ratio, accent }) {
  const box = species ? treeBox(species, stage) : null;
  // Минимальная дуга: полностью пустое кольцо читается как сбой, а не как начало пути.
  const filled = Math.max(0.01, Math.min(ratio, 1));
  return (
    <View style={styles.medallion} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
        <Circle cx={RING / 2} cy={RING / 2} r={RING_RADIUS} stroke={COLORS.hairline}
          strokeWidth={RING_STROKE} fill="none" />
        <Circle cx={RING / 2} cy={RING / 2} r={RING_RADIUS} stroke={accent}
          strokeWidth={RING_STROKE} fill="none" strokeLinecap="round"
          strokeDasharray={`${RING_LENGTH * filled} ${RING_LENGTH}`}
          // Начало дуги сверху, а не справа, как рисует SVG по умолчанию.
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />
      </Svg>
      <View style={styles.window}>
        <Svg width={WINDOW} height={WINDOW} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="gardenGlow" cx="50%" cy="60%" r="62%" fx="50%" fy="60%">
              <Stop offset="0" stopColor={accent} stopOpacity="0.46" />
              <Stop offset="0.55" stopColor={accent} stopOpacity="0.16" />
              <Stop offset="1" stopColor={accent} stopOpacity="0.02" />
            </RadialGradient>
            <LinearGradient id="gardenGround" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="0.42" />
              <Stop offset="1" stopColor={accent} stopOpacity="0.12" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={WINDOW} height={WINDOW} fill="url(#gardenGlow)" />
          {/* Земля — широкий эллипс, верх которого и есть горизонт; края
              срезаются круглой рамкой медальона. */}
          <Ellipse cx={WINDOW / 2} cy={HORIZON + 14} rx={30} ry={14} fill="url(#gardenGround)"
            stroke={accent} strokeOpacity={0.4} strokeWidth={0.75} />
        </Svg>
        {!!box && (
          <View pointerEvents="none" style={[styles.tree, {
            width: box.width, height: box.height, left: (WINDOW - box.width) / 2, bottom: WINDOW - TREE_BASE,
          }]}>
            <TreeSilhouette species={species} stage={stage} color={accent} shadow={false} crop />
          </View>
        )}
      </View>
    </View>
  );
});

// «33 зикра»: русское существительное согласуется с числом, английское — нет.
function dhikrCount(n, ru) {
  if (!ru) return `${n} dhikr`;
  const last = n % 10;
  const lastTwo = n % 100;
  const word = last === 1 && lastTwo !== 11 ? 'зикр'
    : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'зикра' : 'зикров';
  return `${n} ${word}`;
}

// Вход в «Сад тасбиха» с главного экрана: компактная пилюля, а не карточка.
// Она лежит в потоке прокрутки сразу под расписанием, поэтому ни на что не
// наезжает на любой высоте экрана. Видно главное: дерево, его стадия, путь до
// следующей (кольцо вокруг медальона) и сколько зикров сегодня.
export default function TasbihEntry() {
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
  // Только нативный драйвер: у значения нет ни одной JS-анимации, а
  // анимируется один transform.
  const press = useRef(new Animated.Value(1)).current;
  const pressTo = toValue => {
    if (reduceMotion) return;
    Animated.spring(press, { toValue, damping: 20, stiffness: 320, mass: 0.7, useNativeDriver: true }).start();
  };

  const tree = state ? activeTree(state) : null;
  const species = tree ? SPECIES.find(s => s.id === tree.species) : null;
  const today = state ? (state.dailyDhikrCounts?.[localDateKey()] || 0) : 0;
  const treeLine = tree
    ? `${ru ? species?.ru : species?.en} · ${ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en}`
    : (ru ? 'Счётчик зикра' : 'Dhikr counter');
  // Счёт за сегодня — отдельным значком справа: в общей строке при длинной
  // породе и стадии («Финиковая пальма · Молодое дерево») он обрезался первым.
  const subtitle = state
    ? treeLine
    : error ? (ru ? 'Не удалось загрузить' : 'Could not load') : (ru ? 'Загрузка…' : 'Loading…');
  const title = ru ? 'Сад тасбиха' : 'Tasbih garden';
  const ratio = tree ? growthRatio(tree) : 0;
  const hasNextStage = !!tree && tree.stage < STAGES.length - 1;
  const enabled = !!state || !!error;
  const label = [
    title,
    treeLine,
    hasNextStage ? `${ru ? 'До следующей стадии' : 'Next stage'}: ${Math.round(ratio * 100)}%` : '',
    state
      ? `${ru ? 'Сегодня: ' : 'Today: '}${dhikrCount(today, ru)}`
      : subtitle,
  ].filter(Boolean).join('. ');

  return (
    <View style={styles.wrap}>
      <Animated.View style={[{ transform: [{ scale: press }] }, !enabled && styles.waiting]}>
        <Pressable onPress={() => { hapticLight(); setOpen(true); }} disabled={!enabled}
          onPressIn={() => pressTo(0.97)} onPressOut={() => pressTo(1)}
          accessibilityRole="button" accessibilityLabel={label}
          accessibilityHint={ru ? 'Открывает счётчик зикра и дерево' : 'Opens the dhikr counter and the tree'}>
          <GlassView azure radius={RADIUS.pill} style={styles.pill}>
            <View style={styles.row}>
              <GardenMedallion species={tree?.species} stage={tree?.stage ?? 0} ratio={ratio} accent={accent} />
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {subtitle}
                </Text>
              </View>
              {!!state && (
                <View style={styles.today}>
                  <Text style={[styles.todayCount, { color: accent }]}>{String(today)}</Text>
                  <Text style={styles.todayLabel}>{ru ? 'сегодня' : 'today'}</Text>
                </View>
              )}
              <Icon name="forward" size={16} color={COLORS.textMuted} />
            </View>
          </GlassView>
        </Pressable>
      </Animated.View>

      <Modal visible={open} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
          <TasbihScreen onClose={() => setOpen(false)} />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Пилюля по центру колонки; на широких экранах не растягивается на всю ширину.
  wrap: { alignSelf: 'center', width: '100%', maxWidth: 420, marginTop: SPACING.sm },
  waiting: { opacity: 0.7 },
  pill: { alignSelf: 'stretch' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    height: PILL_HEIGHT, paddingLeft: SPACING.xs, paddingRight: SPACING.md,
  },
  medallion: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  today: { alignItems: 'center', minWidth: 36 },
  todayCount: { ...TYPE.callout, ...TYPE.mono, fontWeight: '700', lineHeight: 18 },
  todayLabel: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, lineHeight: 12 },
  window: {
    width: WINDOW, height: WINDOW, borderRadius: WINDOW / 2, overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  tree: { position: 'absolute' },
  text: { flex: 1 },
  title: { ...TYPE.callout, color: COLORS.white, fontWeight: '700' },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
});
