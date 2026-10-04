import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import Text from '../components/AppText';
import DraggableSheet from '../components/DraggableSheet';
import Icon from '../components/Icon';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import SequenceEditor from './SequenceEditor';
import { DHIKR, sequenceSteps } from './model';

// Mode picker for the tasbih screen's pill (docs/TASBIH_V3_SPEC.md, A):
// sequence (its composition as a second line and a button that switches the
// sheet to SequenceEditor), every single dhikr in DHIKR (each with its
// translation as a second line), free dhikr, the user's own remembrances (each
// deletable), the "circles of 33" switch, and an inline form to add a new custom dhikr.
// The list is longer than a short screen: DraggableSheet scrolls its body
// (the grab zone with the title stays fixed), so nothing gets cut off.
// `keyboardAvoiding` lifts the whole sheet above the keyboard so the form's
// fields stay visible.
export default function DhikrSheet({ visible, onClose, state, select, addCustom, removeCustom, setCircleLimit, setSequence }) {
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const scrollRef = useRef(null);
  const scrollTimer = useRef(null);
  // Список и редактор делят один ScrollView: при смене режима он остаётся
  // прокрученным, поэтому каждый раз возвращаем его наверх.
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [editing]);
  useEffect(() => () => clearTimeout(scrollTimer.current), []);
  // Поле в фокусе должно быть видно над клавиатурой: прокручиваем к его строке сразу
  // и ещё раз, когда шторка уже подстроилась под клавиатуру.
  const showRow = y => {
    const go = () => scrollRef.current?.scrollTo({ y: Math.max(0, y - SPACING.sm), animated: true });
    go();
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(go, 300);
  };
  const [text, setText] = useState('');
  const [arabic, setArabic] = useState('');
  const [translation, setTranslation] = useState('');

  const resetForm = () => { setAdding(false); setText(''); setArabic(''); setTranslation(''); };
  const close = () => { resetForm(); setEditing(false); onClose(); };

  if (!state) return null;

  const options = [
    { id: 'sequence', label: ru ? 'Последовательность' : 'Sequence',
      sub: sequenceSteps(state).map(step => `${ru ? step.ru : step.en} ${step.target}`).join(' · '), editSequence: true },
    ...DHIKR.map(d => ({ id: d.id, label: ru ? d.ru : d.en, sub: ru ? d.translation_ru : d.translation_en })),
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
    <DraggableSheet visible={visible} onClose={close} keyboardAvoiding scrollRef={scrollRef}
      title={editing ? (ru ? 'Последовательность' : 'Sequence') : (ru ? 'Зикр' : 'Dhikr')}>
      {editing ? <SequenceEditor state={state} setSequence={setSequence} onDone={() => setEditing(false)} onFocusRow={showRow} /> : <>
      {options.map(option => (
        <View key={option.id} style={styles.row}>
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: option.id === state.selectedDhikr }}
            style={styles.option} onPress={() => { hapticLight(); select(option.id); close(); }}>
            <View style={[styles.radio, { borderColor: accent }, option.id === state.selectedDhikr && { backgroundColor: accent }]} />
            <View style={styles.optionBody}>
              <Text style={styles.optionText} numberOfLines={2}>{option.label}</Text>
              {!!option.sub && <Text style={styles.optionSub} numberOfLines={2}>{option.sub}</Text>}
            </View>
          </Pressable>
          {!!option.editSequence && (
            <Pressable accessibilityRole="button" accessibilityLabel={ru ? 'Настроить последовательность' : 'Edit sequence'}
              onPress={() => { hapticLight(); setEditing(true); }}
              style={styles.deleteButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Icon name="options" size={18} color={accent} />
            </Pressable>
          )}
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
      </>}
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  option: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  optionBody: { flex: 1 },
  optionText: { ...TYPE.callout, color: COLORS.text },
  optionSub: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
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
