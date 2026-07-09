import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Animated, Easing, TouchableOpacity, Modal } from 'react-native';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { SectionTitle, Subtitle } from '../components/ui';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getQiblaBearing } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';
import { useLocation } from '../utils/LocationContext';
import { useTabSwipe } from '../utils/useTabSwipe';
import { hapticSuccess } from '../utils/haptics';
import { useFocusEffect } from '@react-navigation/native';

const DISC = 300;
const NEEDLE_LEN = DISC / 2 - 34;

export default function QiblaScreen() {
  const { t } = useLang();
  const { coords } = useLocation();
  const swipe = useTabSwipe('Qibla');
  const [heading, setHeading] = useState(0);
  const [qibla, setQibla] = useState(null);
  const [calibrateOpen, setCalibrateOpen] = useState(false);
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
            // trueHeading is best; fall back to magHeading.
            const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
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
    // Ignore tiny jitter; smooth the rest gently to avoid the "jumping".
    if (Math.abs(diff) < 0.8) return prev;
    let next = (prev + diff * 0.12 + 360) % 360;
    smoothed.current = next;
    return next;
  }

  // Dial rotates opposite to heading so N tracks real north.
  const dialAngle = (-heading + 360) % 360;
  // Needle points to Qibla relative to where the phone faces.
  const needleAngle = qibla != null ? (qibla - heading + 360) % 360 : 0;
  const aligned = qibla != null && Math.abs(((needleAngle + 180) % 360) - 180) < 5;

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
    Animated.timing(dialRotate, { toValue: dialCont.current, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [dialAngle]);
  useEffect(() => {
    needleCont.current = unwrap(needleCont.current, needleAngle);
    Animated.timing(needleRotate, { toValue: needleCont.current, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [needleAngle]);

  const dialSpin = dialRotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const needleSpin = needleRotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  return (
    <ScreenWrapper swipeHandlers={swipe}>
      <SectionTitle>{t('qibla_title')}</SectionTitle>
      <Subtitle>{t('qibla_subtitle')}</Subtitle>

      {qibla == null ? (
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 80 }} />
      ) : (
        <View style={styles.center}>
          <View style={styles.compassArea}>
            {/* STATIC glass disc — its sheen stays put (doesn't rotate) */}
            <GlassView blur clip radius={DISC / 2} azure intensity={42}
              style={[styles.disc, aligned && styles.discAligned]}>
              <View style={styles.discInner}>
                {/* Rotating dial layer: only the N marker + ticks spin */}
                <Animated.View style={[styles.dialLayer, { transform: [{ rotate: dialSpin }] }]}>
                  <View style={styles.northMark}>
                    <View style={styles.northTri} />
                    <Text style={styles.northLetter}>N</Text>
                  </View>
                  {/* small ticks at S/E/W */}
                  <Text style={[styles.tick, styles.tickS]}>S</Text>
                  <Text style={[styles.tick, styles.tickE]}>E</Text>
                  <Text style={[styles.tick, styles.tickW]}>W</Text>
                </Animated.View>

                {/* Qibla needle — glass, points along the radius */}
                <Animated.View style={[styles.needleLayer, { transform: [{ rotate: needleSpin }] }]}>
                  <View style={styles.needleStem}>
                    <View style={styles.needleHead} />
                  </View>
                </Animated.View>

                <View style={styles.hub} />
              </View>
            </GlassView>
          </View>

          <Text style={styles.deg}>{Math.round(qibla)}°</Text>
          <Text style={styles.degLabel}>{t('qibla_bearing')}</Text>
          {aligned && <Text style={styles.aligned}>{t('qibla_aligned')}</Text>}

          <TouchableOpacity onPress={() => setCalibrateOpen(true)} style={styles.calibrateBtn}>
            <Ionicons name="sync" size={15} color={COLORS.accentSoft} />
            <Text style={styles.calibrateText}>  {t('calibrate')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={calibrateOpen} animationType="fade" transparent onRequestClose={() => setCalibrateOpen(false)}>
        <View style={styles.calBackdrop}>
          <View style={styles.calCard}>
            <Ionicons name="sync" size={48} color={COLORS.accentSoft} style={{ marginBottom: SPACING.md }} />
            <Text style={styles.calTitle}>{t('calibrate')}</Text>
            <Text style={styles.calHint}>{t('calibrate_hint')}</Text>
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
  discAligned: { borderColor: COLORS.white, borderWidth: 2 },
  discInner: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  dialLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  northMark: { position: 'absolute', top: 10, alignItems: 'center' },
  northTri: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 14,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#ff6b6b' },
  northLetter: { color: COLORS.white, fontSize: 16, fontWeight: '800', marginTop: 2 },
  tick: { position: 'absolute', color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  tickS: { bottom: 12 },
  tickE: { right: 14 },
  tickW: { left: 14 },
  needleLayer: { position: 'absolute', width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  needleStem: { position: 'absolute', top: DISC / 2 - NEEDLE_LEN, height: NEEDLE_LEN, width: 6,
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3, alignItems: 'center' },
  needleHead: { position: 'absolute', top: -18, width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderBottomWidth: 28,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(255,255,255,0.95)' },
  hub: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.white,
    borderWidth: 2, borderColor: COLORS.accentSoft },
  deg: { color: COLORS.white, fontSize: 46, fontWeight: '200', marginTop: SPACING.xl, letterSpacing: 1 },
  degLabel: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  aligned: { color: COLORS.white, fontSize: 15, marginTop: SPACING.md, fontWeight: '600' },
  calibrateBtn: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  calibrateText: { color: COLORS.accentSoft, fontSize: 14 },
  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  calCard: { backgroundColor: '#13202f', borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  calTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: SPACING.sm },
  calHint: { color: COLORS.text, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  calBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl },
  calBtnText: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
});
