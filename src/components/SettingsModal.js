import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableSheet from './DraggableSheet';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppSettings } from '../utils/AppSettingsContext';
import { useAppearance, THEMES } from '../utils/AppearanceContext';
import { ADHAN_SOUNDS } from '../utils/adhan';
import { ASR_SCHOOLS } from '../constants/calcMethods';
import { getFajrAlarmSettings, setFajrAlarmEnabled, setFajrAlarmInterval, cancelFajrAlarm } from '../utils/fajrAlarm';
import { TIME_SOURCES } from '../utils/prayerSource';
import { playUrl, stopAudio } from '../utils/audioPlayer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const OPACITY_LEVELS = [0.01, 0.04, 0.08, 0.13, 0.18];

function Opt({ label, active, onPress, activeBg }) {
  return (
    <TouchableOpacity style={[styles.row, active && styles.rowActive, active && activeBg]} onPress={onPress}>
      <Text style={[styles.rowText, active && styles.rowTextActive, { flex: 1 }]}>{label}</Text>
      {active && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
  );
}

function Section({ id, title, open, onToggle, children }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHead} onPress={() => onToggle(id)} activeOpacity={0.8}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.accentSoft} />
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

export default function SettingsModal({ visible, onClose, onFajrAlarmChange }) {
  const { t, lang, setLang } = useLang();
  const { adhanSound, chooseAdhan,
    timeSourceId, chooseTimeSource, asrSchool, chooseAsrSchool } = useAppSettings();
  const { theme, chooseTheme, glassOpacity, chooseGlassOpacity, tint, accent } = useAppearance();
  const tintRgb = tint || '180,215,230';
  const activeBg = { backgroundColor: `rgba(${tintRgb},0.18)` };
  const [previewing, setPreviewing] = useState(null);
  const [openSection, setOpenSection] = useState('prayer');
  const [alarmOn, setAlarmOn] = useState(false);
  const [alarmInt, setAlarmInt] = useState(5);
  React.useEffect(() => { (async () => {
    const st = await getFajrAlarmSettings(); setAlarmOn(st.enabled); setAlarmInt(st.interval);
  })(); }, [visible]);

  function toggle(id) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection((cur) => (cur === id ? null : id));
  }

  async function preview(item) {
    if (!item.url) return;
    if (previewing === item.id) { await stopAudio(); setPreviewing(null); return; }
    setPreviewing(item.id);
    await playUrl(item.url, () => setPreviewing(null));
  }
  function close() { stopAudio(); setPreviewing(null); onClose(); }

  return (
    <DraggableSheet visible={visible} onClose={close} title={t('general_settings')}>
      {/* ===== PRAYER ===== */}
        <Section id="prayer" title={t('sec_prayer')} open={openSection === 'prayer'} onToggle={toggle}>
          <Text style={styles.label}>{t('time_source')}</Text>
          {TIME_SOURCES.map((s) => (
            <Opt key={s.id} label={lang === 'ru' ? s.label_ru : s.label_en}
              active={timeSourceId === s.id} onPress={() => chooseTimeSource(s.id)} activeBg={activeBg} />
          ))}

          <Text style={styles.label}>{t('asr_method')}</Text>
          {ASR_SCHOOLS.map((m) => (
            <Opt key={m.id} label={lang === 'ru' ? m.label_ru : m.label_en}
              active={asrSchool === m.id} onPress={() => chooseAsrSchool(m.id)} activeBg={activeBg} />
          ))}

          <Text style={styles.label}>{t('adhan_sound')}</Text>
          {ADHAN_SOUNDS.map((a) => (
            <View key={a.id} style={[styles.row, adhanSound === a.id && styles.rowActive, adhanSound === a.id && activeBg]}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => chooseAdhan(a.id)}>
                <Text style={[styles.rowText, adhanSound === a.id && styles.rowTextActive]}>
                  {lang === 'ru' ? a.label_ru : a.label_en}
                </Text>
              </TouchableOpacity>
              {a.url && (
                <TouchableOpacity onPress={() => preview(a)} style={styles.previewBtn}>
                  <Text style={styles.previewText}>{previewing === a.id ? '■' : '▶'} {t('preview')}</Text>
                </TouchableOpacity>
              )}
              {adhanSound === a.id && !a.url && <Text style={styles.check}>✓</Text>}
            </View>
          ))}

          {/* Smart Fajr alarm */}
          <Text style={styles.subhead}>{t('fajr_alarm')}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={{ flex: 1 }}
              onPress={async () => {
                const v = !alarmOn; setAlarmOn(v); await setFajrAlarmEnabled(v);
                if (!v) await cancelFajrAlarm();
                onFajrAlarmChange && onFajrAlarmChange();
              }}>
              <Text style={styles.rowText}>{alarmOn ? '🔔 ' : '🔕 '}{t('fajr_alarm')}</Text>
              <Text style={styles.hintText}>{t('fajr_alarm_hint')}</Text>
            </TouchableOpacity>
            {alarmOn && <Text style={styles.check}>✓</Text>}
          </View>
          {alarmOn && (
            <View style={styles.intervalRow}>
              <Text style={styles.hintText}>{t('fajr_interval')}: </Text>
              {[3, 5, 10, 15].map((m) => (
                <TouchableOpacity key={m}
                  style={[styles.intChip, alarmInt === m && styles.intChipActive]}
                  onPress={async () => { setAlarmInt(m); await setFajrAlarmInterval(m); onFajrAlarmChange && onFajrAlarmChange(); }}>
                  <Text style={[styles.intText, alarmInt === m && styles.intTextActive]}>{m} {t('min_short')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Section>

        {/* ===== APPEARANCE ===== */}
        <Section id="appearance" title={t('sec_appearance')} open={openSection === 'appearance'} onToggle={toggle}>
          <Text style={styles.label}>{t('theme')}</Text>
          <View style={styles.themeRow}>
            {THEMES.map((th) => (
              <TouchableOpacity key={th.id} onPress={() => chooseTheme(th.id)}
                style={[styles.themeChip, theme === th.id && styles.themeChipActive, theme === th.id && activeBg]}>
                <Text style={[styles.themeText, theme === th.id && styles.themeTextActive]}>
                  {lang === 'ru' ? th.label_ru : th.label_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>{t('glass_transparency')}</Text>
          <View style={styles.opacityRow}>
            {OPACITY_LEVELS.map((lv, i) => (
              <TouchableOpacity key={i} onPress={() => chooseGlassOpacity(lv)}
                style={[styles.opacityDot, glassOpacity === lv && styles.opacityDotActive,
                  { backgroundColor: `rgba(255,255,255,${lv + 0.05})` }]}>
                <Text style={styles.opacityNum}>{i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* ===== GENERAL ===== */}
        <Section id="general" title={t('sec_general')} open={openSection === 'general'} onToggle={toggle}>
          <Text style={styles.label}>{t('language')}</Text>
          <Opt label="English" active={lang === 'en'} onPress={() => setLang('en')} activeBg={activeBg} />
          <Opt label="Русский" active={lang === 'ru'} onPress={() => setLang('ru')} activeBg={activeBg} />
        </Section>

      <TouchableOpacity style={styles.doneBtn} onPress={close}>
        <Text style={styles.doneText}>{t('save')}</Text>
      </TouchableOpacity>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800', marginBottom: SPACING.md },
  section: { marginBottom: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  sectionBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  label: { color: COLORS.accentSoft, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.pill, padding: 3, marginBottom: SPACING.sm },
  segBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.pill },
  segBtnActive: { backgroundColor: 'rgba(180,215,230,0.22)' },
  segText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  segTextActive: { color: COLORS.white, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.06)' },
  rowActive: { backgroundColor: 'rgba(180,215,230,0.16)' },
  rowText: { color: COLORS.text, fontSize: 16 },
  rowTextActive: { color: COLORS.white, fontWeight: '700' },
  check: { color: COLORS.white, fontSize: 18, fontWeight: '900', marginLeft: SPACING.sm },
  previewBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.10)' },
  previewText: { color: COLORS.accentSoft, fontSize: 13, fontWeight: '600' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalChip: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  goalChipActive: { backgroundColor: COLORS.accent },
  goalText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  goalTextActive: { color: COLORS.navy },
  tuneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  tuneName: { color: COLORS.text, fontSize: 16 },
  tuneCtrl: { flexDirection: 'row', alignItems: 'center' },
  tuneBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  tuneBtnText: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  tuneVal: { color: COLORS.white, fontSize: 16, width: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  themeChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  themeChipActive: { backgroundColor: 'rgba(180,215,230,0.18)', borderColor: COLORS.glassBorder },
  themeText: { color: COLORS.text, fontSize: 14 },
  themeTextActive: { color: COLORS.white, fontWeight: '700' },
  opacityRow: { flexDirection: 'row', gap: SPACING.sm },
  opacityDot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  opacityDotActive: { borderColor: COLORS.white, borderWidth: 2 },
  opacityNum: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  doneBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  doneText: { color: COLORS.navy, fontSize: 17, fontWeight: '800' },
  subhead: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  hintText: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  intervalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 4 },
  intChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  intChipActive: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.5)' },
  intText: { color: COLORS.textMuted, fontSize: 13 },
  intTextActive: { color: COLORS.white, fontWeight: '700' },
});
