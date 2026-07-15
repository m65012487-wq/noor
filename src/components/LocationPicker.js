import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableSheet from './DraggableSheet';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useLocation, searchCity } from '../utils/LocationContext';

export default function LocationPicker({ visible, onClose }) {
  const { t } = useLang();
  const { useGps, setManual } = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch() {
    if (query.trim().length < 2) return;
    setLoading(true); setSearched(true);
    try { setResults(await searchCity(query.trim())); }
    catch { setResults([]); }
    setLoading(false);
  }
  async function pick(item) { await setManual({ lat: item.lat, lng: item.lng, label: item.short }); onClose(); }
  async function gps() { await useGps(); onClose(); }

  return (
    <DraggableSheet visible={visible} onClose={onClose} title={t('loc_title')} keyboardAvoiding>
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('loc_search_ph')}
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch} activeOpacity={0.8}>
          <Ionicons name="search" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.gpsBtn} onPress={gps} activeOpacity={0.8}>
        <Ionicons name="location-outline" size={19} color={COLORS.text} style={{ marginRight: SPACING.sm }} />
        <Text style={styles.gpsText}>{t('loc_use_gps')}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />}
      {!loading && searched && results.length === 0 && (
        <Text style={styles.empty}>{t('loc_no_results')}</Text>
      )}

      {results.map((item, i) => (
        <TouchableOpacity key={`${item.lat}-${item.lng}-${i}`} style={styles.row} onPress={() => pick(item)}>
          <Ionicons name="location-outline" size={17} color={COLORS.accentSoft} style={{ marginRight: SPACING.sm }} />
          <Text style={styles.rowText}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={styles.closeText}>{t('cancel')}</Text>
      </TouchableOpacity>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, paddingVertical: SPACING.md, color: COLORS.text, fontSize: 16 },
  searchBtn: { width: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  gpsText: { color: COLORS.text, fontSize: 16 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowText: { color: COLORS.text, fontSize: 16, flex: 1 },
  close: { marginTop: SPACING.md, padding: SPACING.md, alignItems: 'center' },
  closeText: { color: COLORS.textMuted, fontSize: 16 },
});
