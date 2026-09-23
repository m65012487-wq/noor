import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import DraggableSheet from '../components/DraggableSheet';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { hapticLight } from '../utils/haptics';
import { SEED_ASSETS, TREE_ASSETS } from './assets';
import { SPECIES, STAGE_NAMES } from './model';

const RULES = [
  { ru: 'Раз в семь дней зикра — зерно в подарок.', en: 'A seed for every seventh day of dhikr.' },
  { ru: 'Когда дерево приносит плод — новое зерно.', en: 'A seed when a tree bears fruit.' },
  { ru: 'Иногда — за полный круг из 99 поминаний.', en: 'Sometimes for a full circle of 99 remembrances.' },
];

function speciesLabel(id, ru) {
  const found = SPECIES.find(s => s.id === id);
  return found ? (ru ? found.ru : found.en) : id;
}

// Bottom sheet: the player's trees (tap to make one active) and their seed
// inventory (tap to plant). Reused DraggableSheet gives the same glass slide
// behaviour as the rest of the app instead of a bespoke modal.
export default function GardenSheet({ visible, onClose, state, plant, setActive }) {
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  if (!state) return null;
  const trees = state.trees;
  const seedEntries = Object.entries(state.seeds || {}).filter(([, count]) => count > 0);

  return (
    <DraggableSheet visible={visible} onClose={onClose} title={ru ? 'Сад' : 'Garden'}>
      <Text style={styles.sectionTitle}>{ru ? 'Мои деревья' : 'My trees'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {trees.map(tree => {
          const active = tree.id === state.activeTreeId;
          const art = TREE_ASSETS[tree.species]?.[tree.stage];
          const label = ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en;
          return (
            <Pressable key={tree.id} onPress={() => { if (!active) { hapticLight(); setActive(tree.id); } }}
              accessibilityRole="button" accessibilityState={{ selected: active }}
              accessibilityLabel={`${speciesLabel(tree.species, ru)} · ${label}${active ? (ru ? ' · активно' : ' · active') : ''}`}
              style={[styles.treeCard, active && { borderColor: accent }]}>
              {art && <Image source={art.source} style={styles.treeImage} resizeMode="contain" />}
              <Text style={styles.treeSpecies} numberOfLines={1}>{speciesLabel(tree.species, ru)}</Text>
              <Text style={styles.treeStage} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionTitle, styles.seedsTitle]}>{ru ? 'Зёрна' : 'Seeds'}</Text>
      {seedEntries.length === 0 ? (
        <View style={styles.emptySeeds}>
          <Text style={styles.emptyTitle}>{ru ? 'Зёрен пока нет' : 'No seeds yet'}</Text>
          <Text style={styles.emptyBody}>{ru ? 'Они выпадают за усердие в зикре — смотрите ниже, как.' : 'They drop for steady dhikr — see how below.'}</Text>
        </View>
      ) : (
        <View style={styles.seedList}>
          {seedEntries.map(([species, count]) => (
            <View key={species} style={styles.seedCard}>
              <Image source={SEED_ASSETS[species]} style={styles.seedImage} resizeMode="contain" />
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
  emptySeeds: { paddingVertical: SPACING.md },
  emptyTitle: { ...TYPE.callout, color: COLORS.text },
  emptyBody: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
  seedList: { gap: SPACING.sm, paddingTop: SPACING.sm },
  seedCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  seedImage: { width: 36, height: 36 },
  seedInfo: { flex: 1 },
  seedSpecies: { ...TYPE.callout, color: COLORS.text },
  seedCount: { ...TYPE.caption, color: COLORS.textMuted },
  plantButton: { minHeight: 44, minWidth: 44, paddingHorizontal: SPACING.md, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  plantButtonText: { ...TYPE.callout, color: COLORS.navy, fontWeight: '600' },
  rules: { marginTop: SPACING.lg, gap: SPACING.xxs },
  ruleText: { ...TYPE.caption, color: COLORS.textMuted },
});
