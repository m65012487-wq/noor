import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Animated, Easing, TouchableOpacity, Modal } from 'react-native';
import Text from '../components/AppText';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import Icon from '../components/Icon';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING, RADIUS, TYPE } from '../constants/theme';
import { getQiblaBearing } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';
import { useLocation } from '../utils/LocationContext';
import { useAppearance } from '../utils/AppearanceContext';
import { useTabSwipe } from '../utils/useTabSwipe';
import { hapticSuccess } from '../utils/haptics';
import { useFocusEffect } from '@react-navigation/native';

const DISC = 300;
const NEEDLE_LEN = DISC / 2 - 34;

// Буквы сторон света ставятся тем же приёмом, что и насечки: обёртка во весь
// диск поворачивается на нужный угол, а буква лежит у её верхнего края. Так
// каждая буква разворачивается по своему радиусу, как на картушке настоящего
// компаса.
//
// Раньше они были расставлены абсолютными отступами и оставались стоять прямо:
// «E» и «W» ложились поперёк своего радиуса, а отступы у всех четырёх были
// разные (42, 26, 24, 24), поэтому буквы сидели на разном удалении от обода.
const CARDINALS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];


export default function QiblaScreen() {
  const { t } = useLang();
  const { coords } = useLocation();
  const { accent } = useAppearance();
  const swipe = useTabSwipe('Qibla');
  const [heading, setHeading] = useState(0);
  const [qibla, setQibla] = useState(null);
  const [calibrateOpen, setCalibrateOpen] = useState(false);
  // Датчик сбит — рядом магнит или прибор не откалиброван. Раньше об этом
  // нельзя было узнать: компас просто врал, и причина оставалась неясной.
  const [needsCalibration, setNeedsCalibration] = useState(false);
  // Текущая погрешность датчика в градусах. Нужна окну калибровки:
  // без неё оно оставалось инструкцией, которую нечем закрыть по существу.
  const [accuracy, setAccuracy] = useState(null);
  const calGood = typeof accuracy === 'number' && accuracy > 0 && accuracy <= 15;
  const dialRotate = useRef(new Animated.Value(0)).current;
  const needleRotate = useRef(new Animated.Value(0)).current;
  const dialCont = useRef(0);   // continuous (unwrapped) dial angle
  const needleCont = useRef(0); // continuous (unwrapped) needle angle
  const smoothed = useRef(0);
  const focused = useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      focused.current = true;
      return () => { focused.current = false; };
    }, [])
  );

  useEffect(() => {
    if (coords) setQibla(getQiblaBearing(coords.lat, coords.lng));
  }, [coords]);

  // Prefer the OS true-heading (sensor-fused, declination applied).
  // Fall back to raw magnetometer only if heading updates aren't available.
  useEffect(() => {
    let headingSub, magSub, mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          headingSub = await Location.watchHeadingAsync((h) => {
            if (!mounted) return;
            // trueHeading учитывает магнитное склонение, поэтому он точнее;
            // отрицательное значение означает, что система его ещё не знает.
            const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
            if (typeof deg !== "number" || Number.isNaN(deg)) return;
            // accuracy на iOS — погрешность в градусах. Больше 25 означает,
            // что датчик сбит: рядом магнит или прибор не откалиброван.
            if (typeof h.accuracy === "number") setAccuracy(h.accuracy);
            setNeedsCalibration(typeof h.accuracy === "number" && h.accuracy > 25);
            setHeading(smooth(deg));
          });
          return;
        }
      } catch (e) {}
      // Fallback: raw magnetometer
      Magnetometer.setUpdateInterval(80);
      magSub = Magnetometer.addListener((data) => {
        if (!mounted) return;
        let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
        angle = (90 - angle + 360) % 360;
        setHeading(smooth(angle));
      });
    })();
    return () => {
      mounted = false;
      headingSub && headingSub.remove && headingSub.remove();
      magSub && magSub.remove && magSub.remove();
    };
  }, []);

  function smooth(target) {
    let prev = smoothed.current;
    let diff = target - prev;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    // Мёртвая зона гасит дрожание датчика, коэффициент задаёт скорость
    // догона. При 0.12 стрелка сдвигалась на восьмую часть отставания за
    // обновление: разворот телефона она отрабатывала полторы секунды и
    // выглядела залипшей. 0.32 держит компас за рукой, дрожь глушит зона.
    if (Math.abs(diff) < 0.5) return prev;
    let next = (prev + diff * 0.32 + 360) % 360;
    smoothed.current = next;
    return next;
  }

  // Dial rotates opposite to heading so N tracks real north.
  const dialAngle = (-heading + 360) % 360;
  // Needle points to Qibla relative to where the phone faces.
  const needleAngle = qibla != null ? (qibla - heading + 360) % 360 : 0;
  const aligned = qibla != null && Math.abs(((needleAngle + 180) % 360) - 180) < 5;

