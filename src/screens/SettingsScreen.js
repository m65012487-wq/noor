import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card, SectionTitle } from '../components/ui';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useQuranPrefs } from '../utils/QuranPrefsContext';
import { TRANSLATIONS, RECITERS } from '../utils/quranApi';

function OptionRow({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.row, active && styles.rowActive]} onPress={onPress}>
      <Text style={[styles.rowText, active && styles.rowTextActive]}>{label}</Text>
      {active && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { t, lang, setLang } = useLang();
  const { translationId, reciterId, chooseTranslation, chooseReciter } = useQuranPrefs();
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <ScreenWrapper scroll>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <SectionTitle>{t('settings')}</SectionTitle>

        <Card>
          <Text style={styles.label}>{t('language')}</Text>
          <OptionRow label="English" active={lang === 'en'} onPress={() => setLang('en')} />
          <OptionRow label="Русский" active={lang === 'ru'} onPress={() => setLang('ru')} />
        </Card>

        <Card>
          <Text style={styles.label}>{t('translation')}</Text>
          {translations.map((tr) => (
            <OptionRow key={tr.id} label={tr.label}
              active={translationId === tr.id}
              onPress={() => chooseTranslation(tr.id)} />
          ))}
        </Card>

        <Card>
          <Text style={styles.label}>{t('reciter')}</Text>
          {RECITERS.map((r) => (
            <OptionRow key={r.id} label={r.label}
              active={reciterId === r.id}
              onPress={() => chooseReciter(r.id)} />
          ))}
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  label: { color: COLORS.accent, fontSize: 16, fontWeight: '700', marginBottom: SPACING.md },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowActive: { backgroundColor: 'rgba(180,215,230,0.18)', borderWidth: 1, borderColor: COLORS.accent },
  rowText: { color: COLORS.cream, fontSize: 16 },
  rowTextActive: { color: COLORS.accent, fontWeight: '700' },
  check: { color: COLORS.accent, fontSize: 18, fontWeight: '900' },
});
