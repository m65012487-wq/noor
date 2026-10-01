import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import GlassView from '../components/GlassView';
import Icon from '../components/Icon';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { useLang } from '../i18n/LanguageContext';
import useTasbih from './useTasbih';
import { TreeSilhouette } from './TreeView';
import TasbihScreen from './TasbihScreen';
import { activeTree, SPECIES, STAGE_NAMES } from './model';

// Вход в тасбих с главного экрана: обычная карточка приложения, а не ворота
// с наездом камеры. Ворота были отдельной сценой со своей графикой и
// полуторасекундным переходом — ради одной кнопки это оказалось и долго,
// и чужеродно рядом с остальными карточками.
export default function TasbihEntry() {
  const { state, error } = useTasbih();
  const { lang } = useLang();
  const ru = lang === 'ru';
  const { accent } = useAppearance();
  const [open, setOpen] = useState(false);
  // Модальное окно на iOS живёт в своём UIWindow, и внутри него отступы
  // безопасной зоны приходится передать явно — иначе шапка экрана лезет
  // под вырез.
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const tree = state ? activeTree(state) : null;
  const species = tree ? SPECIES.find(s => s.id === tree.species) : null;
  const subtitle = tree
    ? `${ru ? species?.ru : species?.en} · ${ru ? STAGE_NAMES[tree.stage]?.ru : STAGE_NAMES[tree.stage]?.en}`
    : (ru ? 'Счётчик зикра' : 'Dhikr counter');
  const enabled = !!state || !!error;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen(true)} disabled={!enabled} accessibilityRole="button"
        accessibilityLabel={`${ru ? 'Тасбих' : 'Tasbih'}. ${subtitle}`}
        accessibilityHint={ru ? 'Открывает счётчик зикра и дерево' : 'Opens the dhikr counter and the tree'}>
        <GlassView azure radius={RADIUS.md} style={styles.card}>
          <View style={styles.row}>
            {/* Дерево на карточке — то же самое, что и внутри: видно, до
                какой стадии оно доросло, без лишних цифр. */}
            <View style={styles.preview}>
              {tree && <TreeSilhouette species={tree.species} stage={tree.stage} color={accent} shadow={false} crop />}
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{ru ? 'Тасбих' : 'Tasbih'}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
            <Icon name="forward" size={16} color={COLORS.textMuted} />
          </View>
        </GlassView>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
          <TasbihScreen onClose={() => setOpen(false)} />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.xs, paddingTop: SPACING.xs },
  card: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  preview: { width: 44, height: 52 },
  text: { flex: 1, marginLeft: SPACING.sm },
  title: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 1 },
});
