import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import DraggableSheet from '../components/DraggableSheet';
import Icon from '../components/Icon';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import SeedIcon from './SeedIcon';
import { TreeSilhouette } from './TreeView';
import { growthRatio, harvestCount, HARVEST_EVERY, isFruiting, SPECIES, STAGE_NAMES, STAGES } from './model';

// Сад на пять мест: у каждой породы одно место, больше деревьев не бывает.
// Деревья не копятся списком — выросшее остаётся на своём месте и плодоносит
// дальше, за ним можно снова ухаживать в любой момент. Зерно выпадает только за
// первый урожай и всегда новой породы, поэтому зёрен за всё время четыре.

const RULES = [
  { ru: 'Каждое поминание растит выбранное дерево, первые 33 за день — вдвое.', en: 'Every remembrance grows the chosen tree; the first 33 each day count double.' },
  { ru: 'В первые полчаса после намаза дерево растёт в полтора раза быстрее.', en: 'In the half hour after prayer the tree grows one and a half times faster.' },
  { ru: 'В пятницу поминания понемногу поливают весь сад, а не только выбранное дерево.', en: 'On Friday remembrance waters the whole garden a little, not just the chosen tree.' },
  { ru: 'Первый урожай дерева приносит зерно новой породы — пока в саду есть место.', en: 'A tree\'s first harvest brings a seed of a new species while the garden has room.' },
  { ru: 'Выросшее дерево не уходит: оно даёт урожай за урожаем, пока о нём заботятся.', en: 'A grown tree stays: it keeps giving harvests while you tend it.' },
];

const speciesLabel = (id, ru) => {
  const found = SPECIES.find(s => s.id === id);
  return found ? (ru ? found.ru : found.en) : id;
};

