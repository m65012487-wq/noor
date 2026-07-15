import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableSheet from './DraggableSheet';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppSettings } from '../utils/AppSettingsContext';
import { prayerName } from '../constants/prayerNames';

const OPTIONS = [0, 5, 10, 15, 30];

export default function PrayerReminderSheet({ prayer, onClose }) {
  const { t, lang } = useLang();
  const { reminders, setReminder } = useAppSettings();
  if (!prayer) return null;
  const cfg = reminders[prayer] || { minutesBefore: 0, enabled: true };

  return (
    <DraggableSheet visible={!!prayer} onClose={onClose} title={prayerName(prayer, lang)}>
      <Text style={styles.section}>{t('reminder_before')}</Text>

        <TouchableOpacity style={[styles.row, !cfg.enabled && styles.rowActive]}
          onPress={() => setReminder(prayer, { enabled: false })}>
          <Text style={[styles.rowText, !cfg.enabled && styles.rowTextActive]}>{t('no_reminder')}</Text>
          {!cfg.enabled && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>

        {OPTIONS.map((m) => {
          const active = cfg.enabled && cfg.minutesBefore === m;
          return (
            <TouchableOpacity key={m} style={[styles.row, active && styles.rowActive]}
              onPress={() => setReminder(prayer, { enabled: true, minutesBefore: m })}>
              <Text style={[styles.rowText, active && styles.rowTextActive]}>
                {m === 0 ? t('at_adhan') : `${m} ${t('minutes_before')}`}
              </Text>
              {active && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}

      <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
        <Text style={styles.doneText}>{t('save')}</Text>
      </TouchableOpacity>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  section: { color: COLORS.accentSoft, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.06)' },
  rowActive: { backgroundColor: 'rgba(180,215,230,0.16)' },
  rowText: { color: COLORS.text, fontSize: 16 },
  rowTextActive: { color: COLORS.white, fontWeight: '700' },
  check: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  doneBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  doneText: { color: COLORS.navy, fontSize: 17, fontWeight: '800' },
});
