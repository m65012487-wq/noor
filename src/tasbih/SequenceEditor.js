import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../components/AppText';
import Icon from '../components/Icon';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { AZKAR_AFTER_PRAYER, DEFAULT_SEQUENCE, DHIKR, SEQUENCE_MAX_STEPS, SEQUENCE_MAX_TARGET, sequenceSteps } from './model';

// Быстрые наборы: три основных поминания с готовыми числами. Второй — классика
// после намаза: Аллаху акбар 34, в сумме круг из 100.
const PRESETS = [[33, 33, 33], [33, 33, 34]].map(targets => DEFAULT_SEQUENCE.map((step, i) => ({ id: step.id, target: targets[i] })));
const clampTarget = value => Math.min(SEQUENCE_MAX_TARGET, Math.max(1, value));
const isValidTarget = value => Number.isInteger(value) && value >= 1 && value <= SEQUENCE_MAX_TARGET;
const sameSteps = (a, b) => a.length === b.length && a.every((step, i) => step.id === b[i].id && step.target === b[i].target);

// Строка шага: номер, название, степпер −/число/+ и перемещение/удаление.
// Число — поле ввода: допустимое значение (целое 1…999) уходит в последовательность
// сразу, на каждое нажатие, — у number-pad на iOS нет Return, и blur мог бы не
// случиться. Пустое поле и 0 живут черновиком, а на blur возвращается текущее число.
// Строка знает свой устойчивый ключ rowKey: правки адресуются им, а не позицией.
function StepRow({ rowKey, index, step, name, first, last, only, ru, accent, onTarget, onMove, onRemove, onFocusRow }) {
  const [draft, setDraft] = useState(null);
  const top = useRef(0);
  const typed = raw => {
    const text = raw.replace(/[^0-9]/g, '');
    const value = parseInt(text, 10);
    if (isValidTarget(value)) { setDraft(null); onTarget(rowKey, value); } else setDraft(text);
  };
  const bump = delta => { hapticLight(); setDraft(null); onTarget(rowKey, current => clampTarget(current + delta)); };
  return (
    <View style={styles.stepRow} onLayout={e => { top.current = e.nativeEvent.layout.y; }}>
      <View style={styles.stepHead}>
        <Text style={styles.stepNumber}>{index + 1}</Text>
        <Text style={styles.stepName} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.stepControls}>
        <View style={styles.stepper}>
          <Pressable accessibilityRole="button" accessibilityLabel={ru ? `Меньше: ${name}` : `Decrease: ${name}`}
            accessibilityState={{ disabled: step.target <= 1 }} disabled={step.target <= 1}
            onPress={() => bump(-1)} style={[styles.iconButton, step.target <= 1 && styles.disabled]}>
            <Icon name="remove" size={18} color={accent} />
          </Pressable>
          <TextInput style={styles.countInput} keyboardType="number-pad" returnKeyType="done" maxLength={3} selectTextOnFocus
            accessibilityLabel={ru ? `Число повторений: ${name}` : `Repeat count: ${name}`}
            value={draft ?? String(step.target)} onChangeText={typed}
            onFocus={() => onFocusRow?.(top.current)} onBlur={() => setDraft(null)} />
          <Pressable accessibilityRole="button" accessibilityLabel={ru ? `Больше: ${name}` : `Increase: ${name}`}
            accessibilityState={{ disabled: step.target >= SEQUENCE_MAX_TARGET }} disabled={step.target >= SEQUENCE_MAX_TARGET}
            onPress={() => bump(1)} style={[styles.iconButton, step.target >= SEQUENCE_MAX_TARGET && styles.disabled]}>
            <Icon name="add" size={18} color={accent} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={ru ? `Выше: ${name}` : `Move up: ${name}`}
          accessibilityState={{ disabled: first }} disabled={first}
          onPress={() => { hapticLight(); onMove(rowKey, -1); }} style={[styles.iconButton, first && styles.disabled]}>
          <Icon name="up" size={18} color={COLORS.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={ru ? `Ниже: ${name}` : `Move down: ${name}`}
          accessibilityState={{ disabled: last }} disabled={last}
          onPress={() => { hapticLight(); onMove(rowKey, 1); }} style={[styles.iconButton, last && styles.disabled]}>
          <Icon name="down" size={18} color={COLORS.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={ru ? `Убрать из последовательности: ${name}` : `Remove from sequence: ${name}`}
          accessibilityState={{ disabled: only }} disabled={only}
          onPress={() => { hapticLight(); onRemove(rowKey); }} style={[styles.iconButton, only && styles.disabled]}>
          <Icon name="close" size={16} color={COLORS.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

// Редактор последовательности внутри шторки DhikrSheet (docs/TASBIH_V4_SPEC.md, A):
// шаги — поминание и число повторений, 1…12 шагов. Каждая правка сразу уходит
// в setSequence и сохраняется; «Готово» возвращает к списку режимов.
// Шаги берутся из sequenceSteps: так редактор показывает ровно то, что считается.
export default function SequenceEditor({ state, setSequence, onDone, onFocusRow }) {
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const [picking, setPicking] = useState(false);

  const resolved = sequenceSteps(state);
  const steps = resolved.map(d => ({ id: d.id, target: d.target }));
  const full = steps.length >= SEQUENCE_MAX_STEPS;

  // Правки строятся от последних шагов (latest), а не от замыкания прошлого
  // рендера: свойство state обновляется после setSequence, а следующее событие
  // может прийти раньше. Ключи строк (keysRef) идут рядом с шагами и переживают
  // перестановку, поэтому поле в фокусе не пересоздаётся и правка не теряется.
  // В модель ключи не попадают.
  const latest = useRef(steps);
  latest.current = steps;
  const keysRef = useRef([]);
  const counter = useRef(0);
  const newKey = () => { counter.current += 1; return `k${counter.current}`; };
  if (keysRef.current.length !== steps.length) keysRef.current = steps.map(newKey);
  const apply = (nextSteps, nextKeys) => {
    latest.current = nextSteps;
    keysRef.current = nextKeys;
    setSequence(nextSteps);
  };
  const setTarget = (key, target) => {
    const i = keysRef.current.indexOf(key);
    if (i < 0) return;
    const value = typeof target === 'function' ? target(latest.current[i].target) : target;
    if (value === latest.current[i].target) return;
    apply(latest.current.map((step, j) => (j === i ? { ...step, target: value } : step)), keysRef.current);
  };
  const move = (key, delta) => {
    const from = keysRef.current.indexOf(key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= latest.current.length) return;
    const nextSteps = [...latest.current];
    const nextKeys = [...keysRef.current];
    [nextSteps[from], nextSteps[to]] = [nextSteps[to], nextSteps[from]];
    [nextKeys[from], nextKeys[to]] = [nextKeys[to], nextKeys[from]];
    apply(nextSteps, nextKeys);
  };
  const remove = key => {
    const i = keysRef.current.indexOf(key);
    if (i < 0 || latest.current.length <= 1) return;
    apply(latest.current.filter((_, j) => j !== i), keysRef.current.filter((_, j) => j !== i));
  };
  const add = id => {
    hapticLight();
    setPicking(false);
    if (latest.current.length >= SEQUENCE_MAX_STEPS) return;
    apply([...latest.current, { id, target: 33 }], [...keysRef.current, newKey()]);
  };
  const choosePreset = preset => {
    hapticLight();
    apply(preset.map(step => ({ ...step })), preset.map(newKey));
  };

  const pickable = [
    ...DHIKR.map(d => ({ id: d.id, label: ru ? d.ru : d.en, sub: ru ? d.translation_ru : d.translation_en })),
    ...(state.customDhikr || []).map(d => ({ id: `custom:${d.id}`, label: d.text, sub: d.translation })),
  ];

  return (
    <View>
      <View style={styles.presets}>
        {PRESETS.map(preset => {
          const selected = sameSteps(steps, preset);
          const label = preset.map(step => step.target).join(' · ');
          return (
            <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }}
              accessibilityLabel={ru ? `Набор ${label}` : `Preset ${label}`}
              onPress={() => choosePreset(preset)}
              style={[styles.chip, selected && { borderColor: accent }]}>
              <Text style={[styles.chipText, selected && { color: accent, fontWeight: '600' }]}>{label}</Text>
            </Pressable>
          );
        })}
        {/* Целый набор азкаров после намаза: шесть шагов вместо трёх. */}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: sameSteps(steps, AZKAR_AFTER_PRAYER) }}
          accessibilityLabel={ru ? 'Набор: азкары после намаза' : 'Preset: adhkar after prayer'}
          onPress={() => choosePreset(AZKAR_AFTER_PRAYER)}
          style={[styles.chip, sameSteps(steps, AZKAR_AFTER_PRAYER) && { borderColor: accent }]}>
          <Text style={[styles.chipText, sameSteps(steps, AZKAR_AFTER_PRAYER) && { color: accent, fontWeight: '600' }]}>
            {ru ? 'После намаза' : 'After prayer'}
          </Text>
        </Pressable>
      </View>

      {resolved.map((d, index) => (
        <StepRow key={keysRef.current[index]} rowKey={keysRef.current[index]} index={index} step={steps[index]} name={ru ? d.ru : d.en}
          first={index === 0} last={index === steps.length - 1} only={steps.length <= 1} ru={ru} accent={accent}
          onTarget={setTarget} onMove={move} onRemove={remove} onFocusRow={onFocusRow} />
      ))}

      {full ? (
        <Text style={styles.limit}>{ru ? `Предел — ${SEQUENCE_MAX_STEPS} шагов.` : `Limit reached — ${SEQUENCE_MAX_STEPS} steps.`}</Text>
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: picking }}
            onPress={() => { hapticLight(); setPicking(v => !v); }} style={styles.addButton}>
            <Icon name={picking ? 'up' : 'add'} size={18} color={accent} />
            <Text style={[styles.addText, { color: accent }]}>{ru ? 'Добавить поминание' : 'Add dhikr'}</Text>
          </Pressable>
          {picking && pickable.map(option => (
            <Pressable key={option.id} accessibilityRole="button"
              accessibilityLabel={ru ? `Добавить: ${option.label}` : `Add: ${option.label}`}
              onPress={() => add(option.id)} style={styles.pickRow}>
              <Text style={styles.pickText} numberOfLines={1}>{option.label}</Text>
              {!!option.sub && <Text style={styles.pickSub} numberOfLines={1}>{option.sub}</Text>}
            </Pressable>
          ))}
        </>
      )}

      <Pressable accessibilityRole="button" onPress={() => { hapticLight(); onDone(); }}
        style={[styles.doneButton, { backgroundColor: accent }]}>
        <Text style={styles.doneText}>{ru ? 'Готово' : 'Done'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  chip: {
    minHeight: 44, paddingHorizontal: SPACING.md, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { ...TYPE.callout, color: COLORS.text, ...TYPE.mono },
  stepRow: { paddingVertical: SPACING.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.hairline },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.sm, paddingTop: SPACING.xs },
  stepNumber: { ...TYPE.callout, ...TYPE.mono, color: COLORS.textMuted, minWidth: 18 },
  stepName: { ...TYPE.callout, color: COLORS.text, flex: 1 },
  stepControls: { flexDirection: 'row', alignItems: 'center' },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  countInput: {
    width: 60, minHeight: 44, textAlign: 'center', color: COLORS.text, ...TYPE.body, ...TYPE.mono,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.hairline,
  },
  limit: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.sm, paddingHorizontal: SPACING.sm },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 44, marginTop: SPACING.sm, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.hairline,
  },
  addText: { ...TYPE.callout, fontWeight: '600' },
  pickRow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  pickText: { ...TYPE.callout, color: COLORS.text },
  pickSub: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
  doneButton: { minHeight: 44, marginTop: SPACING.md, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  doneText: { ...TYPE.callout, color: COLORS.navy, fontWeight: '600' },
});
