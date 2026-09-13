import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemedBackground, useReduceMotion } from '../components/ScreenWrapper';
import { useAppearance } from '../utils/AppearanceContext';
import { useLang } from '../i18n/LanguageContext';
import { GATE_ASSETS } from './assets';
import TasbihScreen from './TasbihScreen';

// Neutral development gate until the supplied closed/open artwork is registered.
function Gate({ amount, color }) {
  if (GATE_ASSETS.closed) return <View style={styles.gate}>
    <Animated.Image source={GATE_ASSETS.closed} style={[styles.art, { opacity: Animated.subtract(1, amount) }]} />
    {GATE_ASSETS.open && <Animated.Image source={GATE_ASSETS.open} style={[styles.art, { opacity: amount }]} />}
  </View>;
  return <View style={styles.gate}>
    <View style={[styles.post, { left: 0, backgroundColor: color }]} />
    <View style={[styles.post, { right: 0, backgroundColor: color }]} />
    {[-1, 1].map(side => <Animated.View key={side} style={[styles.leaf, { left: side < 0 ? 7 : 45, borderColor: color,
      transformOrigin: side < 0 ? 'left center' : 'right center',
      transform: [{ perspective: 300 }, { rotateY: amount.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${side * 76}deg`] }) }],
    }]}>
      {[9, 18, 27].map(left => <View key={left} style={{ position: 'absolute', left, top: 2, bottom: 2, width: 1, backgroundColor: color }} />)}
    </Animated.View>)}
  </View>;
}

export default function GateEntry() {
  const { accent } = useAppearance();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const target = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const closed = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const [frame, setFrame] = useState(null);
  const [entered, setEntered] = useState(false);
  const close = () => { progress.stopAnimation(); setFrame(null); setEntered(false); busy.current = false; };
  useEffect(() => () => progress.stopAnimation(), [progress]);
  const start = () => {
    if (busy.current) return;
    busy.current = true;
    target.current?.measureInWindow((x, y, w, h) => {
      setFrame({ x: x + (w - 90) / 2, y: y + (h - 78) / 2 });
      setEntered(false);
      progress.setValue(0);
    });
  };
  const animate = () => {
    Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 300 : 1300, useNativeDriver: true })
      .start(({ finished }) => { if (finished) setEntered(true); });
  };
  const open = progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, reduceMotion ? 0 : 1, reduceMotion ? 0 : 1] });
  return <>
    <Pressable ref={target} onPress={start} accessibilityRole="button" accessibilityLabel={lang === 'ru' ? 'Ворота в Тасбих' : 'Enter Tasbih'}
      accessibilityHint={lang === 'ru' ? 'Открывает дерево и счётчик зикра' : 'Opens the tree and dhikr counter'} style={styles.entry}>
      <Gate amount={closed} color={accent} />
    </Pressable>
    <Modal visible={!!frame} transparent={false} animationType="none" onShow={animate} onRequestClose={close}>
      {entered ? <TasbihScreen onClose={close} /> : <View style={{ flex: 1 }} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1 : 1.15] }) }] }]}>
          <ThemedBackground />
        </Animated.View>
        {frame && <Animated.View pointerEvents="none" style={{ position: 'absolute', left: frame.x, top: frame.y,
          opacity: progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : width / 2 - frame.x - 45] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? 0 : height / 2 - frame.y - 39] }) },
            { scale: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, reduceMotion ? 1 : 1.3, reduceMotion ? 1 : 18] }) },
          ],
        }}><Gate amount={open} color={accent} /></Animated.View>}
      </View>}
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  entry: { position: 'absolute', right: 28, bottom: 105, width: 108, height: 96, alignItems: 'center', justifyContent: 'center' },
  gate: { width: 90, height: 78 },
  post: { position: 'absolute', bottom: 0, width: 5, height: 78, borderRadius: 2 },
  leaf: { position: 'absolute', bottom: 6, width: 38, height: 62, borderWidth: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  art: { width: 90, height: 78, resizeMode: 'contain' },
});
