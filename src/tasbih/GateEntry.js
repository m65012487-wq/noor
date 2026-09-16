import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemedBackground, useReduceMotion } from '../components/ScreenWrapper';
import Text from '../components/AppText';
import { useAppearance } from '../utils/AppearanceContext';
import { useLang } from '../i18n/LanguageContext';
import { ENVIRONMENT } from '../constants/environmentTheme';
import { COLORS } from '../constants/theme';
import useTasbih from './useTasbih';
import GateAssembly from './GateAssembly';
import TreeView from './TreeView';
import EnvironmentDebug from './EnvironmentDebug';
import TasbihScreen from './TasbihScreen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GateEntry() {
  const { schemeColors } = useAppearance();
  const { state, error, sawGate } = useTasbih();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gateWidth = Math.min(96, Math.max(56, width * ENVIRONMENT.gateWidthRatio));
  const gateHeight = gateWidth * 1.2;
  const target = useRef(null);
  const measuredFrame = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const closed = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const [frame, setFrame] = useState(null);
  const [entered, setEntered] = useState(false);
  const close = () => { progress.stopAnimation(); setFrame(null); setEntered(false); busy.current = false; };
  useEffect(() => {
    if (!frame) return undefined;
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 350 : ENVIRONMENT.gateTransitionMs, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) setEntered(true); });
    return () => animation.stop();
  }, [frame, progress, reduceMotion]);
  const start = () => {
    if (busy.current || (!state && !error)) return;
    busy.current = true;
    progress.setValue(0); setEntered(false);
    setFrame(measuredFrame.current || { x: (width - gateWidth) / 2, y: height - gateHeight - 120 });
    sawGate();
  };
  const opening = progress.interpolate({ inputRange: [0, 0.1, 0.55, 1], outputRange: [0, 0, reduceMotion ? 0.08 : 1, reduceMotion ? 0.08 : 1] });
  const camera = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const treeWidth = Math.min(width - 48, 420);
  return <View style={styles.region}>
    <Pressable ref={target} onLayout={() => target.current?.measureInWindow((x, y, w, h) => {
      measuredFrame.current = { x: x + (w - gateWidth) / 2, y: y + (h - gateHeight) / 2 };
    })} onPress={start} accessibilityRole="button" accessibilityLabel={lang === 'ru' ? 'Ворота в Тасбих' : 'Enter Tasbih'}
      accessibilityState={{ disabled: !state && !error }}
      accessibilityHint={lang === 'ru' ? 'Открывает дерево и счётчик зикра' : 'Opens the tree and dhikr counter'}
      style={[styles.entry, { width: gateWidth + 24, height: gateHeight + 20 }]}>
      <GateAssembly width={gateWidth} opening={closed} stageId={state?.treeStage} palette={schemeColors} reduceMotion={reduceMotion} />
      <EnvironmentDebug state={state} animation="idle" label="gate hit frame" />
    </Pressable>
    {!!state && !state.hasSeenGateHint && <Text style={styles.hint}>{lang === 'ru' ? 'Коснитесь ворот' : 'Touch the gate'}</Text>}
    <Modal visible={!!frame} transparent={false} presentationStyle="fullScreen" animationType="none" onRequestClose={close}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
      {entered ? <TasbihScreen onClose={close} /> : <View style={{ flex: 1 }} accessibilityViewIsModal>
        <ThemedBackground camera={camera} />
        {frame && <>
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: width / 2 - treeWidth / 2, bottom: 76, width: treeWidth, height: treeWidth * 280 / 240,
            opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.3, 1] }),
            transformOrigin: '50% 90%', transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.15, 1] }) }],
          }}><TreeView stageId={state?.treeStage} pulse={0} reduceMotion={reduceMotion} /></Animated.View>
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: frame.x, top: frame.y,
            opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: camera.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : width / 2 - frame.x - gateWidth / 2] }) },
              { translateY: camera.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : height / 2 - frame.y - gateHeight / 2] }) },
              { scale: camera.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1.01 : 16] }) },
            ],
          }}><GateAssembly width={gateWidth} opening={opening} stageId={null} palette={schemeColors} reduceMotion={reduceMotion} /></Animated.View>
        </>}
        <EnvironmentDebug state={state} animation="entering" label="camera viewport" />
      </View>}
      </SafeAreaProvider>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  region: { alignItems: 'center', justifyContent: 'flex-end', paddingTop: 4 },
  entry: { alignItems: 'center', justifyContent: 'center' },
  hint: { color: COLORS.accentSoft, fontSize: 12, paddingTop: 2, textAlign: 'center' },
});
