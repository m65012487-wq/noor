import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import { ThemedBackground, useReduceMotion } from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { COLORS, TYPE, SPACING, FONTS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { useLang } from '../i18n/LanguageContext';
import { hapticLight } from '../utils/haptics';
import TreeView from './TreeView';
import useTasbih from './useTasbih';
import { definition, DHIKR } from './model';
import EnvironmentDebug from './EnvironmentDebug';

export default function TasbihScreen({ onClose }) {
  const { state, error, tap, select, retry } = useTasbih();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const reduceMotion = useReduceMotion();
  const [selector, setSelector] = useState(false);
  const [pulse, setPulse] = useState(0);
  const hint = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(1)).current;
  const item = state ? definition(state) : DHIKR[0];
  const showHint = !!state && !state.hasSeenTasbihHint;
  useEffect(() => {
    Animated.timing(hint, { toValue: showHint ? 1 : 0, duration: 700, useNativeDriver: true }).start();
  }, [showHint, hint]);
  useEffect(() => {
    textFade.setValue(0);
    Animated.timing(textFade, { toValue: 1, duration: reduceMotion ? 150 : 350, useNativeDriver: true }).start();
  }, [item.id, textFade, reduceMotion]);
  const phrase = ru ? item.ru : item.en;
  const options = [{ id: 'sequence', label: ru ? 'Последовательность' : 'Sequence' }, ...DHIKR.map(d => ({ id: d.id, label: ru ? d.ru : d.en }))];
  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{ru ? 'Тасбих' : 'Tasbih'}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.control}><Text style={{ color: accent }}>{ru ? 'Закрыть' : 'Close'}</Text></Pressable>
        </View>
        {error && <Pressable onPress={retry} accessibilityRole="button" style={styles.error}><Text style={styles.caption}>{ru ? 'Не удалось сохранить или прочитать прогресс. Нажмите, чтобы повторить.' : 'Could not save or load progress. Tap to retry.'}</Text></Pressable>}
        {!state ? <ActivityIndicator style={{ flex: 1 }} color={accent} /> : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: selector }} onPress={() => setSelector(v => !v)} style={styles.selector}>
              <Text style={[styles.caption, { color: accent }]}>{options.find(o => o.id === state.selectedDhikr)?.label} · {ru ? 'Выбрать' : 'Choose'}</Text>
            </Pressable>
            {selector && <GlassView radius={20} style={styles.menu}>
              {options.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: option.id === state.selectedDhikr }} style={styles.option}
                onPress={() => { select(option.id); setSelector(false); }}>
                <View style={[styles.radio, { borderColor: accent }, option.id === state.selectedDhikr && { backgroundColor: accent }]} />
                <Text style={styles.caption}>{option.label}</Text>
              </Pressable>)}
            </GlassView>}
            <Animated.View style={[styles.words, { opacity: textFade }]}>
              <Text style={styles.arabic} accessibilityLanguage="ar">{item.arabic}</Text>
              <Text style={styles.phrase}>{phrase}</Text>
              <Text style={styles.translation}>{ru ? item.translation_ru : item.translation_en}</Text>
              <Text style={[styles.count, { color: accent }]}>{state.currentDhikrCount} / {item.target}</Text>
            </Animated.View>
            <Pressable onPress={() => { tap(); hapticLight(); setPulse(v => v + 1); }} style={styles.treeArea}
              accessibilityRole="button"
              accessibilityLabel={`${ru ? 'Тасбих' : 'Tasbih'}. ${phrase}. ${state.currentDhikrCount} ${ru ? 'из' : 'of'} ${item.target}`}
              accessibilityHint={ru ? 'Нажмите дважды, чтобы засчитать одно поминание' : 'Double tap to count one remembrance'}>
              <TreeView stageId={state.treeStage} pulse={pulse} reduceMotion={reduceMotion} />
              <EnvironmentDebug state={state} animation={pulse ? 'tap' : 'idle'} label="tree hit area" />
            </Pressable>
            <Animated.View style={{ opacity: hint }} accessibilityElementsHidden={state.hasSeenTasbihHint} importantForAccessibility={state.hasSeenTasbihHint ? 'no-hide-descendants' : 'auto'}>
              <Text style={[styles.caption, styles.hint]}>{ru ? 'Нажимайте на дерево, чтобы считать зикр' : 'Tap the tree to count dhikr'}</Text>
            </Animated.View>
          </ScrollView>
        )}
        <EnvironmentDebug state={state} animation="ready" label="safe content" anchor={false} />
      </SafeAreaView>
    </ThemedBackground>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...TYPE.heading, color: COLORS.text },
  control: { minWidth: 70, minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' },
  content: { flexGrow: 1, paddingBottom: SPACING.md },
  selector: { alignSelf: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  words: { alignItems: 'center', paddingTop: SPACING.sm },
  arabic: { fontFamily: FONTS.arabic, fontSize: 30, lineHeight: 52, color: COLORS.text, textAlign: 'center' },
  phrase: { ...TYPE.body, color: COLORS.text, textAlign: 'center' },
  translation: { ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  count: { ...TYPE.title, ...TYPE.mono, marginTop: SPACING.md },
  treeArea: { flex: 1, minHeight: 280, maxHeight: 520, width: '100%', alignSelf: 'center' },
  caption: { ...TYPE.callout, color: COLORS.text },
  hint: { textAlign: 'center', paddingVertical: SPACING.md },
  menu: { padding: SPACING.sm },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.sm },
  radio: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  error: { paddingVertical: SPACING.sm },
});
