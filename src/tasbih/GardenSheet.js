import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import DraggableSheet from '../components/DraggableSheet';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import SeedIcon from './SeedIcon';
import { TreeSilhouette } from './TreeView';
import { isFruiting, SPECIES, STAGE_NAMES, STAGES } from './model';

const RULES = [
  { ru: 'Каждое поминание растит дерево, первые 33 за день — вдвое.', en: 'Every remembrance grows the tree; the first 33 each day count double.' },
  { ru: 'Когда дерево приносит плоды — новое зерно.', en: 'A tree in fruit gives a new seed.' },
  { ru: 'Новые породы дарятся за каждый седьмой день зикра и когда дерево становится молодым.', en: 'New species are gifted every seventh day of dhikr and when a tree grows young.' },
  { ru: 'В пятницу зерно приносит первая завершённая последовательность или 99 поминаний за день.', en: 'On Friday a seed comes with the first completed sequence or 99 remembrances in a day.' },
  { ru: 'В первые полчаса после намаза дерево растёт в полтора раза быстрее.', en: 'In the half hour after prayer the tree grows one and a half times faster.' },
  { ru: 'Дерево в плодах можно отправить в рощу — оно останется в саду навсегда.', en: 'A tree in fruit can be sent to the grove, where it stays for good.' },
  { ru: 'Рост после плодов не пропадает — он перейдёт к следующему посаженному зерну.', en: 'Growth after fruiting is kept for the next seed you plant.' },
];

function speciesLabel(id, ru) {
  const found = SPECIES.find(s => s.id === id);
  return found ? (ru ? found.ru : found.en) : id;
}

