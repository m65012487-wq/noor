import React, { memo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
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

// «Окно в сад»: круглый медальон с мягким свечением цвета схемы и полоской
// земли. Дерево стоит на горизонте и растёт вместе со стадией — это тот же
// силуэт, что и внутри экрана, без отдельных картинок.
const WINDOW = 72;
// Горизонт: выше него небо сада, ниже — земля. Комель заглублён в землю на
// несколько пунктов, чтобы дерево стояло, а не висело над ней.
const HORIZON = 54;
const TREE_BASE = 58;
const TREE_MAX_W = 46;
const TREE_MAX_H = 46;
// Без верхнего предела зерно (52×33) раздувалось бы до ширины всего медальона
// и выглядело крупнее взрослого дерева.
const TREE_MAX_SCALE = 0.6;
const TREE_FALLBACK = { width: 36, height: 44 };

// Холст дерева обрезан по самой фигуре (crop), поэтому и рамка под него
// берётся по пропорциям фигуры: тогда низ силуэта лежит ровно на нижней
// кромке рамки, то есть на земле.
function treeBox(tree) {
  const bounds = tree ? TREE_BOUNDS?.[tree.species]?.[tree.stage] : null;
  if (!bounds || !(bounds.width > 0) || !(bounds.height > 0)) return TREE_FALLBACK;
  const scale = Math.min(TREE_MAX_W / bounds.width, TREE_MAX_H / bounds.height, TREE_MAX_SCALE);
  return { width: bounds.width * scale, height: bounds.height * scale };
}

// Мемоизирован: главный экран перерисовывается каждую секунду (часы), а
// медальон с градиентами меняется только вместе с деревом.
const GardenWindow = memo(function GardenWindow({ tree, accent }) {
  const box = tree ? treeBox(tree) : null;
  return (
    <View style={styles.window} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
        <Ellipse cx={WINDOW / 2} cy={HORIZON + 22} rx={52} ry={22} fill="url(#gardenGround)"
          stroke={accent} strokeOpacity={0.4} strokeWidth={1} />
      </Svg>
      {!!box && (
        <View pointerEvents="none" style={[styles.tree, {
          width: box.width, height: box.height, left: (WINDOW - box.width) / 2, bottom: WINDOW - TREE_BASE,
        }]}>
          <TreeSilhouette species={tree.species} stage={tree.stage} color={accent} shadow={false} crop />
        </View>
      )}
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

// Вход в тасбих с главного экрана: карточка-витрина, а не ворота с наездом
// камеры. Ворота были отдельной сценой со своей графикой и полуторасекундным
// переходом — ради одной кнопки это оказалось и долго, и чужеродно рядом с
// остальными карточками. Здесь видно главное: дерево, его стадия, путь до
// следующей и сколько зикров сегодня.
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
  // Только нативный драйвер: у значения нет ни одной JS-анимации.
  const press = useRef(new Animated.Value(1)).current;
  const pressTo = toValue => {
    if (reduceMotion) return;
    Animated.spring(press, { toValue, damping: 20, stiffness: 320, mass: 0.7, useNativeDriver: true }).start();
  };

  const tree = state ? activeTree(state) : null;
  const species = tree ? SPECIES.find(s => s.id === tree.species) : null;
  const subtitle = tree
    ? `${ru ? species?.ru : species?.en} · ${ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en}`
    : (ru ? 'Счётчик зикра' : 'Dhikr counter');
  const ratio = tree ? growthRatio(tree) : 0;
  const hasNextStage = !!tree && tree.stage < STAGES.length - 1;
  const today = state ? (state.dailyDhikrCounts?.[localDateKey()] || 0) : 0;
  const todayLine = state
    ? `${ru ? 'Сегодня: ' : 'Today: '}${dhikrCount(today, ru)}`
    : error ? (ru ? 'Не удалось загрузить' : 'Could not load') : (ru ? 'Загрузка…' : 'Loading…');
  const enabled = !!state || !!error;
  const label = [
    ru ? 'Тасбих' : 'Tasbih',
    subtitle,
    hasNextStage ? `${ru ? 'До следующей стадии' : 'Next stage'}: ${Math.round(ratio * 100)}%` : '',
    todayLine,
  ].filter(Boolean).join('. ');

  return (
    <View style={styles.wrap}>
      <Animated.View style={[{ transform: [{ scale: press }] }, !enabled && styles.waiting]}>
        <Pressable onPress={() => { hapticLight(); setOpen(true); }} disabled={!enabled}
          onPressIn={() => pressTo(0.98)} onPressOut={() => pressTo(1)}
          accessibilityRole="button" accessibilityLabel={label}
          accessibilityHint={ru ? 'Открывает счётчик зикра и дерево' : 'Opens the dhikr counter and the tree'}>
          <GlassView azure radius={RADIUS.lg} style={styles.card}>
            <View style={styles.row}>
              <GardenWindow tree={tree} accent={accent} />
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={1}>{ru ? 'Тасбих' : 'Tasbih'}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                <View style={styles.growthTrack}>
                  <View style={[styles.growthFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: accent }]} />
                </View>
                <Text style={styles.today} numberOfLines={1}>{todayLine}</Text>
              </View>
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
  wrap: { paddingHorizontal: SPACING.xs, paddingTop: SPACING.xs },
  waiting: { opacity: 0.7 },
  card: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  window: {
    width: WINDOW, height: WINDOW, borderRadius: WINDOW / 2, overflow: 'hidden',
    backgroundColor: COLORS.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: COLORS.glassBorder,
  },
  tree: { position: 'absolute' },
  text: { flex: 1 },
  title: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 1 },
  growthTrack: { height: SPACING.xs, borderRadius: RADIUS.pill, backgroundColor: COLORS.hairline, marginTop: SPACING.sm, overflow: 'hidden' },
  growthFill: { height: '100%', borderRadius: RADIUS.pill },
  today: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xs },
});
