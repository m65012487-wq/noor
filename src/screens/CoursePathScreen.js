import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassView from '../components/GlassView';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { COURSE, LESSONS_PER_UNIT } from '../constants/course';
import { getCourseProgress, getLessonStars, totalStars, isUnitUnlocked, unitLessonsDone } from '../utils/courseEngine';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';

// Embedded inside the Quran tab (Learn segment). Shows the unit path.
export default function CoursePathScreen({ onOpenLesson, refreshKey }) {
  const { t, lang } = useLang();
  const { accent } = useAppearance();
  const [progress, setProgress] = useState({});
  const [starsMap, setStarsMap] = useState({});

  const reload = useCallback(() => {
    (async () => { setProgress(await getCourseProgress()); setStarsMap(await getLessonStars()); })();
  }, []);

  useFocusEffect(reload);
  React.useEffect(() => { reload(); }, [refreshKey, reload]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
      {/* Stars total header */}
      <GlassView azure radius={RADIUS.md} style={styles.xpBar}>
        <View style={styles.xpInner}>
          <Ionicons name="star" size={20} color="#ffce5a" />
          <Text style={styles.xpText}>{totalStars(starsMap)} {t('stars')}</Text>
        </View>
      </GlassView>

      {COURSE.map((unit, ui) => {
        const unlocked = isUnitUnlocked(ui, progress);
        const done = unitLessonsDone(unit.id, progress);
        return (
          <View key={unit.id} style={styles.unit}>
            <Text style={[styles.unitTitle, !unlocked && styles.dim]}>
              {lang === 'ru' ? unit.title_ru : unit.title_en}
            </Text>

            {/* Lesson circles in a gentle zig-zag path */}
            <View style={styles.path}>
              {Array.from({ length: LESSONS_PER_UNIT }).map((_, li) => {
                const lessonUnlocked = unlocked && li <= done;
                const lessonDone = li < done;
                const offset = [0, 46, 0][li % 3]; // zig-zag
                return (
                  <View key={li} style={[styles.node, { marginLeft: offset }]}>
                    <TouchableOpacity
                      disabled={!lessonUnlocked}
                      activeOpacity={0.85}
                      onPress={() => onOpenLesson(ui, li)}>
                      <View style={[
                        styles.circle,
                        { borderColor: accent },
                        lessonDone && { backgroundColor: accent },
                        !lessonUnlocked && styles.circleLocked,
                      ]}>
                        {lessonDone ? (
                          <Ionicons name="checkmark" size={26} color={COLORS.navy} />
                        ) : !lessonUnlocked ? (
                          <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                        ) : (
                          <Ionicons name="star" size={24} color={accent} />
                        )}
                      </View>
                    </TouchableOpacity>
                    {/* earned stars for this lesson */}
                    {lessonUnlocked && (
                      <View style={styles.starsUnder}>
                        {[0, 1, 2].map((s) => {
                          const earned = (starsMap[`${unit.id}:${li}`] || 0) > s;
                          return (
                            <Ionicons key={s} name={earned ? 'star' : 'star-outline'} size={11}
                              color={earned ? '#ffce5a' : 'rgba(255,255,255,0.25)'} />
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Preview of the letters in this unit */}
            <View style={styles.letterPreview}>
              {unit.items.slice(0, 8).map((it, i) => (
                <Text key={i} style={[styles.previewAr, !unlocked && styles.dim]}>{it.ar}</Text>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  xpBar: { marginBottom: SPACING.lg },
  xpInner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, justifyContent: 'center' },
  xpText: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginLeft: SPACING.sm },
  unit: { marginBottom: SPACING.xl },
  unitTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: SPACING.md },
  dim: { opacity: 0.4 },
  path: { alignItems: 'center' },
  node: { marginBottom: SPACING.md, alignItems: 'center' },
  starsUnder: { flexDirection: 'row', marginTop: 4, gap: 2 },
  circle: { width: 66, height: 66, borderRadius: 33, borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  circleLocked: { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.03)' },
  letterPreview: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: SPACING.sm, gap: 10 },
  previewAr: { color: COLORS.accentSoft, fontSize: 24, fontFamily: FONTS.arabic },
});
