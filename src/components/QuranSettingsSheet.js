import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableSheet from './DraggableSheet';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useQuranPrefs } from '../utils/QuranPrefsContext';
import { useAppSettings } from '../utils/AppSettingsContext';
import { TRANSLATIONS, RECITERS } from '../utils/quranApi';
import { downloadTranslation, isTranslationDownloaded, removeDownload,
  downloadReciter, isReciterDownloaded, removeReciter } from '../utils/quranDownload';

function Row({ label, active, onPress, right }) {
  return (
    <View style={[styles.row, active && styles.rowActive]}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress}>
        <Text style={[styles.rowText, active && styles.rowTextActive]}>{label}</Text>
      </TouchableOpacity>
      {right}
      {active && !right && <Text style={styles.check}>✓</Text>}
    </View>
  );
}

function ToggleRow({ label, value, onToggle }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.8}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </TouchableOpacity>
  );
}

export default function QuranSettingsSheet({ visible, onClose }) {
  const { t, lang } = useLang();
  const { translationId, reciterId, chooseTranslation, chooseReciter,
    showArabic, showTranslit, showTranslation,
    toggleArabic, toggleTranslit, toggleTranslation,
    wordByWord, toggleWordByWord } = useQuranPrefs();
  const { dailyGoal, chooseGoal } = useAppSettings();
  const GOALS = [1, 3, 5, 10, 20];
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [downloading, setDownloading] = useState(null);
  const [downloaded, setDownloaded] = useState({});
  const [recDownloading, setRecDownloading] = useState(null);
  const [recDownloaded, setRecDownloaded] = useState({});

  React.useEffect(() => {
    (async () => {
      const map = {};
      for (const tr of translations) map[tr.id] = await isTranslationDownloaded(tr.id);
      setDownloaded(map);
      const rmap = {};
      for (const r of RECITERS) rmap[r.id] = await isReciterDownloaded(r.id);
      setRecDownloaded(rmap);
    })();
  }, [visible, lang]);

  async function toggleReciterDownload(id) {
    if (recDownloaded[id]) {
      await removeReciter(id);
      setRecDownloaded((d) => ({ ...d, [id]: false }));
    } else {
      setRecDownloading(id);
      const ok = await downloadReciter(id);
      setRecDownloading(null);
      setRecDownloaded((d) => ({ ...d, [id]: ok }));
    }
  }

  async function toggleDownload(id) {
    if (downloaded[id]) {
      await removeDownload(id);
      setDownloaded((d) => ({ ...d, [id]: false }));
    } else {
      setDownloading(id);
      const ok = await downloadTranslation(id);
      setDownloading(null);
      setDownloaded((d) => ({ ...d, [id]: ok }));
    }
  }

  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{t('quran_title')}</Text>

        <Text style={styles.section}>{t('display')}</Text>
        <ToggleRow label={t('show_arabic')} value={showArabic} onToggle={() => toggleArabic(!showArabic)} />
        <ToggleRow label={t('show_translit')} value={showTranslit} onToggle={() => toggleTranslit(!showTranslit)} />
        <ToggleRow label={t('show_translation')} value={showTranslation} onToggle={() => toggleTranslation(!showTranslation)} />
        <ToggleRow label={t('wbw')} value={wordByWord} onToggle={() => toggleWordByWord(!wordByWord)} />

        <Text style={styles.section}>{t('translation')}</Text>
        {translations.map((tr) => (
          <Row key={tr.id} label={tr.label} active={translationId === tr.id}
            onPress={() => chooseTranslation(tr.id)}
            right={
              <TouchableOpacity onPress={() => toggleDownload(tr.id)} style={styles.dlBtn}>
                <Text style={styles.dlText}>
                  {downloading === tr.id ? '…' : downloaded[tr.id] ? '✓ ' + t('downloaded') : '↓ ' + t('download')}
                </Text>
              </TouchableOpacity>
            } />
        ))}

        <Text style={styles.section}>{t('reciter')}</Text>
        {RECITERS.map((r) => (
          <Row key={r.id} label={r.label} active={reciterId === r.id}
            onPress={() => chooseReciter(r.id)}
            right={
              <TouchableOpacity onPress={() => toggleReciterDownload(r.id)} style={styles.dlBtn}>
                <Text style={styles.dlText}>
                  {recDownloading === r.id ? '…' : recDownloaded[r.id] ? '✓ ' + t('downloaded') : '↓ ' + t('download')}
                </Text>
              </TouchableOpacity>
            } />
        ))}

        <Text style={styles.section}>{t('daily_goal_setting')}</Text>
        <View style={styles.goalRow}>
          {GOALS.map((g) => (
            <TouchableOpacity key={g} style={[styles.goalChip, dailyGoal === g && styles.goalChipActive]}
              onPress={() => chooseGoal(g)}>
              <Text style={[styles.goalText, dailyGoal === g && styles.goalTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

      <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
        <Text style={styles.doneText}>{t('save')}</Text>
      </TouchableOpacity>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: SPACING.sm },
  section: { color: COLORS.accentSoft, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md,
    marginBottom: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.06)' },
  toggleLabel: { color: COLORS.text, fontSize: 16 },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: COLORS.accent },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white },
  knobOn: { alignSelf: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.06)' },
  rowActive: { backgroundColor: 'rgba(180,215,230,0.16)' },
  rowText: { color: COLORS.text, fontSize: 16 },
  rowTextActive: { color: COLORS.white, fontWeight: '700' },
  check: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  dlBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.10)' },
  dlText: { color: COLORS.accentSoft, fontSize: 12, fontWeight: '600' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  goalChip: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  goalChipActive: { backgroundColor: COLORS.accent },
  goalText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  goalTextActive: { color: COLORS.navy },
  doneBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
  doneText: { color: COLORS.navy, fontSize: 17, fontWeight: '800' },
});
