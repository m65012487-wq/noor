import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import DraggableSheet from '../components/DraggableSheet';
import Icon from '../components/Icon';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { pick } from '../i18n/languages';
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
  { ru: 'Каждое поминание растит выбранное дерево, первые 33 за день — вдвое.', en: 'Every remembrance grows the chosen tree; the first 33 each day count double.', tr: 'Her zikir seçilen ağacı büyütür; günün ilk 33’ü iki katı sayılır.', id: 'Setiap dzikir menumbuhkan pohon yang dipilih; 33 pertama setiap hari dihitung dua kali lipat.', fr: 'Chaque dhikr fait grandir l’arbre choisi ; les 33 premiers de la journée comptent double.', de: 'Jeder Dhikr lässt den gewählten Baum wachsen; die ersten 33 am Tag zählen doppelt.', es: 'Cada dhikr hace crecer el árbol elegido; los primeros 33 de cada día cuentan doble.' },
  { ru: 'В первые полчаса после намаза дерево растёт в полтора раза быстрее.', en: 'In the half hour after prayer the tree grows one and a half times faster.', tr: 'Namazdan sonraki yarım saatte ağaç bir buçuk kat hızlı büyür.', id: 'Dalam setengah jam setelah shalat, pohon tumbuh satu setengah kali lebih cepat.', fr: 'Dans la demi-heure qui suit la prière, l’arbre pousse une fois et demie plus vite.', de: 'In der halben Stunde nach dem Gebet wächst der Baum anderthalbmal so schnell.', es: 'En la media hora posterior a la oración, el árbol crece una vez y media más rápido.' },
  { ru: 'В пятницу поминания понемногу поливают весь сад, а не только выбранное дерево.', en: 'On Friday remembrance waters the whole garden a little, not just the chosen tree.', tr: 'Cuma günü zikir yalnızca seçilen ağacı değil, tüm bahçeyi biraz sular.', id: 'Pada hari Jumat, dzikir menyiram seluruh kebun sedikit demi sedikit, bukan hanya pohon yang dipilih.', fr: 'Le vendredi, le dhikr arrose un peu tout le jardin, et pas seulement l’arbre choisi.', de: 'Freitags bewässert der Dhikr den ganzen Garten ein wenig, nicht nur den gewählten Baum.', es: 'El viernes, el dhikr riega un poco todo el jardín, no solo el árbol elegido.' },
  { ru: 'Первый урожай дерева приносит зерно новой породы — пока в саду есть место.', en: 'A tree\'s first harvest brings a seed of a new species while the garden has room.', tr: 'Ağacın ilk hasadı, bahçede yer olduğu sürece yeni bir türün tohumunu getirir.', id: 'Panen pertama sebuah pohon membawa biji jenis baru selama kebun masih punya ruang.', fr: 'La première récolte d’un arbre apporte une graine d’une nouvelle espèce tant que le jardin a de la place.', de: 'Die erste Ernte eines Baums bringt einen Samen einer neuen Art, solange im Garten Platz ist.', es: 'La primera cosecha de un árbol trae una semilla de una especie nueva mientras haya sitio en el jardín.' },
  { ru: 'Выросшее дерево не уходит: оно даёт урожай за урожаем, пока о нём заботятся.', en: 'A grown tree stays: it keeps giving harvests while you tend it.', tr: 'Büyümüş ağaç gitmez: ona baktığınız sürece hasat vermeye devam eder.', id: 'Pohon yang sudah tumbuh tetap ada: ia terus berpanen selama Anda merawatnya.', fr: 'Un arbre adulte reste : il continue de donner des récoltes tant que vous en prenez soin.', de: 'Ein ausgewachsener Baum bleibt: Er trägt weiter Ernten, solange Sie ihn pflegen.', es: 'Un árbol crecido se queda: sigue dando cosechas mientras lo cuide.' },
];

const speciesLabel = (id, lang) => {
  const found = SPECIES.find(s => s.id === id);
  return found ? pick(found, lang) : id;
};

export default function GardenSheet({ visible, onClose, state, plant, setActive }) {
  const { t, lang } = useLang();
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
    ? t('garden_to_harvest', { n: harvests + 1 })
    : t('garden_to_stage', { name: pick(STAGE_NAMES[shown.stage + 1], lang) });

  return (
    <DraggableSheet visible={visible} onClose={() => { setPicked(null); onClose(); }} title={t('garden_title')}>
      <Text style={styles.subtitle}>{t('garden_subtitle')}</Text>

      {/* Панорама сада: пять мест в ряд. Пустое место — холмик: с зерном его
          можно засадить, без зерна там вопрос. */}
      <View style={styles.panorama}>
        {SPECIES.map(s => {
          const tree = trees.get(s.id);
          const hasSeed = seeds.includes(s.id);
          const isActive = tree && tree.id === state.activeTreeId;
          const isShown = tree && tree.id === shown.id;
          const status = tree
            ? (isFruiting(tree) ? t('garden_harvest', { n: harvestCount(tree) })
              : pick(STAGE_NAMES[tree.stage], lang))
            : hasSeed ? t('garden_plant') : t('garden_locked');
          return (
            <Pressable key={s.id} style={styles.place} accessibilityRole="button"
              accessibilityState={{ selected: !!isShown }}
              accessibilityLabel={tree ? `${speciesLabel(s.id, lang)}, ${status}${isActive ? t('garden_growing_suffix') : ''}`
                : hasSeed ? t('garden_plant_label', { name: speciesLabel(s.id, lang) })
                : t('garden_place_locked')}
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
              <Text style={styles.placeName} numberOfLines={1}>{tree || hasSeed ? speciesLabel(s.id, lang) : '—'}</Text>
              <Text style={[styles.placeStatus, hasSeed && !tree && { color: accent, fontWeight: '600' }]} numberOfLines={1}>{status}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Выбранное дерево: сколько выросло и что дальше. Ухаживать можно за любым. */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {speciesLabel(shown.species, lang)} · {isFruiting(shown) ? t('garden_harvest', { n: harvests }) : pick(STAGE_NAMES[shown.stage], lang)}
        </Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: accent }]} /></View>
        <View style={styles.cardRow}>
          <Text style={styles.cardSub}>{Math.round(ratio * 100)}% · {nextLabel}</Text>
          {shown.id === state.activeTreeId ? (
            <Text style={[styles.cardSub, { color: accent }]}>{t('garden_growing_now')}</Text>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => { hapticLight(); setActive(shown.id); }}
              style={[styles.tendButton, { backgroundColor: accent }]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.tendText}>{t('garden_tend')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {seeds.length > 0 && (
        <View style={styles.seedRow}>
          <SeedIcon size={28} color={accent} />
          <Text style={styles.seedText}>
            {t('garden_seed_hint', { names: seeds.map(s => speciesLabel(s, lang)).join(', ') })}
          </Text>
        </View>
      )}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }} style={styles.rulesHead}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setRulesOpen(v => !v); }}>
        <Text style={styles.rulesTitle}>{t('garden_rules_title')}</Text>
        <Icon name={rulesOpen ? 'up' : 'down'} size={18} color={COLORS.textMuted} />
      </Pressable>
      {rulesOpen && (
        <View style={styles.rules}>
          {RULES.map((rule, i) => <Text key={i} style={styles.ruleText}>{pick(rule, lang)}</Text>)}
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
