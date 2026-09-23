import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import Text from '../components/AppText';
import DraggableSheet from '../components/DraggableSheet';
import Icon from '../components/Icon';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { DHIKR } from './model';

// Mode picker for the tasbih screen's pill (docs/TASBIH_V3_SPEC.md, A):
// sequence, the three single dhikr, free dhikr, the user's own remembrances
// (each deletable), the "circles of 33" switch, and an inline form to add
// a new custom dhikr. `keyboardAvoiding` on DraggableSheet lifts the whole
// sheet above the keyboard so the form's fields stay visible.
export default function DhikrSheet({ visible, onClose, state, select, addCustom, removeCustom, setCircleLimit }) {
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [arabic, setArabic] = useState('');
  const [translation, setTranslation] = useState('');

  const resetForm = () => { setAdding(false); setText(''); setArabic(''); setTranslation(''); };
  const close = () => { resetForm(); onClose(); };

  if (!state) return null;

  const options = [
    { id: 'sequence', label: ru ? 'Последовательность' : 'Sequence' },
    ...DHIKR.map(d => ({ id: d.id, label: ru ? d.ru : d.en })),
    { id: 'free', label: ru ? 'Свободный зикр' : 'Free dhikr' },
    ...(state.customDhikr || []).map(d => ({ id: `custom:${d.id}`, label: d.text, customId: d.id })),
  ];

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addCustom({ text: trimmed, arabic, translation });
    hapticLight();
    resetForm();
  };

  return (
    <DraggableSheet visible={visible} onClose={close} title={ru ? 'Зикр' : 'Dhikr'} keyboardAvoiding>
      {options.map(option => (
        <View key={option.id} style={styles.row}>
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: option.id === state.selectedDhikr }}
            style={styles.option} onPress={() => { hapticLight(); select(option.id); close(); }}>
            <View style={[styles.radio, { borderColor: accent }, option.id === state.selectedDhikr && { backgroundColor: accent }]} />
            <Text style={styles.optionText} numberOfLines={1}>{option.label}</Text>
          </Pressable>
          {!!option.customId && (
            <Pressable accessibilityRole="button"
              accessibilityLabel={ru ? `Удалить «${option.label}»` : `Delete "${option.label}"`}
              onPress={() => { hapticLight(); removeCustom(option.customId); }}
              style={styles.deleteButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Icon name="close" size={16} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      ))}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{ru ? 'Считать кругами по 33' : 'Count in circles of 33'}</Text>
        <Switch value={!!state.circleLimit} onValueChange={value => { hapticLight(); setCircleLimit(value); }}
          trackColor={{ false: COLORS.hairline, true: accent }} thumbColor={COLORS.text} />
      </View>

      {!adding ? (
        <Pressable accessibilityRole="button" onPress={() => { hapticLight(); setAdding(true); }} style={styles.addButton}>
          <Icon name="add" size={18} color={accent} />
          <Text style={[styles.addText, { color: accent }]}>{ru ? 'Своё поминание' : 'Custom dhikr'}</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder={ru ? 'Текст поминания' : 'Dhikr text'}
            placeholderTextColor={COLORS.textMuted} value={text} onChangeText={setText} maxLength={80} />
          <TextInput style={styles.input} placeholder={ru ? 'Арабский (необязательно)' : 'Arabic (optional)'}
            placeholderTextColor={COLORS.textMuted} value={arabic} onChangeText={setArabic} maxLength={120} />
          <TextInput style={styles.input} placeholder={ru ? 'Перевод (необязательно)' : 'Translation (optional)'}
            placeholderTextColor={COLORS.textMuted} value={translation} onChangeText={setTranslation} maxLength={120} />
          <View style={styles.formButtons}>
            <Pressable accessibilityRole="button" onPress={resetForm} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{ru ? 'Отмена' : 'Cancel'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!text.trim()} onPress={save}
              style={[styles.saveButton, { backgroundColor: accent, opacity: text.trim() ? 1 : 0.5 }]}>
              <Text style={styles.saveText}>{ru ? 'Сохранить' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  option: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.sm },
  optionText: { ...TYPE.callout, color: COLORS.text, flexShrink: 1 },
  radio: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  deleteButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, marginTop: SPACING.sm,
  },
  switchLabel: { ...TYPE.callout, color: COLORS.text, flex: 1, marginRight: SPACING.sm },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 44, marginTop: SPACING.sm, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.hairline,
  },
  addText: { ...TYPE.callout, fontWeight: '600' },
  form: { marginTop: SPACING.md, gap: SPACING.sm },
  input: {
    minHeight: 44, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.hairline,
    paddingHorizontal: SPACING.sm, color: COLORS.text, ...TYPE.callout,
  },
  formButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelButton: { flex: 1, minHeight: 44, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.hairline },
  cancelText: { ...TYPE.callout, color: COLORS.textMuted },
  saveButton: { flex: 1, minHeight: 44, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  saveText: { ...TYPE.callout, color: COLORS.navy, fontWeight: '600' },
});