// Окно калибровки закрывается само, когда датчик выправился и держится  // ровно полторы секунды. Раньше оно было инструкцией без обратной связи:  // человек крутил телефон и не понимал, помогло ли, а закрывать приходилось  // вручную независимо от результата.  const calibratedSince = useRef(null);  useEffect(() => {    if (!calibrateOpen) { calibratedSince.current = null; return undefined; }    const good = typeof accuracy === 'number' && accuracy > 0 && accuracy <= 15;    if (!good) { calibratedSince.current = null; return undefined; }    if (calibratedSince.current == null) calibratedSince.current = Date.now();    const held = Date.now() - calibratedSince.current;    if (held >= 1500) {      if (focused.current) hapticSuccess();      setCalibrateOpen(false);      return undefined;    }    const timer = setTimeout(() => setAccuracy((a) => a), 1500 - held);    return () => clearTimeout(timer);  }, [calibrateOpen, accuracy]);
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) {
      if (focused.current) hapticSuccess();
      wasAligned.current = true;
    } else if (!aligned) wasAligned.current = false;
  }, [aligned]);

  // Unwrap a target (0..360) onto a continuous track so the animation always
  // takes the SHORTEST path and never spins the long way around 0°/360°.
  function unwrap(prevCont, target) {
    const prevMod = ((prevCont % 360) + 360) % 360;
    let delta = target - prevMod;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return prevCont + delta;
  }

  useEffect(() => {
    dialCont.current = unwrap(dialCont.current, dialAngle);
    Animated.timing(dialRotate, { toValue: dialCont.current, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [dialAngle]);
  useEffect(() => {
    needleCont.current = unwrap(needleCont.current, needleAngle);
    Animated.timing(needleRotate, { toValue: needleCont.current, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [needleAngle]);

  const dialSpin = dialRotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const needleSpin = needleRotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  // Насечки циферблата: 24 штуки через 15°, каждая шестая — крупная.
  // Раньше по кругу стояли только четыре буквы, и понять поворот было нельзя.
  const ticks = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ angle: i * 15, major: i % 6 === 0 })),
    []
  );

  return (
    <ScreenWrapper swipeHandlers={swipe}>
      <SectionTitle>{t('qibla_title')}</SectionTitle>
      <Subtitle>{t('qibla_subtitle')}</Subtitle>

      {qibla == null ? (
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 80 }} />
      ) : (
        <View style={styles.center}>
          <View style={styles.compassArea}>
            {/* Диск неподвижен: блик стекла не должен вращаться вместе с циферблатом */}
            <GlassView clip radius={DISC / 2} azure intensity={42}
              style={[styles.disc, aligned && { borderColor: accent, borderWidth: 2 }]}>
              <View style={styles.discInner}>

                {/* Вращается только циферблат: насечки и буквы сторон света */}
                <Animated.View style={[styles.dialLayer, { transform: [{ rotate: dialSpin }] }]}>
                  {ticks.map((tick) => (
                    <View key={tick.angle}
                      style={[styles.tickWrap, { transform: [{ rotate: `${tick.angle}deg` }] }]}>
                      <View style={[styles.tickMark, tick.major && styles.tickMajor]} />
                    </View>
                  ))}

                  <View style={styles.northMark}>
                    <View style={styles.northTri} />
                  </View>
                  {CARDINALS.map((c) => (
                    <View key={c.label}
                      style={[styles.cardWrap, { transform: [{ rotate: `${c.angle}deg` }] }]}>
                      <Text style={styles.card}>{c.label}</Text>
                    </View>
                  ))}
                </Animated.View>

                {/* Стрелка на Каабу: узкий луч и точка на ободе */}
                <Animated.View style={[styles.needleLayer, { transform: [{ rotate: needleSpin }] }]}>
                  <View style={[styles.rimDot, { backgroundColor: aligned ? accent : COLORS.white }]} />
                  <View style={[styles.needleStem,
                    { backgroundColor: aligned ? accent : 'rgba(255,255,255,0.55)' }]}>
                    <View style={[styles.needleHead,
                      { borderBottomColor: aligned ? accent : 'rgba(255,255,255,0.95)' }]} />
                  </View>
                </Animated.View>

                <View style={[styles.hub, aligned && { borderColor: accent }]} />
              </View>
            </GlassView>
          </View>

          <Text style={styles.deg}>{Math.round(qibla)}°</Text>
          <Text style={styles.degLabel}>{t('qibla_bearing')}</Text>
          {aligned
            ? <Text style={[styles.aligned, { color: accent }]}>{t('qibla_aligned')}</Text>
            : <Text style={styles.heading}>{Math.round(heading)}°</Text>}

          <TouchableOpacity onPress={() => setCalibrateOpen(true)}
            style={[styles.calibrateBtn, needsCalibration && styles.calibrateWarn]}>
            <Icon name="refresh" size={15}
              color={needsCalibration ? COLORS.warning : COLORS.accentSoft} />
            <Text style={[styles.calibrateText,
              needsCalibration && { color: COLORS.warning }]}>  {t("calibrate")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={calibrateOpen} animationType="fade" transparent onRequestClose={() => setCalibrateOpen(false)}>
        <View style={styles.calBackdrop}>
          <View style={styles.calCard}>
            <Icon name="refresh" size={48} color={COLORS.accentSoft} style={{ marginBottom: SPACING.md }} />
            <Text style={styles.calTitle}>{t('calibrate')}</Text>
            <Text style={styles.calHint}>{t('calibrate_hint')}</Text>

            {/* Живое состояние датчика: без него окно было инструкцией,
                после которой неясно, изменилось ли что-нибудь. */}
            <View style={styles.calStatus}>
              <View style={[styles.calDot, { backgroundColor: calGood ? COLORS.success : COLORS.warning }]} />
              <Text style={styles.calStatusText}>
                {accuracy == null
                  ? t('cal_waiting')
                  : `${t(calGood ? 'cal_good' : 'cal_poor')} · ±${Math.round(accuracy)}°`}
              </Text>
            </View>

            <TouchableOpacity style={styles.calBtn} onPress={() => setCalibrateOpen(false)}>
              <Text style={styles.calBtnText}>{t('got_it')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', marginTop: SPACING.xl },
  compassArea: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  disc: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  discInner: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  dialLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  // Насечка рисуется как полоска у верхнего края обёртки во всю высоту диска,
  // а сама обёртка поворачивается: так шкала расходится ровным веером.
  tickWrap: { position: 'absolute', width: DISC, height: DISC, alignItems: 'center' },
  tickMark: { width: 1.5, height: 8, marginTop: 10, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.35)' },
  tickMajor: { width: 2, height: 14, backgroundColor: 'rgba(255,255,255,0.65)' },

  northMark: { position: 'absolute', top: 26, alignItems: 'center' },
  northTri: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 12,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: COLORS.danger },

  // Обёртка во весь диск: буква прижата к её верхнему краю и уезжает вместе
  // с поворотом. Отступ 40 разводит букву с треугольником севера (он занимает
  // 26–38) и оставляет её внутри насечек.
  cardWrap: { position: 'absolute', width: DISC, height: DISC, alignItems: 'center' },
  card: { ...TYPE.caption, color: COLORS.text, fontWeight: '700', marginTop: 40 },

  needleLayer: { position: 'absolute', width: DISC, height: DISC,
    alignItems: 'center', justifyContent: 'center' },
  // Точка на ободе показывает точное направление, даже когда луч не виден целиком.
  rimDot: { position: 'absolute', top: 6, width: 7, height: 7, borderRadius: 3.5 },
  needleStem: { position: 'absolute', top: DISC / 2 - NEEDLE_LEN, height: NEEDLE_LEN, width: 5,
    borderRadius: 2.5, alignItems: 'center' },
  needleHead: { position: 'absolute', top: -18, width: 0, height: 0,
    borderLeftWidth: 13, borderRightWidth: 13, borderBottomWidth: 26,
    borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  hub: { position: 'absolute', width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.accentSoft },

  deg: { ...TYPE.hero, ...TYPE.mono, color: COLORS.white, fontWeight: '200',
    marginTop: SPACING.xl, letterSpacing: 1 },
  degLabel: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
  aligned: { ...TYPE.body, marginTop: SPACING.md, fontWeight: '700' },
  // Текущий курс: подсказка, насколько ещё поворачивать.
  heading: { ...TYPE.callout, ...TYPE.mono, color: COLORS.textMuted, marginTop: SPACING.md },

  calibrateBtn: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceStrong },
  calibrateText: { ...TYPE.callout, color: COLORS.accentSoft },
  // Датчик сбит — кнопка перестаёт быть незаметной подписью.
  calibrateWarn: { borderWidth: 1, borderColor: COLORS.warning,
    backgroundColor: 'rgba(255,206,90,0.12)' },

  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  calCard: { backgroundColor: COLORS.navy, borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  calTitle: { ...TYPE.heading, color: COLORS.white, fontWeight: '800', marginBottom: SPACING.sm },
  calHint: { ...TYPE.body, color: COLORS.text, textAlign: 'center',
    lineHeight: 22, marginBottom: SPACING.lg },
  calBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl },
  calBtnText: { ...TYPE.body, color: COLORS.navy, fontWeight: '800' },
  calStatus: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    marginBottom: SPACING.lg },
  calDot: { width: 9, height: 9, borderRadius: 4.5 },
  calStatusText: { ...TYPE.callout, ...TYPE.mono, color: COLORS.text },
});
