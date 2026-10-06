import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Text from './AppText';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { makeScheme } from '../utils/AppearanceContext';

// Палитра своего цвета: квадрат насыщенности и яркости и полоса оттенка —
// любой цвет, а не выбор из готовых. Рядом сразу видно, во что он
// превратится: из одного тона собирается вся схема (фон, узор, акцент).

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

function hexToHsv(hex) {
  const n = parseInt((hex || '#5b8fd6').replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

export function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((t) => Math.round((t + m) * 255).toString(16).padStart(2, '0')).join('');
}

const HUES = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];
const THUMB = 26;

// Перетаскивание по прямоугольнику: положение пальца на экране минус
// положение подложки. locationX ненадёжен — он считается от того элемента,
// над которым палец сейчас (ползунок, градиент), а не от подложки.
function useDrag(ref, onMove) {
  const origin = useRef({ x: 0, y: 0 });
  // Пока подложка не измерена, движение пропускается: иначе первый кадр
  // считался бы от старого или нулевого начала и ползунок дёргался к краю.
  const ready = useRef(false);
  const cb = useRef(onMove);
  cb.current = onMove;
  return useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      ready.current = false;
      ref.current?.measureInWindow((x, y) => {
        origin.current = { x, y };
        ready.current = true;
        cb.current(pageX - x, pageY - y);
      });
    },
    onPanResponderMove: (_, g) => {
      if (ready.current) cb.current(g.moveX - origin.current.x, g.moveY - origin.current.y);
    },
  }), [ref]);
}

export default function ColorPicker({ visible, value, onCancel, onDone, t }) {
  const { width } = useWindowDimensions();
  const boxW = Math.min(width - SPACING.lg * 2 - SPACING.md * 2, 340);
  const boxH = Math.round(boxW * 0.62);
  const [hsv, setHsv] = useState(() => hexToHsv(value));

  // Каждое открытие начинается с текущего своего цвета.
  useEffect(() => { if (visible) setHsv(hexToHsv(value)); }, [visible, value]);

  const svRef = useRef(null);
  const hueRef = useRef(null);
  const svDrag = useDrag(svRef, (x, y) => setHsv((p) => ({ ...p, s: clamp(x / boxW), v: 1 - clamp(y / boxH) })));
  const hueDrag = useDrag(hueRef, (x) => setHsv((p) => ({ ...p, h: clamp(x / boxW) * 359.9 })));

  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const pure = hsvToHex(hsv.h, 1, 1);
  const scheme = makeScheme(hex);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t('custom_color')}</Text>

          {/* Насыщенность слева направо, яркость сверху вниз. */}
          <View ref={svRef} style={[styles.box, { width: boxW, height: boxH, backgroundColor: pure }]} {...svDrag.panHandlers}>
            <LinearGradient colors={['#ffffff', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill} pointerEvents="none" />
            <LinearGradient colors={['rgba(0,0,0,0)', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View pointerEvents="none" style={[styles.thumb, {
              left: hsv.s * boxW - THUMB / 2, top: (1 - hsv.v) * boxH - THUMB / 2, backgroundColor: hex,
            }]} />
          </View>

          {/* Оттенок по кругу. */}
          <View ref={hueRef} style={[styles.hue, { width: boxW }]} {...hueDrag.panHandlers}>
            <LinearGradient colors={HUES} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, styles.hueBar]} pointerEvents="none" />
            <View pointerEvents="none" style={[styles.thumb, styles.hueThumb, {
              left: (hsv.h / 360) * boxW - THUMB / 2, backgroundColor: pure,
            }]} />
          </View>

          {/* Во что превратится схема: фон, узор и акцент из этого цвета. */}
          <LinearGradient colors={scheme.bg} style={styles.preview}>
            <View style={[styles.previewDot, { backgroundColor: hex }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewTitle, { color: scheme.accent }]}>{t('prayer_title')}</Text>
              <Text style={[styles.previewText, { color: `rgb(${scheme.tint})` }]}>{hex.toUpperCase()}</Text>
            </View>
          </LinearGradient>

          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>{t('cancel')}</Text>
            </Pressable>
            <Pressable onPress={() => onDone(hex)} style={[styles.btn, { backgroundColor: scheme.accent }]}>
              <Text style={styles.btnText}>{t('done_btn')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.lg },
  card: { backgroundColor: '#1d2129', borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  title: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700', marginBottom: SPACING.md },
  box: { borderRadius: RADIUS.sm, overflow: 'hidden' },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    borderWidth: 3, borderColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  hue: { height: 28, marginTop: SPACING.md, justifyContent: 'center' },
  hueBar: { borderRadius: 14 },
  hueThumb: { top: 1 },
  preview: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: SPACING.md,
    marginTop: SPACING.md, gap: SPACING.md },
  previewDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  previewTitle: { ...TYPE.subhead, fontWeight: '700' },
  previewText: { ...TYPE.caption, marginTop: 2, letterSpacing: 1 },
  buttons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn: { flex: 1, minHeight: 46, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.10)' },
  btnGhostText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  btnText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '800' },
});
