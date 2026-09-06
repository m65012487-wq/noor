import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import Text from './AppText';
import Icon from './Icon';
import DraggableSheet from './DraggableSheet';
import { COLORS, SPACING, RADIUS, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppSettings } from '../utils/AppSettingsContext';
import { useAppearance } from '../utils/AppearanceContext';
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
      {active && <Icon name="check" size={17} color={COLORS.white} />}
    </TouchableOpacity>
  );
}

// Иконка в заголовке даёт разделу опознавательный знак: список из четырёх
// одинаковых строк с шевроном справа читается заметно хуже.
function Section({ id, icon, title, open, onToggle, children }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHead} onPress={() => onToggle(id)} activeOpacity={0.8}>
        <Icon name={icon} size={19} color={COLORS.accentSoft} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Icon name={open ? "up" : "down"} size={20} color={COLORS.accentSoft} />
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

export default function SettingsModal({ visible, onClose, onFajrAlarmChange }) {
  const { t, lang, setLang } = useLang();
  const { adhanSound, chooseAdhan,
    timeSourceId, chooseTimeSource, asrSchool, chooseAsrSchool } = useAppSettings();
  const { pattern, choosePattern, PATTERNS, scheme, chooseScheme, SCHEMES,
    fontSet, chooseFontSet, FONT_SETS,
    tint } = useAppearance();
  const tintRgb = tint || '180,215,230';
  const activeBg = { backgroundColor: `rgba(${tintRgb},0.18)` };
  const [previewing, setPreviewing] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  // Все разделы свёрнуты при открытии: развёрнутый первый занимал экран
  // и прятал остальные за прокруткой.
  const [openSection, setOpenSection] = useState(null);
  const [alarmOn, setAlarmOn] = useState(false);
  const [alarmInt, setAlarmInt] = useState(5);
  React.useEffect(() => { (async () => {
    const st = await getFajrAlarmSettings(); setAlarmOn(st.enabled); setAlarmInt(st.interval);
  })(); }, [visible]);

  function toggle(id) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection((cur) => (cur === id ? null : id));
  }

  // Три состояния вместо двух: удалённый файл сначала грузится, и раньше
  // кнопка сразу показывала «пауза», хотя ничего ещё не звучало. При сбое
  // сети состояние залипало навсегда — ошибка глушилась молча.
  async function preview(item) {
    if (!item.url) return;
    if (previewing === item.id || loadingId === item.id) {
      await stopAudio();
      setPreviewing(null);
      setLoadingId(null);
      return;
    }
    setLoadingId(item.id);
    const ok = await playUrl(item.url, () => setPreviewing(null));
    setLoadingId(null);
    setPreviewing(ok ? item.id : null);
  }
  function close() { stopAudio(); setPreviewing(null); setLoadingId(null); onClose(); }

  return (
    <DraggableSheet visible={visible} onClose={close} title={t('general_settings')}>
      {/* ===== PRAYER ===== */}
        <Section id="prayer" icon="prayer" title={t("sec_prayer")} open={openSection === 'prayer'} onToggle={toggle}>
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
                <TouchableOpacity onPress={() => preview(a)} style={styles.previewBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {loadingId === a.id
                    ? <ActivityIndicator size="small" color={COLORS.accentSoft} />
                    : <Icon name={previewing === a.id ? 'pause' : 'play'}
                        size={16} color={COLORS.accentSoft} />}
                </TouchableOpacity>
              )}
              {adhanSound === a.id && !a.url && <Icon name="check" size={17} color={COLORS.white} />}
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
              <Text style={styles.rowText}>{t('fajr_alarm')}</Text>
              <Text style={styles.hintText}>{t('fajr_alarm_hint')}</Text>
            </TouchableOpacity>
            {alarmOn && <Icon name="check" size={17} color={COLORS.white} />}
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
        <Section id="appearance" icon="options" title={t("sec_appearance")}
          open={openSection === 'appearance'} onToggle={toggle}>

          <Text style={styles.label}>{t("pattern")}</Text>
          <View style={styles.themeRow}>
            {PATTERNS.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => choosePattern(p.id)}
                style={[styles.themeChip, pattern === p.id && styles.themeChipActive,
                  pattern === p.id && activeBg]}>
                <Text style={[styles.themeText, pattern === p.id && styles.themeTextActive]}>
                  {lang === "ru" ? p.label_ru : p.label_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t("color_scheme")}</Text>
          <View style={styles.themeRow}>
            {SCHEMES.map((s) => (
              <TouchableOpacity key={s.id} onPress={() => chooseScheme(s.id)}
                style={[styles.schemeChip, { backgroundColor: s.bg[0], borderColor: s.accent },
                  scheme === s.id && styles.schemeChipActive]}>
                <View style={[styles.schemeDot, { backgroundColor: s.accent }]} />
                <Text style={[styles.themeText, scheme === s.id && styles.themeTextActive]}>
                  {lang === "ru" ? s.label_ru : s.label_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Образец набирается тем самым шрифтом: название семейства
              ничего не говорит, пока не увидишь буквы. */}
          <Text style={styles.label}>{t("font")}</Text>
          <View style={styles.themeRow}>
            {FONT_SETS.map((f) => (
              <TouchableOpacity key={f.id} onPress={() => chooseFontSet(f.id)}
                style={[styles.themeChip, fontSet === f.id && styles.themeChipActive,
                  fontSet === f.id && activeBg]}>
                <Text style={[styles.themeText, { fontFamily: f.reading },
                  fontSet === f.id && styles.themeTextActive]}>
                  {lang === "ru" ? f.label_ru : f.label_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </Section>

        {/* ===== GENERAL ===== */}
        <Section id="general" icon="settings" title={t("sec_general")}
          open={openSection === 'general'} onToggle={toggle}>
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
  title: { ...TYPE.title, color: COLORS.text, fontWeight: '800', marginBottom: SPACING.md },
  section: { marginBottom: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  // gap разводит иконку, заголовок и шеврон; заголовок тянется и прижимает
  // шеврон к правому краю без space-between, который ломался с тремя детьми.
  sectionHead: { flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, padding: SPACING.md },
  sectionTitle: { ...TYPE.subhead, color: COLORS.white, fontWeight: "700", flex: 1 },
  sectionBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  label: { ...TYPE.overline, color: COLORS.accentSoft,
    marginTop: SPACING.md, marginBottom: SPACING.sm },

  segment: { flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill, padding: 3, marginBottom: SPACING.sm },
  segBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.pill },
  segBtnActive: { backgroundColor: COLORS.surfaceActive },
  segText: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: '600' },
  segTextActive: { color: COLORS.white, fontWeight: '700' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface },
  rowActive: { backgroundColor: COLORS.surfaceActive },
  rowText: { ...TYPE.body, color: COLORS.text },
  rowTextActive: { color: COLORS.white, fontWeight: '700' },
  check: { ...TYPE.subhead, color: COLORS.white, fontWeight: '900', marginLeft: SPACING.sm },

  // Круглая кнопка вместо подписи «Прослушать»: значка достаточно,
  // а квадрат 34 точки удобнее попадается пальцем, чем текстовая плашка.
  previewBtn: { width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceStrong },
  previewText: { ...TYPE.caption, color: COLORS.accentSoft, fontWeight: '600' },

  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalChip: { width: 50, height: 50, borderRadius: 25, alignItems: 'center',
    justifyContent: 'center', backgroundColor: COLORS.surface },
  goalChipActive: { backgroundColor: COLORS.accent },
  goalText: { ...TYPE.body, color: COLORS.text, fontWeight: '700' },
  goalTextActive: { color: COLORS.navy },

  tuneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.xs },
  tuneName: { ...TYPE.body, color: COLORS.text },
  tuneCtrl: { flexDirection: 'row', alignItems: 'center' },
  tuneBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceStrong,
    alignItems: 'center', justifyContent: 'center' },
  tuneBtnText: { ...TYPE.heading, color: COLORS.white, fontWeight: '700' },
  tuneVal: { ...TYPE.body, ...TYPE.mono, color: COLORS.white, width: 44, textAlign: 'center' },

  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  themeChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  themeChipActive: { backgroundColor: COLORS.surfaceActive, borderColor: COLORS.glassBorder },
  themeText: { ...TYPE.callout, color: COLORS.text },
  themeTextActive: { color: COLORS.white, fontWeight: '700' },
  // Чип схемы показывает сам цвет: подпись без образца ничего не говорит.
  schemeChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth },
  schemeChipActive: { borderWidth: 2 },
  schemeDot: { width: 10, height: 10, borderRadius: 5 },

  opacityRow: { flexDirection: 'row', gap: SPACING.sm },
  opacityDot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center',
    justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  opacityDotActive: { borderColor: COLORS.white, borderWidth: 2 },
  opacityNum: { ...TYPE.caption, color: COLORS.text, fontWeight: '700' },

  doneBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  doneText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '800' },

  subhead: { ...TYPE.overline, color: COLORS.textMuted,
    marginTop: SPACING.md, marginBottom: SPACING.xs },
  hintText: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },

  intervalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: SPACING.sm, marginTop: SPACING.xs, marginBottom: SPACING.xs },
  intChip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: 14,
    backgroundColor: COLORS.surfaceStrong, borderWidth: 1, borderColor: COLORS.hairline },
  intChipActive: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.5)' },
  intText: { ...TYPE.caption, color: COLORS.textMuted },
  intTextActive: { color: COLORS.white, fontWeight: '700' },
});
