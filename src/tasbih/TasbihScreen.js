import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import { ThemedBackground, useReduceMotion } from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import DraggableSheet from '../components/DraggableSheet';
import Icon from '../components/Icon';
import { ARABIC, COLORS, FONTS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { useLang } from '../i18n/LanguageContext';
import { hapticLight } from '../utils/haptics';
import TreeView from './TreeView';
import SeedDrop from './SeedDrop';
import GardenSheet from './GardenSheet';
import useTasbih from './useTasbih';
import { activeTree, definition, DHIKR, SPECIES, STAGES, STAGE_NAMES } from './model';
import EnvironmentDebug from './EnvironmentDebug';
import { capturesDismiss, finishesDismiss } from './dismissGesture';

const clamp01 = v => Math.max(0, Math.min(1, v));

// Growth toward the next stage needs both enough progress and enough active
// days (see model.chooseStage); the bar shows whichever is further behind.
function growthRatio(tree) {
  const cur = STAGES[tree.stage];
  const next = STAGES[tree.stage + 1];
  if (!next) return 1;
  const progressRatio = clamp01((tree.progress - cur.requiredProgress) / Math.max(1, next.requiredProgress - cur.requiredProgress));
  const daysRatio = next.minimumDays > cur.minimumDays
    ? clamp01((tree.activeDays - cur.minimumDays) / (next.minimumDays - cur.minimumDays))
    : 1;
  return Math.min(progressRatio, daysRatio);
}

export default function TasbihScreen({ onClose }) {
  const { state, error, tap, select, retry, plant, setActive, ackDrop } = useTasbih();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const reduceMotion = useReduceMotion();
  const [selector, setSelector] = useState(false);
  const [garden, setGarden] = useState(false);
  const [pulse, setPulse] = useState(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const swipes = useMemo(() => {
    const make = direction => PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) => capturesDismiss(gesture, direction),
      onPanResponderRelease: (_event, gesture) => { if (finishesDismiss(gesture, direction)) closeRef.current(); },
      onPanResponderTerminationRequest: () => true,
    });
    return { right: make('right'), down: make('down') };
  }, []);
  const textFade = useRef(new Animated.Value(1)).current;
  const item = state ? definition(state) : DHIKR[0];
  useEffect(() => {
    textFade.setValue(0);
    Animated.timing(textFade, { toValue: 1, duration: reduceMotion ? 150 : 350, useNativeDriver: true }).start();
  }, [item.id, textFade, reduceMotion]);
  const phrase = ru ? item.ru : item.en;
  const options = [{ id: 'sequence', label: ru ? 'Последовательность' : 'Sequence' }, ...DHIKR.map(d => ({ id: d.id, label: ru ? d.ru : d.en }))];
  const tree = state ? activeTree(state) : null;
  const drop = state?.pendingDrops?.[0] || null;
  const dropKey = drop ? `${state.pendingDrops.length}:${drop.species}:${drop.reason}` : null;
  const seedTotal = state ? Object.values(state.seeds || {}).reduce((sum, n) => sum + n, 0) : 0;
  const stageLabel = tree ? (ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en) : '';
  const treeSpecies = tree ? SPECIES.find(s => s.id === tree.species) : null;
  const speciesLabel = treeSpecies ? (ru ? treeSpecies.ru : treeSpecies.en) : '';
  const ratio = tree ? growthRatio(tree) : 0;

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safe} onAccessibilityEscape={onClose} {...swipes.right.panHandlers}>
        <View style={styles.header} {...swipes.down.panHandlers}>
          <Pressable accessibilityRole="button" accessibilityLabel={ru ? 'Закрыть Тасбих' : 'Close Tasbih'}
            onPress={onClose} style={styles.iconButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Icon name="close" size={22} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>{ru ? 'Тасбих' : 'Tasbih'}</Text>
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
            <View style={styles.pillRow}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: selector }}
                accessibilityLabel={ru ? `Режим: ${options.find(o => o.id === state.selectedDhikr)?.label}. Открыть выбор` : `Mode: ${options.find(o => o.id === state.selectedDhikr)?.label}. Open picker`}
                onPress={() => setSelector(true)}>
                <GlassView radius={RADIUS.pill} style={styles.pill}>
                  <Text style={[styles.pillText, { color: accent }]}>{options.find(o => o.id === state.selectedDhikr)?.label}</Text>
                  <Icon name="down" size={14} color={accent} />
                </GlassView>
              </Pressable>
            </View>

            <Animated.View style={[styles.words, { opacity: textFade }]}>
              <Text style={styles.arabic} accessibilityLanguage="ar">{item.arabic}</Text>
              <Text style={styles.phrase}>{phrase}</Text>
              <Text style={styles.translation}>{ru ? item.translation_ru : item.translation_en}</Text>
            </Animated.View>

            <View style={styles.counter}>
              <View style={styles.counterRow}>
                <Text style={[styles.count, { color: accent }]}>{state.currentDhikrCount}</Text>
                <Text style={styles.target}>/ {item.target}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${clamp01(state.currentDhikrCount / item.target) * 100}%`, backgroundColor: accent }]} />
              </View>
              {state.selectedDhikr === 'sequence' && (
                <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
                  {DHIKR.map((d, index) => (
                    <View key={d.id} style={[styles.dot, { backgroundColor: index === state.currentDhikrIndex ? accent : COLORS.textMuted, opacity: index === state.currentDhikrIndex ? 1 : 0.35 }]} />
                  ))}
                </View>
              )}
            </View>

            <Pressable onPress={() => { tap(); hapticLight(); setPulse(v => v + 1); }} style={styles.treeArea}
              accessibilityRole="button"
              accessibilityLabel={`${ru ? 'Тасбих' : 'Tasbih'}. ${phrase}. ${state.currentDhikrCount} ${ru ? 'из' : 'of'} ${item.target}`}
              accessibilityHint={ru ? 'Нажмите дважды, чтобы засчитать одно поминание' : 'Double tap to count one remembrance'}>
              <View style={styles.treeShadow} pointerEvents="none" />
              <TreeView species={tree.species} stage={tree.stage} pulse={pulse} reduceMotion={reduceMotion} />
              {drop && <SeedDrop key={dropKey} drop={drop} reduceMotion={reduceMotion} onDone={ackDrop} />}
              <EnvironmentDebug state={state} animation={pulse ? 'tap' : 'idle'} label="tree hit area" />
            </Pressable>

            <View style={styles.footer}>
              {!state.hasSeenTasbihHint ? (
                <Text style={styles.hint}>{ru ? 'Нажимайте на дерево, чтобы считать зикр' : 'Tap the tree to count dhikr'}</Text>
              ) : (
                <>
                  <Text style={styles.stageLine}>{speciesLabel} · {stageLabel}</Text>
                  <View style={styles.growthTrack}>
                    <View style={[styles.growthFill, { width: `${ratio * 100}%`, backgroundColor: accent }]} />
                  </View>
                </>
              )}
            </View>
          </>
        )}
        <EnvironmentDebug state={state} animation="ready" label="safe content" anchor={false} />
      </SafeAreaView>

      <DraggableSheet visible={selector} onClose={() => setSelector(false)} title={ru ? 'Зикр' : 'Dhikr'}>
        {options.map(option => (
          <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: option.id === state?.selectedDhikr }}
            style={styles.option} onPress={() => { select(option.id); setSelector(false); }}>
            <View style={[styles.radio, { borderColor: accent }, option.id === state?.selectedDhikr && { backgroundColor: accent }]} />
            <Text style={styles.optionText}>{option.label}</Text>
          </Pressable>
        ))}
      </DraggableSheet>

      <GardenSheet visible={garden} onClose={() => setGarden(false)} state={state} plant={plant} setActive={setActive} />
    </ThemedBackground>
  );
}
// Фон — светлая картина (рассвет, день), поэтому текст над ним получает мягкую тень.
const LEGIBLE = { textShadowColor: 'rgba(8,18,16,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };
const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: 8, paddingBottom: 8 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,205,188,0.1)' },
  title: { ...LEGIBLE, ...TYPE.subhead, color: COLORS.text },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...TYPE.caption, fontSize: 10, lineHeight: 12, color: COLORS.navy, fontWeight: '700' },
  pillRow: { alignItems: 'center', paddingTop: SPACING.sm },
  pill: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md },
  pillText: { ...TYPE.callout, fontWeight: '600' },
  words: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.md, height: 150 },
  arabic: { ...LEGIBLE, ...ARABIC.lg, fontFamily: FONTS.arabic, color: COLORS.text, textAlign: 'center' },
  phrase: { ...LEGIBLE, ...TYPE.subhead, color: COLORS.text, textAlign: 'center', marginTop: SPACING.xs },
  translation: { ...LEGIBLE, ...TYPE.callout, color: COLORS.text, opacity: 0.85, textAlign: 'center', marginTop: 2 },
  counter: { alignItems: 'center', paddingTop: SPACING.sm },
  counterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  count: { ...LEGIBLE, ...TYPE.display, ...TYPE.mono },
  target: { ...LEGIBLE, ...TYPE.subhead, color: COLORS.textMuted, marginBottom: 4 },
  progressTrack: { width: 160, height: 3, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: SPACING.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pill },
  dots: { flexDirection: 'row', gap: 6, marginTop: SPACING.xs },
  dot: { width: 5, height: 5, borderRadius: 3 },
  treeArea: { flex: 1, width: '100%', alignSelf: 'center', marginTop: SPACING.sm },
  treeShadow: {
    position: 'absolute', left: '35%', right: '35%', top: '87%', height: 10,
    borderRadius: RADIUS.pill, backgroundColor: 'rgba(10,20,16,0.35)',
  },
  footer: { alignItems: 'center', paddingTop: SPACING.sm, paddingBottom: SPACING.xs, minHeight: 40, justifyContent: 'center' },
  hint: { ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center' },
  stageLine: { ...TYPE.callout, color: COLORS.text },
  growthTrack: { width: 160, height: 3, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: SPACING.xs, overflow: 'hidden' },
  growthFill: { height: '100%', borderRadius: RADIUS.pill },
  caption: { ...TYPE.callout, color: COLORS.text },
  error: { paddingVertical: SPACING.sm },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.sm },
  optionText: { ...TYPE.callout, color: COLORS.text },
  radio: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
});
