import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemedBackground, useReduceMotion } from '../components/ScreenWrapper';
import Text from '../components/AppText';
import { useLang } from '../i18n/LanguageContext';
import { ENVIRONMENT } from '../constants/environmentTheme';
import { COLORS } from '../constants/theme';
import useTasbih from './useTasbih';
import { activeTree } from './model';
import GateAssembly from './GateAssembly';
import { GATE_GEOMETRY } from './assets';
import TreeView from './TreeView';
import EnvironmentDebug from './EnvironmentDebug';
import TasbihScreen from './TasbihScreen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GateEntry() {
  const { state, error, sawGate } = useTasbih();
  const tree = state ? activeTree(state) : null;
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gateWidth = Math.min(112, Math.max(64, width * ENVIRONMENT.gateWidthRatio));
  const gateHeight = gateWidth * GATE_GEOMETRY.aspect;
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
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 300 : ENVIRONMENT.gateTransitionMs,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
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
  const opening = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, reduceMotion ? 0.08 : 1, reduceMotion ? 0.08 : 1] });
  const glow = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.25, 1, 1], extrapolate: 'clamp' });
  const camera = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
  const treeWidth = Math.min(width - 48, 420);
  const openingCenterX = (GATE_GEOMETRY.opening.left + GATE_GEOMETRY.opening.right) / 2;
  const openingCenterY = (GATE_GEOMETRY.opening.top + GATE_GEOMETRY.opening.bottom) / 2;
  return <View style={styles.region}>
    <Pressable ref={target} onLayout={() => target.current?.measureInWindow((x, y, w, h) => {
      measuredFrame.current = { x: x + (w - gateWidth) / 2, y: y + (h - gateHeight) / 2 };
    })} onPress={start} accessibilityRole="button" accessibilityLabel={lang === 'ru' ? 'Ворота в Тасбих' : 'Enter Tasbih'}
      accessibilityState={{ disabled: !state && !error }}
      accessibilityHint={lang === 'ru' ? 'Открывает дерево и счётчик зикра' : 'Opens the tree and dhikr counter'}
      style={[styles.entry, { width: gateWidth + 24, height: gateHeight + 20 }]}>
      <GateAssembly width={gateWidth} opening={closed} breathing tree={tree} reduceMotion={reduceMotion} />
      <EnvironmentDebug state={state} animation="idle" label="gate hit frame" />
    </Pressable>
    {!!state && !state.hasSeenGateHint && <Text style={styles.hint}>{lang === 'ru' ? 'Коснитесь ворот' : 'Touch the gate'}</Text>}
    <Modal visible={!!frame} transparent={false} presentationStyle="fullScreen" animationType="none" onRequestClose={close}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
      {entered ? <TasbihScreen onClose={close} /> : <View style={{ flex: 1 }} accessibilityViewIsModal>
        <ThemedBackground camera={camera} />
        {frame && <>
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: width / 2 - treeWidth / 2, bottom: 76, width: treeWidth, height: treeWidth * 1.25,
            opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.3, 1] }),
            transformOrigin: '50% 90%', transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.15, 1] }) }],
          }}>{tree && <TreeView species={tree.species} stage={tree.stage} pulse={0} reduceMotion={reduceMotion} />}</Animated.View>
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: frame.x, top: frame.y,
            opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: camera.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : width / 2 - (frame.x + gateWidth * openingCenterX)] }) },
              { translateY: camera.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : height / 2 - (frame.y + gateHeight * openingCenterY)] }) },
              { scale: camera.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1.01 : 7] }) },
            ],
          }}><GateAssembly width={gateWidth} opening={opening} glow={glow} breathing={false} tree={null} reduceMotion={reduceMotion} /></Animated.View>
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
