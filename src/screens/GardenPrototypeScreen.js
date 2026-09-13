import React, { memo, useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Animated, Easing,
  AccessibilityInfo, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Path, SvgXml } from 'react-native-svg';
import Text from '../components/AppText';
import { SPACING, RADIUS, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { OLIVE_STAGES, OLIVE_VIEWBOX } from '../garden/oliveStages';

// Прототип сада: одно место для посадки и одна олива, которая по кнопке
// проходит пять стадий. Это демонстрация рисунков и перехода между ними,
// а не система: состояние локальное, ничего не сохраняется и ни с чем
// не связано — ни с зикрами, ни с чтением Корана.
//
// Сцена светлая и тёплая, в отличие от остального приложения: палитра
// сада задана отдельно и не зависит от выбранной цветовой схемы.

const G = {
  skyTop: '#F3EEE3',
  skyBottom: '#E7DFCD',
  ground: '#DCD4C0',
  groundInner: '#D1C8B2',
  spot: '#A8957F',
  stone: '#B3AEA4',
  stoneDark: '#9C978D',
  grass: '#9CAB86',
  text: '#4F5D45',
  textMuted: '#8A8577',
  button: '#6F7F5A',
  buttonText: '#F6F2E8',
};

// Основание ствола во всех SVG стоит в одной точке viewBox. Отсюда же
// считается точка, от которой растение «вырастает» при смене стадии.
const BASE_Y = 252;
const ORIGIN = `50% ${((BASE_Y / OLIVE_VIEWBOX.height) * 100).toFixed(1)}%`;

const STAGE_KEYS = ['garden_seed', 'garden_sprout', 'garden_young', 'garden_tree_young', 'garden_tree_mature'];

const Plant = memo(function Plant({ xml, width, height }) {
  return <SvgXml xml={xml} width={width} height={height} />;
});

// Земля в той же системе координат, что и растение: пятно и лунка
// совпадают с основанием ствола при любом размере экрана.
const Ground = memo(function Ground({ width, height }) {
  const { width: vw, height: vh } = OLIVE_VIEWBOX;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${vw} ${vh}`} style={StyleSheet.absoluteFill}>
      <Ellipse cx={120} cy={255} rx={112} ry={19} fill={G.ground} />
      <Ellipse cx={116} cy={256} rx={78} ry={12} fill={G.groundInner} fillOpacity={0.7} />
      <Ellipse cx={120} cy={253} rx={30} ry={5.5} fill={G.spot} fillOpacity={0.45} />
      <Ellipse cx={42} cy={259} rx={4.5} ry={2.6} fill={G.stone} />
      <Ellipse cx={49} cy={261} rx={2.6} ry={1.6} fill={G.stoneDark} />
      <Ellipse cx={196} cy={257} rx={3.6} ry={2.2} fill={G.stone} />
      <Path d="M24 257q2-7 5-9M27 258q1-5 0-9M30 258q2-4 5-6M206 262q1-6 4-8M209 262q0-5-2-8"
        stroke={G.grass} strokeWidth={1.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
});

export default function GardenPrototypeScreen({ visible, onClose }) {
  const { t } = useLang();
  const { width: screenW } = useWindowDimensions();
  const w = Math.min(screenW * 0.86, 340);
  const h = (w * OLIVE_VIEWBOX.height) / OLIVE_VIEWBOX.width;

  // -1 — пустая лунка до посадки.
  const [stage, setStage] = useState(-1);
  const [prevStage, setPrevStage] = useState(-1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const enter = useRef(new Animated.Value(1)).current;
  const leave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // При закрытии сцена возвращается к пустой лунке: прототип ничего не хранит.
  useEffect(() => {
    if (!visible) { setStage(-1); setPrevStage(-1); enter.setValue(1); leave.setValue(0); }
  }, [visible, enter, leave]);

  function goTo(next) {
    setPrevStage(stage);
    setStage(next);
    enter.setValue(0);
    leave.setValue(1);
    // Новая стадия проявляется чуть дольше, чем гаснет старая: картинки
    // короткое время перекрываются, и пустого кадра между ними нет.
    Animated.parallel([
      Animated.timing(enter, { toValue: 1, duration: reduceMotion ? 250 : 900,
        easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(leave, { toValue: 0, duration: reduceMotion ? 200 : 650,
        easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]).start();
  }

  const last = OLIVE_STAGES.length - 1;
  const onMain = () => goTo(stage >= last ? -1 : stage + 1);
  const mainLabel = stage < 0 ? t('garden_plant') : stage >= last ? t('garden_again') : t('garden_grow');

  const enterScale = reduceMotion ? 1 : enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const leaveScale = reduceMotion ? 1 : leave.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <LinearGradient colors={[G.skyTop, G.skyBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.headerBtn}>{t('garden_close')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('garden_title')}</Text>
          {/* Сброс виден только когда есть что сбрасывать; место под ним
              держится всегда, чтобы заголовок не смещался. */}
          <TouchableOpacity onPress={() => goTo(-1)} disabled={stage < 0}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.headerBtn, styles.right, stage < 0 && { opacity: 0 }]}>{t('garden_reset')}</Text>
          </TouchableOpacity>
        </View>

        {/* Сцена чуть выше центра: снизу её уравновешивают подпись и кнопка. */}
        <View style={styles.scene}>
          <View style={{ width: w, height: h }}>
            <Ground width={w} height={h} />
            {prevStage >= 0 && prevStage !== stage && (
              <Animated.View style={[StyleSheet.absoluteFill,
                { opacity: leave, transform: [{ scale: leaveScale }], transformOrigin: ORIGIN }]}>
                <Plant xml={OLIVE_STAGES[prevStage].xml} width={w} height={h} />
              </Animated.View>
            )}
            {stage >= 0 && (
              <Animated.View key={stage} style={[StyleSheet.absoluteFill,
                { opacity: enter, transform: [{ scale: enterScale }], transformOrigin: ORIGIN }]}>
                <Plant xml={OLIVE_STAGES[stage].xml} width={w} height={h} />
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.stageName}>
            {stage < 0 ? t('garden_empty') : t(STAGE_KEYS[stage])}
          </Text>
          <Text style={styles.stageStep}>
            {stage < 0 ? ' ' : `${stage + 1} / ${OLIVE_STAGES.length}`}
          </Text>
          <TouchableOpacity style={styles.button} onPress={onMain} activeOpacity={0.8}>
            <Text style={styles.buttonText}>{mainLabel}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  headerBtn: { ...TYPE.callout, color: G.textMuted, minWidth: 80 },
  right: { textAlign: 'right' },
  headerTitle:{ ...TYPE.overline, color: G.text },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: SPACING.xl },
  footer: { alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  stageName: { ...TYPE.subhead, color: G.text },
  stageStep: { ...TYPE.caption, color: G.textMuted, marginTop: SPACING.xxs, marginBottom: SPACING.md },
  button: { backgroundColor: G.button, borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm + 4, paddingHorizontal: SPACING.xl },
  buttonText: { ...TYPE.callout, color: G.buttonText, fontWeight: '600', letterSpacing: 0.3 },
});
