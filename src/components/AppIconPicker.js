import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import Text from './AppText';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';

const native = Platform.OS === 'ios' ? requireOptionalNativeModule('NoorIcons') : null;
const icons = [
  { name: '', source: require('../../assets/icon.png') },
  { name: 'NoorCrescent', source: require('../../assets/NoorCrescent.png') },
  { name: 'NoorArch', source: require('../../assets/NoorArch.png') },
  { name: 'NoorOlive', source: require('../../assets/NoorOlive.png') },
];
const copy = {
  ru: ['Иконка приложения', 'Noor', 'Полумесяц', 'Минарет', 'Кибла', 'Не удалось сменить иконку. Попробуйте ещё раз.'],
  en: ['App icon', 'Noor', 'Crescent', 'Minaret', 'Qibla', 'Could not change the icon. Try again.'],
  tr: ['Uygulama simgesi', 'Noor', 'Hilal', 'Minare', 'Kıble', 'Simge değiştirilemedi. Tekrar deneyin.'],
  id: ['Ikon aplikasi', 'Noor', 'Bulan sabit', 'Menara masjid', 'Kiblat', 'Ikon gagal diubah. Coba lagi.'],
  fr: ['Icône de l’application', 'Noor', 'Croissant', 'Minaret', 'Qibla', 'Impossible de changer l’icône. Réessayez.'],
  de: ['App-Symbol', 'Noor', 'Mondsichel', 'Minarett', 'Kibla', 'Symbol konnte nicht geändert werden. Versuche es erneut.'],
  es: ['Icono de la aplicación', 'Noor', 'Luna creciente', 'Minarete', 'Quibla', 'No se pudo cambiar el icono. Inténtalo de nuevo.'],
};

export default function AppIconPicker({ accent }) {
  const { lang } = useLang();
  const labels = copy[lang] || copy.en;
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const changing = useRef(false);

  useEffect(() => {
    let active = true;
    native?.getIcon().then(({ supported, name }) => {
      if (active && supported) setSelected(name);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  if (selected === null) return null;

  async function change(name) {
    if (changing.current || selected === name) return;
    changing.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await native.setIcon(name);
      setSelected(name);
    } catch {
      setFailed(true);
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{labels[0]}</Text>
      <View style={styles.icons}>
        {icons.map(({ name, source }, index) => (
          <TouchableOpacity key={name} style={styles.option} disabled={busy}
            onPress={() => change(name)} accessibilityRole="radio"
            accessibilityLabel={labels[index + 1]} accessibilityState={{ checked: selected === name, disabled: busy }}>
            <View style={[styles.frame, selected === name && { borderColor: accent }]}>
              <Image source={source} style={styles.preview} />
            </View>
            <Text style={styles.label}>{labels[index + 1]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {failed && <Text accessibilityLiveRegion="polite" style={styles.error}>{labels[5]}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SPACING.md },
  title: { ...TYPE.subhead, color: COLORS.text, marginBottom: SPACING.sm },
  icons: { flexDirection: 'row', alignItems: 'flex-start' },
  option: { flex: 1, alignItems: 'center', minWidth: 44 },
  frame: { borderWidth: 2, borderRadius: RADIUS.md, borderColor: 'transparent', padding: 3 },
  preview: { width: 44, height: 44, borderRadius: 10 },
  label: { ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
  error: { ...TYPE.caption, color: COLORS.text, marginTop: SPACING.sm },
});
