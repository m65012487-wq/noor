import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import { ThemedBackground, useReduceMotion } from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import Icon from '../components/Icon';
import { ARABIC, COLORS, FONTS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { useLang } from '../i18n/LanguageContext';
import { hapticHeavy, hapticLight, hapticSuccess } from '../utils/haptics';
import TreeView from './TreeView';
import LeafBurst from './LeafBurst';
import WateringCan, { wateringBreath } from './WateringCan';
import { treeGeometry } from './treeGeometry';
import SeedDrop from './SeedDrop';
import GardenSheet from './GardenSheet';
import DhikrSheet from './DhikrSheet';
import useTasbih from './useTasbih';
import { activeTree, definition, DHIKR, growthRatio, sequenceSteps, SPECIES, STAGE_NAMES, STAGES } from './model';
import { capturesDismiss, finishesDismiss } from './dismissGesture';

const clamp01 = v => Math.max(0, Math.min(1, v));

// Pill label for the current mode — 'sequence'/'free' aren't in DHIKR, and a
// custom dhikr's label is its own text, so this can't just look the id up
// in the options list definition() would return for the active dhikr.
function modeLabel(state, ru) {
  if (state.selectedDhikr === 'sequence') return ru ? 'Последовательность' : 'Sequence';
  if (state.selectedDhikr === 'free') return ru ? 'Свободный зикр' : 'Free dhikr';
  const single = DHIKR.find(d => d.id === state.selectedDhikr);
  if (single) return ru ? single.ru : single.en;
  const custom = (state.customDhikr || []).find(d => `custom:${d.id}` === state.selectedDhikr);
  return custom ? custom.text : '';
}

// Экран разбит на полосы постоянной высоты — шапка, слова, счётчик и подпись
// внизу, — а всё, что осталось между ними, отдано дереву. Раньше каждый блок
// занимал столько, сколько просил, и на разных телефонах дерево то упиралось
// в счётчик, то висело в пустоте.
export default function TasbihScreen({ onClose }) {
  const { state, error, tap, select, retry, plant, setActive, ackDrop, addCustom, removeCustom, setCircleLimit, setSequence } = useTasbih();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const reduceMotion = useReduceMotion();
  const [selector, setSelector] = useState(false);
  const [garden, setGarden] = useState(false);
  const [pulse, setPulse] = useState(0);
  // Эффекты поверх дерева: размер области, последнее нажатие (листья) и
  // последний завершённый круг (полив). Новый объект на каждое событие.
  const [treeSize, setTreeSize] = useState({ width: 0, height: 0 });
  const [burst, setBurst] = useState(null);
  const [water, setWater] = useState(null);
  const watering = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Свайп вправо и вниз закрывает экран — привычный для iOS выход, которым
  // пользуются чаще кнопки. Жест ловится на захвате, иначе его перехватывает
  // нажатие по дереву.
  const swipes = useMemo(() => {
    const make = direction => PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) => capturesDismiss(gesture, direction),
      onPanResponderRelease: (_event, gesture) => { if (finishesDismiss(gesture, direction)) closeRef.current(); },
      onPanResponderTerminationRequest: () => true,
    });
    return { right: make('right'), down: make('down') };
  }, []);
  const textFade = useRef(new Animated.Value(1)).current;
  // Native-driver-only value (opacity + transform): a brief accent flash
  // behind the counter and a small scale pop mark the end of a circle or a
  // full sequence. reduceMotion keeps the flash but skips the scale.
  const flash = useRef(new Animated.Value(0)).current;
  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const flashGlow = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });
  const triggerFlash = () => {
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start();
  };
  const item = state ? definition(state) : DHIKR[0];
  useEffect(() => {
    textFade.setValue(0);
    Animated.timing(textFade, { toValue: 1, duration: reduceMotion ? 150 : 350, useNativeDriver: true }).start();
  }, [item.id, textFade, reduceMotion]);
  const phrase = ru ? item.ru : item.en;
  const translation = ru ? item.translation_ru : item.translation_en;
  const onTap = (e) => {
    const event = tap();
    hapticLight();
    if (event === 'circle') hapticHeavy();
    else if (event === 'complete') hapticSuccess();
    setPulse(v => v + 1);
    // Листья разлетаются из места касания (координаты внутри области дерева).
    setBurst({ event, x: e?.nativeEvent?.locationX, y: e?.nativeEvent?.locationY });
    if (event !== 'tap') triggerFlash();
    if (event === 'circle' || event === 'complete') setWater({ rich: event === 'complete' });
  };
  const tree = state ? activeTree(state) : null;
  const drop = state?.pendingDrops?.[0] || null;
  const dropKey = drop ? `${state.pendingDrops.length}:${drop.species}:${drop.reason}` : null;
  const seedTotal = state ? Object.values(state.seeds || {}).reduce((sum, n) => sum + n, 0) : 0;
  const stageLabel = tree ? (ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en) : '';
  const treeSpecies = tree ? SPECIES.find(s => s.id === tree.species) : null;
  const speciesLabel = treeSpecies ? (ru ? treeSpecies.ru : treeSpecies.en) : '';
  const ratio = tree ? growthRatio(tree) : 0;
  // Плодоносящее дерево больше не растёт — рост копится для следующего зерна.
  const fruiting = !!tree && tree.stage === STAGES.length - 1;
  const onTreeLayout = e => {
    const { width, height } = e.nativeEvent.layout;
    setTreeSize(prev => (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5 ? prev : { width, height }));
  };
  // Геометрия дерева в координатах области: из неё эффекты знают, где крона и корень.
  const treeSpeciesId = tree?.species;
  const treeStage = tree?.stage;
  const geo = useMemo(() => (treeSpeciesId ? treeGeometry(treeSpeciesId, treeStage, treeSize) : null),
    [treeSpeciesId, treeStage, treeSize]);
  const rootY = geo?.root.y;
  const breathStyle = useMemo(() => wateringBreath(watering, rootY), [watering, rootY]);

  return (
    // Свой фон — чистый градиент схемы, без сцены обоев: дерево того же
    // цвета, что и сцены, и на переднем плане пейзажа оно тонуло.
    <ThemedBackground plain>
      <SafeAreaView style={styles.safe} onAccessibilityEscape={onClose} {...swipes.right.panHandlers}>
        {/* Шапка: закрыть — режим — сад. Названия экрана нет: о том, где
            человек находится, говорит дерево, а строка режима нужнее. */}
        <View style={styles.header} {...swipes.down.panHandlers}>
          <Pressable accessibilityRole="button" accessibilityLabel={ru ? 'Закрыть Тасбих' : 'Close Tasbih'}
            onPress={onClose} style={styles.iconButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Icon name="close" size={22} color={COLORS.text} />
          </Pressable>

          {state ? (
            <Pressable style={styles.pillWrap} accessibilityRole="button" accessibilityState={{ expanded: selector }}
              accessibilityLabel={ru ? `Режим: ${modeLabel(state, ru)}. Открыть выбор` : `Mode: ${modeLabel(state, ru)}. Open picker`}
              onPress={() => setSelector(true)}>
              <GlassView radius={RADIUS.pill} style={styles.pill}>
                <Text style={[styles.pillText, { color: accent }]} numberOfLines={1}>{modeLabel(state, ru)}</Text>
                <Icon name="down" size={14} color={accent} />
              </GlassView>
            </Pressable>
          ) : <View style={styles.pillWrap} />}

          <Pressable accessibilityRole="button"
            accessibilityLabel={seedTotal > 0
              ? (ru ? `Сад, зёрен: ${seedTotal}` : `Garden, seeds: ${seedTotal}`)
              : (ru ? 'Сад' : 'Garden')}
            onPress={() => setGarden(true)} style={styles.iconButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Icon name="leaf" size={22} color={COLORS.text} />
            {seedTotal > 0 && <View style={[styles.badge, { backgroundColor: accent }]}>
              <Text style={styles.badgeText}>{seedTotal > 99 ? '99+' : seedTotal}</Text>
            </View>}
          </Pressable>
        </View>

        {error && <Pressable onPress={retry} accessibilityRole="button" style={styles.error}>
          <Text style={styles.caption}>{ru ? 'Не удалось сохранить или прочитать прогресс. Нажмите, чтобы повторить.' : 'Could not save or load progress. Tap to retry.'}</Text>
        </Pressable>}

        {!state || !tree ? <ActivityIndicator style={{ flex: 1 }} color={accent} /> : (
          <>
            <Animated.View style={[styles.words, { opacity: textFade }]}>
              {!!item.arabic && <Text style={styles.arabic} accessibilityLanguage="ar"
                numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{item.arabic}</Text>}
              <Text style={styles.phrase} numberOfLines={2}>{phrase}</Text>
              {!!translation && <Text style={styles.translation} numberOfLines={2}>{translation}</Text>}
            </Animated.View>

            <Animated.View style={[styles.counter, { transform: [{ scale: reduceMotion ? 1 : flashScale }] }]}>
              <View style={styles.counterRow}>
                <Animated.View pointerEvents="none" style={[styles.counterGlow, { opacity: flashGlow, backgroundColor: accent }]} />
                <Text style={[styles.count, { color: accent }]}>{state.currentDhikrCount}</Text>
                {item.target != null && <Text style={styles.target}>/ {item.target}</Text>}
              </View>
              {/* Полоса и точки держат своё место, даже когда их нечем
                  заполнить: иначе цифра прыгает при смене режима. */}
              <View style={styles.progressTrack}>
                {item.target != null && <View style={[styles.progressFill, {
                  width: `${clamp01(state.currentDhikrCount / item.target) * 100}%`, backgroundColor: accent,
                }]} />}
              </View>
              <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
                {state.selectedDhikr === 'sequence' && sequenceSteps(state).map((d, index) => (
                  <View key={`${index}:${d.id}`} style={[styles.dot, {
                    backgroundColor: index === state.currentDhikrIndex ? accent : COLORS.textMuted,
                    opacity: index === state.currentDhikrIndex ? 1 : 0.35,
                  }]} />
                ))}
              </View>
            </Animated.View>

            <Pressable onPress={onTap} style={styles.treeArea} onLayout={onTreeLayout}
              accessibilityRole="button"
              accessibilityLabel={`${ru ? 'Тасбих' : 'Tasbih'}. ${phrase}. ${state.currentDhikrCount}${item.target != null ? ` ${ru ? 'из' : 'of'} ${item.target}` : ''}`}
              accessibilityHint={ru ? 'Нажмите дважды, чтобы засчитать одно поминание' : 'Double tap to count one remembrance'}>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, reduceMotion ? null : breathStyle]}>
                <TreeView species={tree.species} stage={tree.stage} pulse={pulse} reduceMotion={reduceMotion} />
              </Animated.View>
              {!!geo && <LeafBurst geo={geo} burst={burst} reduceMotion={reduceMotion} />}
              {!!geo && <WateringCan geo={geo} water={water} progress={watering} reduceMotion={reduceMotion} />}
              {drop && <SeedDrop key={dropKey} drop={drop} reduceMotion={reduceMotion} onDone={ackDrop} />}
            </Pressable>

            <View style={styles.footer}>
              {!state.hasSeenTasbihHint ? (
                <Text style={styles.hint}>{ru ? 'Нажимайте на дерево, чтобы считать зикр' : 'Tap the tree to count dhikr'}</Text>
              ) : (
                <>
                  <Text style={styles.stageLine}>{speciesLabel} · {stageLabel}</Text>
                  {fruiting && seedTotal > 0 ? (
                    <Text style={styles.plantHint} numberOfLines={1}>{ru ? 'Посадите зерно — рост перейдёт к нему' : 'Plant a seed — growth carries over'}</Text>
                  ) : (
                    <View style={styles.growthTrack}>
                      <View style={[styles.growthFill, { width: `${ratio * 100}%`, backgroundColor: accent }]} />
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </SafeAreaView>

      <DhikrSheet visible={selector} onClose={() => setSelector(false)} state={state}
        select={select} addCustom={addCustom} removeCustom={removeCustom} setCircleLimit={setCircleLimit} setSequence={setSequence} />

      <GardenSheet visible={garden} onClose={() => setGarden(false)} state={state} plant={plant} setActive={setActive} />
    </ThemedBackground>
  );
}

// Фон экрана — обои приложения, и у сцен есть светлые места: текст над ними
// получает ту же мягкую тень, что и на главном экране.
const LEGIBLE = { textShadowColor: 'rgba(8,18,16,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: SPACING.lg },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  pillWrap: { flex: 1, alignItems: 'center' },
  pill: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, maxWidth: '100%' },
  pillText: { ...TYPE.callout, fontWeight: '600', flexShrink: 1 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...TYPE.caption, fontSize: 10, lineHeight: 12, color: COLORS.navy, fontWeight: '700' },

  words: { alignItems: 'center', justifyContent: 'center', height: 146, overflow: 'hidden' },
  arabic: { ...LEGIBLE, ...ARABIC.lg, fontFamily: FONTS.arabic, color: COLORS.text, textAlign: 'center' },
  phrase: { ...LEGIBLE, ...TYPE.subhead, color: COLORS.text, textAlign: 'center', marginTop: SPACING.xs },
  translation: { ...LEGIBLE, ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },

  counter: { alignItems: 'center', height: 92, justifyContent: 'center' },
  counterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  counterGlow: {
    position: 'absolute', left: -SPACING.lg, right: -SPACING.lg, top: -SPACING.sm, bottom: -SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  count: { ...LEGIBLE, ...TYPE.display, ...TYPE.mono },
  target: { ...TYPE.subhead, color: COLORS.textMuted, marginBottom: 4 },
  progressTrack: { width: 160, height: 3, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: SPACING.sm, marginBottom: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pill },
  dots: { flexDirection: 'row', gap: 6, height: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },

  treeArea: { flex: 1, width: '100%', alignSelf: 'center', minHeight: 180 },

  footer: { alignItems: 'center', height: 52, justifyContent: 'center' },
  hint: { ...LEGIBLE, ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center' },
  plantHint: { ...LEGIBLE, ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
  stageLine: { ...LEGIBLE, ...TYPE.callout, color: COLORS.text },
  growthTrack: { width: 160, height: 3, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: SPACING.xs, overflow: 'hidden' },
  growthFill: { height: '100%', borderRadius: RADIUS.pill },
  caption: { ...TYPE.callout, color: COLORS.text },
  error: { paddingVertical: SPACING.sm },
});
