import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemedBackground, useReduceMotion } from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import Icon from '../components/Icon';
import Text from '../components/AppText';
import { useLang } from '../i18n/LanguageContext';
import { ENVIRONMENT } from '../constants/environmentTheme';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import useTasbih from './useTasbih';
import { activeTree } from './model';
import GateAssembly from './GateAssembly';
import { gateFor } from './assets';
import GardenBackground from './GardenBackground';
import TreeView from './TreeView';
import EnvironmentDebug from './EnvironmentDebug';
import TasbihScreen from './TasbihScreen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Gate is part of the landscape, not a locked door waiting to be discovered:
// it stands ajar (see GateAssembly's rest angle) with the tree already
// visible through the opening, and a glass card underneath names what it
// leads to. Tapping either the gate or the card opens it the same way.
export default function GateEntry() {
  const { state, error, sawGate } = useTasbih();
  const tree = state ? activeTree(state) : null;
  const { lang } = useLang();
  const { schemeColors, accent } = useAppearance();
  // Non-environment schemes have no `theme` field — gateFor() falls back to
  // the garden gate for them, same as the spec asks.
  const theme = schemeColors?.theme;
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gateWidth = theme === 'winter' ? Math.min(172, width * 0.40) : Math.min(320, width * 0.74);
  const { geometry } = gateFor(theme);
  const gateHeight = gateWidth * geometry.aspect;
  const target = useRef(null);
  const measuredFrame = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  // Constant 0: GateAssembly's own rest angle (doors ajar) already draws the
  // idle look, so the idle instance never needs to be driven anywhere.
  const idleOpening = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const mounted = useRef(true);
  const [frame, setFrame] = useState(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const close = () => {
    progress.stopAnimation();
    setFrame(null);
    setEntered(false);
    busy.current = false;
  };
  useEffect(() => {
    if (!frame) return undefined;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 300 : ENVIRONMENT.gateTransitionMs,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => { if (finished && mounted.current) setEntered(true); });
    return () => animation.stop();
  }, [frame, progress, reduceMotion]);
  const start = () => {
    if (busy.current || (!state && !error)) return;
    busy.current = true;
    progress.setValue(0);
    setEntered(false);
    setFrame(measuredFrame.current || { x: (width - gateWidth) / 2, y: height - gateHeight - 160 });
    sawGate();
  };
  // reduceMotion: doors barely crack open and the whole thing settles in
  // 300ms — the swing and the six-times camera zoom below are exactly the
  // kind of motion "Уменьшение движения" exists to suppress.
  const opening = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, reduceMotion ? 0.08 : 1, reduceMotion ? 0.08 : 1] });
  const glow = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.25, 1, 1], extrapolate: 'clamp' });
  const camera = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
  // The tasbih garden fades in over the last third of the approach, once the
  // camera is close enough that the environment scene behind it no longer
  // matters.
  const gardenOpacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const gardenCamera = progress.interpolate({ inputRange: [0.7, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const treeWidth = Math.min(width - 48, 420);
  const openingCenterX = (geometry.opening.left + geometry.opening.right) / 2;
  const openingCenterY = (geometry.opening.top + geometry.opening.bottom) / 2;
  const enabled = !!state || !!error;
  const label = lang === 'ru' ? 'Тасбих' : 'Tasbih';
  const subtitle = lang === 'ru' ? 'Войдите в сад зикра' : 'Enter the garden of dhikr';
  return <View style={styles.region}>
    <Pressable ref={target} onLayout={() => target.current?.measureInWindow((x, y, w, h) => {
      measuredFrame.current = { x: x + (w - gateWidth) / 2, y: y + (h - gateHeight) / 2 };
    })} onPress={start} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      accessibilityHint={lang === 'ru' ? 'Открывает дерево и счётчик зикра' : 'Opens the tree and dhikr counter'}
      style={[styles.entry, { width: gateWidth + 24, height: gateHeight + 20 }]}>
      <GateAssembly width={gateWidth} opening={idleOpening} breathing tree={tree} reduceMotion={reduceMotion} theme={theme} />
      <EnvironmentDebug state={state} animation="idle" label="gate hit frame" />
    </Pressable>
    <Pressable onPress={start} disabled={!enabled} accessibilityRole="button"
      accessibilityLabel={`${label}. ${subtitle}`} style={styles.cardWrap}>
      <GlassView azure radius={RADIUS.pill} style={styles.card}>
        <View style={styles.cardRow}>
          <Icon name="leaf" size={18} color={accent} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{label}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
          <Icon name="forward" size={16} color={COLORS.textMuted} />
        </View>
      </GlassView>
    </Pressable>
    <Modal visible={!!frame} transparent={false} presentationStyle="fullScreen" animationType="none" onRequestClose={close}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
      {entered ? <TasbihScreen onClose={close} /> : frame ? <View style={{ flex: 1 }} accessibilityViewIsModal>
        <ThemedBackground camera={camera} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: gardenOpacity }]}>
          <GardenBackground camera={reduceMotion ? null : gardenCamera} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', left: width / 2 - treeWidth / 2, bottom: 76, width: treeWidth, height: treeWidth * 1.25,
          opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.3, 1] }),
          transformOrigin: '50% 90%', transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.15, 1] }) }],
        }}>{!!tree && <TreeView species={tree.species} stage={tree.stage} pulse={0} reduceMotion={reduceMotion} />}</Animated.View>
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', left: frame.x, top: frame.y,
          opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: camera.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : width / 2 - (frame.x + gateWidth * openingCenterX)] }) },
            { translateY: camera.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : height / 2 - (frame.y + gateHeight * openingCenterY)] }) },
            { scale: camera.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1.01 : 6] }) },
          ],
        }}><GateAssembly width={gateWidth} opening={opening} glow={glow} breathing={false} tree={null} reduceMotion={reduceMotion} theme={theme} /></Animated.View>
        <EnvironmentDebug state={state} animation="entering" label="camera viewport" />
      </View> : null}
      </SafeAreaProvider>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  region: { alignItems: 'center', justifyContent: 'flex-end', paddingTop: 4 },
  entry: { alignItems: 'center', justifyContent: 'center' },
  cardWrap: { width: '100%', paddingHorizontal: SPACING.lg, marginTop: SPACING.xs },
  card: { alignSelf: 'stretch' },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  cardText: { flex: 1, marginLeft: SPACING.sm },
  cardTitle: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  cardSubtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 1 },
});