export default function GardenSheet({ visible, onClose, state, plant, setActive }) {
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const [picked, setPicked] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  if (!state) return null;

  const trees = new Map(state.trees.map(t => [t.species, t]));
  const seeds = Object.entries(state.seeds || {}).filter(([species, n]) => n > 0 && !trees.has(species)).map(([species]) => species);
  const active = state.trees.find(t => t.id === state.activeTreeId) || state.trees[0];
  const shown = (picked && state.trees.find(t => t.id === picked)) || active;
  const finalStage = STAGES.length - 1;
  const harvests = harvestCount(shown);
  const ratio = isFruiting(shown)
    ? ((shown.progress - STAGES[finalStage].requiredProgress) % HARVEST_EVERY) / HARVEST_EVERY
    : growthRatio(shown);
  const nextLabel = isFruiting(shown)
    ? (ru ? `до ${harvests + 1}-го урожая` : `to harvest ${harvests + 1}`)
    : (ru ? `до стадии «${STAGE_NAMES[shown.stage + 1]?.ru}»` : `to “${STAGE_NAMES[shown.stage + 1]?.en}”`);

  return (
    <DraggableSheet visible={visible} onClose={() => { setPicked(null); onClose(); }} title={ru ? 'Сад' : 'Garden'}>
      <Text style={styles.subtitle}>{ru ? 'Пять мест — по одному на каждую породу' : 'Five places — one for each species'}</Text>

      {/* Панорама сада: пять мест в ряд. Пустое место — холмик: с зерном его
          можно засадить, без зерна там вопрос. */}
      <View style={styles.panorama}>
        {SPECIES.map(s => {
          const tree = trees.get(s.id);
          const hasSeed = seeds.includes(s.id);
          const isActive = tree && tree.id === state.activeTreeId;
          const isShown = tree && tree.id === shown.id;
          const status = tree
            ? (isFruiting(tree) ? (ru ? `${harvestCount(tree)}-й урожай` : `harvest ${harvestCount(tree)}`)
              : (ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en))
            : hasSeed ? (ru ? 'посадить' : 'plant') : (ru ? 'закрыто' : 'locked');
          return (
            <Pressable key={s.id} style={styles.place} accessibilityRole="button"
              accessibilityState={{ selected: !!isShown }}
              accessibilityLabel={tree ? `${speciesLabel(s.id, ru)}, ${status}${isActive ? (ru ? ', растёт сейчас' : ', growing now') : ''}`
                : hasSeed ? (ru ? `Посадить: ${speciesLabel(s.id, ru)}` : `Plant ${speciesLabel(s.id, ru)}`)
                : (ru ? 'Место ещё закрыто' : 'Place still locked')}
              onPress={() => {
                hapticLight();
                if (tree) setPicked(tree.id);
                else if (hasSeed) { plant(s.id); setPicked(null); }
              }}>
              <View style={[styles.placeArt, isShown && { borderColor: accent }]}>
                {tree ? <TreeSilhouette species={s.id} stage={tree.stage} color={accent} />
                  : hasSeed ? <SeedIcon size={30} color={accent} />
                  : <Text style={styles.question}>?</Text>}
                {isActive && <View style={[styles.activeDot, { backgroundColor: accent }]} />}
              </View>
              <Text style={styles.placeName} numberOfLines={1}>{tree || hasSeed ? speciesLabel(s.id, ru) : '—'}</Text>
              <Text style={[styles.placeStatus, hasSeed && !tree && { color: accent, fontWeight: '600' }]} numberOfLines={1}>{status}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Выбранное дерево: сколько выросло и что дальше. Ухаживать можно за любым. */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {speciesLabel(shown.species, ru)} · {isFruiting(shown) ? (ru ? `${harvests}-й урожай` : `harvest ${harvests}`) : (ru ? STAGE_NAMES[shown.stage]?.ru : STAGE_NAMES[shown.stage]?.en)}
        </Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: accent }]} /></View>
        <View style={styles.cardRow}>
          <Text style={styles.cardSub}>{Math.round(ratio * 100)}% · {nextLabel}</Text>
          {shown.id === state.activeTreeId ? (
            <Text style={[styles.cardSub, { color: accent }]}>{ru ? 'растёт сейчас' : 'growing now'}</Text>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => { hapticLight(); setActive(shown.id); }}
              style={[styles.tendButton, { backgroundColor: accent }]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.tendText}>{ru ? 'Ухаживать' : 'Tend'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {seeds.length > 0 && (
        <View style={styles.seedRow}>
          <SeedIcon size={28} color={accent} />
          <Text style={styles.seedText}>
            {ru ? `Зерно: ${seeds.map(s => speciesLabel(s, ru)).join(', ')} — коснитесь его места, чтобы посадить`
              : `Seed: ${seeds.map(s => speciesLabel(s, ru)).join(', ')} — tap its place to plant`}
          </Text>
        </View>
      )}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }} style={styles.rulesHead}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setRulesOpen(v => !v); }}>
        <Text style={styles.rulesTitle}>{ru ? 'Как растёт сад' : 'How the garden grows'}</Text>
        <Icon name={rulesOpen ? 'up' : 'down'} size={18} color={COLORS.textMuted} />
      </Pressable>
      {rulesOpen && (
        <View style={styles.rules}>
          {RULES.map((rule, i) => <Text key={i} style={styles.ruleText}>{ru ? rule.ru : rule.en}</Text>)}
        </View>
      )}
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: SPACING.md },
  panorama: { flexDirection: 'row', gap: SPACING.xs, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  place: { flex: 1, alignItems: 'center' },
  placeArt: { width: '100%', aspectRatio: 0.8, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'transparent' },
  activeDot: { position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3 },
  question: { ...TYPE.subhead, color: COLORS.textMuted },
  placeName: { ...TYPE.caption, fontSize: 11, color: COLORS.text, fontWeight: '600', marginTop: SPACING.xxs },
  placeStatus: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted },
  card: { marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  cardTitle: { ...TYPE.callout, color: COLORS.text, fontWeight: '700' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: SPACING.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm, minHeight: 32 },
  cardSub: { ...TYPE.caption, color: COLORS.textMuted, flexShrink: 1 },
  tendButton: { minHeight: 32, paddingHorizontal: SPACING.md, borderRadius: RADIUS.pill, justifyContent: 'center' },
  tendText: { ...TYPE.caption, color: COLORS.navy, fontWeight: '700' },
  seedRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  seedText: { ...TYPE.caption, color: COLORS.text, flex: 1 },
  rulesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: SPACING.md },
  rulesTitle: { ...TYPE.callout, color: COLORS.text, fontWeight: '600' },
  rules: { gap: SPACING.xs, paddingBottom: SPACING.sm },
  ruleText: { ...TYPE.caption, color: COLORS.textMuted },
});