// Bottom sheet: the player's trees (tap to make one active) and their seed
// inventory (tap to plant). Reused DraggableSheet gives the same glass slide
// behaviour as the rest of the app instead of a bespoke modal.
export default function GardenSheet({ visible, onClose, state, plant, setActive, retire }) {
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  if (!state) return null;
  const trees = state.trees.filter(t => !t.inGrove);
  const grove = state.trees.filter(t => t.inGrove);
  // Коллекция: порода «собрана», когда она есть деревом (в том числе в роще)
  // или зерном. Закрытые породы показываются бледным силуэтом без названия —
  // загадка, а не пустая клетка.
  const owned = new Set([...state.trees.map(t => t.species),
    ...Object.entries(state.seeds || {}).filter(([, n]) => n > 0).map(([s]) => s)]);
  const finalStage = STAGES.length - 1;
  const seedEntries = Object.entries(state.seeds || {}).filter(([, count]) => count > 0);

  return (
    <DraggableSheet visible={visible} onClose={onClose} title={ru ? 'Сад' : 'Garden'}>
      <Text style={styles.sectionTitle}>{ru ? 'Мои деревья' : 'My trees'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {trees.map(tree => {
          const active = tree.id === state.activeTreeId;
          const label = ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en;
          return (
            <Pressable key={tree.id} onPress={() => { if (!active) { hapticLight(); setActive(tree.id); } }}
              accessibilityRole="button" accessibilityState={{ selected: active }}
              accessibilityLabel={`${speciesLabel(tree.species, ru)} · ${label}${active ? (ru ? ' · активно' : ' · active') : ''}`}
              style={[styles.treeCard, active && { borderColor: accent }]}>
              <View style={styles.treeImage}><TreeSilhouette species={tree.species} stage={tree.stage} color={accent} /></View>
              <Text style={styles.treeSpecies} numberOfLines={1}>{speciesLabel(tree.species, ru)}</Text>
              <Text style={styles.treeStage} numberOfLines={1}>{label}</Text>
              {isFruiting(tree) && !active && retire && (
                <Pressable onPress={() => { hapticLight(); retire(tree.id); }} accessibilityRole="button"
                  accessibilityLabel={ru ? `Отправить в рощу: ${speciesLabel(tree.species, ru)}` : `Send to the grove: ${speciesLabel(tree.species, ru)}`}
                  style={styles.groveButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={[styles.groveButtonText, { color: accent }]}>{ru ? 'В рощу' : 'To grove'}</Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionTitle, styles.seedsTitle]}>{ru ? 'Зёрна' : 'Seeds'}</Text>
      {state.reserve > 0 && (
        <Text style={styles.reserve}>
          {ru ? `Запас роста для нового дерева: ${Math.floor(state.reserve)}` : `Growth saved for the next tree: ${Math.floor(state.reserve)}`}
        </Text>
      )}
      {seedEntries.length === 0 ? (
        <View style={styles.emptySeeds}>
          <Text style={styles.emptyTitle}>{ru ? 'Зёрен пока нет' : 'No seeds yet'}</Text>
          <Text style={styles.emptyBody}>{ru ? 'Зерно выпадет, когда дерево принесёт плоды.' : 'A seed drops when the tree bears fruit.'}</Text>
        </View>
      ) : (
        <View style={styles.seedList}>
          {seedEntries.map(([species, count]) => (
            <View key={species} style={styles.seedCard}>
              <SeedIcon size={36} color={accent} />
              <View style={styles.seedInfo}>
                <Text style={styles.seedSpecies}>{speciesLabel(species, ru)}</Text>
                <Text style={styles.seedCount}>{ru ? `${count} шт.` : `${count} seed${count > 1 ? 's' : ''}`}</Text>
              </View>
              <Pressable onPress={() => { hapticLight(); plant(species); }} accessibilityRole="button"
                accessibilityLabel={ru ? `Посадить ${speciesLabel(species, ru)}` : `Plant ${speciesLabel(species, ru)}`}
                style={[styles.plantButton, { backgroundColor: accent }]}>
                <Text style={styles.plantButtonText}>{ru ? 'Посадить' : 'Plant'}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, styles.seedsTitle]}>
        {ru ? `Коллекция · ${SPECIES.filter(s => owned.has(s.id)).length} из ${SPECIES.length}` : `Collection · ${SPECIES.filter(s => owned.has(s.id)).length} of ${SPECIES.length}`}
      </Text>
      <View style={styles.collection}>
        {SPECIES.map(s => {
          const have = owned.has(s.id);
          return (
            <View key={s.id} style={styles.collectionItem} accessible
              accessibilityLabel={have ? speciesLabel(s.id, ru) : (ru ? 'Ещё не открыта' : 'Not found yet')}>
              <View style={[styles.collectionImage, !have && { opacity: 0.16 }]}>
                <TreeSilhouette species={s.id} stage={finalStage} color={accent} />
              </View>
              <Text style={styles.collectionName} numberOfLines={1}>{have ? speciesLabel(s.id, ru) : '?'}</Text>
            </View>
          );
        })}
      </View>

      {grove.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.seedsTitle]}>{ru ? `Роща · ${grove.length}` : `Grove · ${grove.length}`}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {grove.map(tree => (
              <View key={tree.id} style={styles.groveItem} accessible
                accessibilityLabel={speciesLabel(tree.species, ru)}>
                <View style={styles.groveImage}><TreeSilhouette species={tree.species} stage={finalStage} color={accent} /></View>
                <Text style={styles.treeStage} numberOfLines={1}>{speciesLabel(tree.species, ru)}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.rules}>
        {RULES.map((rule, index) => (
          <Text key={index} style={styles.ruleText}>{ru ? rule.ru : rule.en}</Text>
        ))}
      </View>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { ...TYPE.subhead, color: COLORS.text },
  seedsTitle: { marginTop: SPACING.lg },
  row: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  treeCard: {
    width: 96, alignItems: 'center', padding: SPACING.xs, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: 'transparent', backgroundColor: COLORS.surface,
  },
  treeImage: { width: 72, height: 90 },
  treeSpecies: { ...TYPE.caption, color: COLORS.text, marginTop: SPACING.xs, textAlign: 'center' },
  treeStage: { ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center' },
  groveButton: { minHeight: 32, justifyContent: 'center', marginTop: SPACING.xxs },
  groveButtonText: { ...TYPE.caption, fontWeight: '600' },
  collection: { flexDirection: 'row', gap: SPACING.xs, paddingTop: SPACING.sm },
  collectionItem: { flex: 1, alignItems: 'center' },
  collectionImage: { width: '100%', aspectRatio: 0.8 },
  collectionName: { ...TYPE.caption, fontSize: 11, color: COLORS.textMuted, marginTop: SPACING.xxs, textAlign: 'center' },
  groveItem: { width: 72, alignItems: 'center' },
  groveImage: { width: 64, height: 80 },
  reserve: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xs },
  emptySeeds: { paddingVertical: SPACING.md },
  emptyTitle: { ...TYPE.callout, color: COLORS.text },
  emptyBody: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
  seedList: { gap: SPACING.sm, paddingTop: SPACING.sm },
  seedCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  seedInfo: { flex: 1 },
  seedSpecies: { ...TYPE.callout, color: COLORS.text },
  seedCount: { ...TYPE.caption, color: COLORS.textMuted },
  plantButton: { minHeight: 44, minWidth: 44, paddingHorizontal: SPACING.md, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  plantButtonText: { ...TYPE.callout, color: COLORS.navy, fontWeight: '600' },
  rules: { marginTop: SPACING.lg, gap: SPACING.xxs },
  ruleText: { ...TYPE.caption, color: COLORS.textMuted },
});
