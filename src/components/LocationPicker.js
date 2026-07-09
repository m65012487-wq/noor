import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  FlatList, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useLocation, searchCity } from '../utils/LocationContext';
import { useAppearance } from '../utils/AppearanceContext';

const SCREEN_H = Dimensions.get('window').height;

export default function LocationPicker({ visible, onClose }) {
  const { t } = useLang();
  const { useGps, setManual } = useLocation();
  const { tint, glassOpacity } = useAppearance();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0, useNativeDriver: true,
          friction: 14, tension: 60,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1, duration: 280, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_H, duration: 260, useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0, duration: 220, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  async function doSearch() {
    if (query.trim().length < 2) return;
    setLoading(true); setSearched(true);
    try { setResults(await searchCity(query.trim())); }
    catch { setResults([]); }
    setLoading(false);
  }
  async function pick(item) { await setManual({ lat: item.lat, lng: item.lng, label: item.short }); onClose(); }
  async function gps() { await useGps(); onClose(); }

  const base = glassOpacity != null ? glassOpacity : 0.07;
  const rgb = (tint || '150,200,225');
  const blurI = Math.round(34 + base * 120);
  const sheetBg = (() => {
    const c = (tint || '19,32,47').split(',').map(Number);
    const mix = (d, t) => Math.round(d * 0.80 + (t || d) * 0.20 * 0.3);
    return `rgb(${mix(19, c[0])},${mix(32, c[1])},${mix(47, c[2])})`;
  })();

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      {/* backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none">
        <Animated.View style={[styles.sheetWrap, { transform: [{ translateY }] }]}>
          {/* glass layers */}
          <View style={[StyleSheet.absoluteFill, styles.glassClip]} pointerEvents="none">
            <BlurView intensity={blurI} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[`rgba(${rgb},${Math.min(0.28, base + 0.06).toFixed(3)})`, `rgba(${rgb},${base.toFixed(3)})`]}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.3 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          {/* border */}
          <View style={[StyleSheet.absoluteFill, styles.glassClip, styles.glassBorder]} pointerEvents="none" />

          <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t('loc_title')}</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                placeholder={t('loc_search_ph')}
                placeholderTextColor={COLORS.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={doSearch}
                returnKeyType="search"
                autoFocus
              />
              <TouchableOpacity style={[styles.searchBtn, { backgroundColor: `rgba(${rgb},0.35)` }]} onPress={doSearch}>
                <Text style={styles.searchBtnText}>🔍</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: `rgba(${rgb},0.15)` }]} onPress={gps}>
              <Text style={styles.gpsText}>📍 {t('loc_use_gps')}</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />}
            {!loading && searched && results.length === 0 && (
              <Text style={styles.empty}>{t('loc_no_results')}</Text>
            )}

            <FlatList
              data={results}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item, i) => `${item.lat}-${item.lng}-${i}`}
              style={{ marginTop: SPACING.sm, maxHeight: 240 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => pick(item)}>
                  <Text style={styles.rowText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  kav: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheetWrap: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, overflow: 'hidden' },
  glassClip: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, overflow: 'hidden' },
  glassBorder: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.28)', borderBottomWidth: 0 },
  content: { padding: SPACING.lg },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)', alignSelf: 'center', marginBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: SPACING.md },
  searchRow: { flexDirection: 'row', gap: SPACING.sm },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, color: COLORS.text, fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  searchBtn: { borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.20)' },
  searchBtnText: { fontSize: 18 },
  gpsBtn: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)', marginTop: SPACING.md },
  gpsText: { color: COLORS.text, fontSize: 16, textAlign: 'center' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.lg },
  row: { paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowText: { color: COLORS.text, fontSize: 16 },
  close: { marginTop: SPACING.md, padding: SPACING.md, alignItems: 'center' },
  closeText: { color: COLORS.textMuted, fontSize: 16 },
});
