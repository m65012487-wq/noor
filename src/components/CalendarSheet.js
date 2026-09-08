import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Text from './AppText';
import Icon from './Icon';
import DraggableSheet from './DraggableSheet';
import { COLORS, SPACING, RADIUS, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppearance } from '../utils/AppearanceContext';
import { useAppSettings } from '../utils/AppSettingsContext';
import { useLocation } from '../utils/LocationContext';
import { toHijri, formatHijri, monthName, HIJRI_MONTHS_RU, HIJRI_MONTHS_EN } from '../utils/hijri';
import { localTimesForDate } from '../utils/prayerSource';
import { prayerName } from '../constants/prayerNames';
import { moonPhase } from '../utils/moon';

const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const WEEK_RU = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const WEEK_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const sameDay = (a, b) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Календарь на месяц: григорианские числа крупно, по хиджре мелко под ними.
// Неделя начинается с понедельника — так принято там, где приложением
// пользуются, и воскресеньем первого столбца сетка читалась бы сдвинутой.
export default function CalendarSheet({ visible, onClose }) {
  const { t, lang } = useLang();
  const { accent } = useAppearance();
  const { hijriOffset, timeSourceId, asrSchool } = useAppSettings();
  const { coords } = useLocation();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState(today);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    // getDay(): 0 — воскресенье. Сдвигаем к понедельнику.
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= count; d += 1) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return cells;
  }, [cursor]);

  const times = useMemo(() => {
    if (!coords) return null;
    try {
      return localTimesForDate({
        lat: coords.lat, lng: coords.lng, sourceId: timeSourceId,
        school: asrSchool, date: picked,
      });
    } catch {
      return null;
    }
  }, [coords, timeSourceId, asrSchool, picked]);

  const step = (delta) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));

  // Заголовок по хиджре: месяц почти всегда накрывает два лунных, поэтому
  // показываем оба, а не только тот, что выпал на первое число.
  const hijriSpan = useMemo(() => {
    const months = lang === 'ru' ? HIJRI_MONTHS_RU : HIJRI_MONTHS_EN;
    const a = toHijri(new Date(cursor.getFullYear(), cursor.getMonth(), 1), hijriOffset);
    const b = toHijri(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), hijriOffset);
    const na = months[a.month - 1];
    const nb = months[b.month - 1];
    return a.month === b.month ? `${na} ${a.year}` : `${na} — ${nb} ${b.year}`;
  }, [cursor, hijriOffset, lang]);

  const week = lang === 'ru' ? WEEK_RU : WEEK_EN;
  const activeBg = { backgroundColor: `rgba(255,255,255,0.10)` };

  return (
    <DraggableSheet visible={visible} onClose={onClose} title={t('calendar')}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => step(-1)} style={styles.arrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="back" size={22} color={COLORS.accentSoft} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.month}>
            {monthName(cursor.getMonth(), lang)} {cursor.getFullYear()}
          </Text>
          <Text style={styles.monthHijri}>{hijriSpan}</Text>
        </View>
        <TouchableOpacity onPress={() => step(1)} style={styles.arrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="back" size={22} color={COLORS.accentSoft}
            style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {week.map((w) => <Text key={w} style={styles.weekCell}>{w}</Text>)}
      </View>

      <View style={styles.grid}>
        {days.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const h = toHijri(d, hijriOffset);
          const isToday = sameDay(d, today);
          const isPicked = sameDay(d, picked);
          return (
            <TouchableOpacity key={d.getDate()} style={[styles.cell, isPicked && activeBg,
              isPicked && { borderColor: accent, borderWidth: 1 }]}
              onPress={() => setPicked(d)} activeOpacity={0.7}>
              <Text style={[styles.dayNum, isToday && { color: accent, fontWeight: '800' }]}>
                {d.getDate()}
              </Text>
              <Text style={styles.dayHijri}>{h.day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.picked}>
        <Text style={styles.pickedDate}>{formatHijri(picked, hijriOffset, lang)}</Text>
        <Text style={styles.pickedMoon}>
          {t('illumination')}: {Math.round(moonPhase(picked).illumination * 100)}%
        </Text>
      </View>

      <ScrollView style={{ maxHeight: 260 }}>
        {times ? PRAYERS.map((p) => (
          <View key={p} style={styles.timeRow}>
            <Text style={styles.timeName}>{prayerName(p, lang)}</Text>
            <Text style={styles.timeValue}>{times[p]}</Text>
          </View>
        )) : <Text style={styles.pickedMoon}>{t('change_location')}</Text>}
      </ScrollView>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  arrow: { padding: SPACING.sm },
  month: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  monthHijri: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },

  weekRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  weekCell: { ...TYPE.caption, color: COLORS.textMuted, width: `${100 / 7}%`, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'transparent' },
  dayNum: { ...TYPE.callout, color: COLORS.text, fontWeight: '600' },
  // Число по хиджре мельче и приглушено: оно подпись, а не второй заголовок.
  dayHijri: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  picked: { marginTop: SPACING.md, marginBottom: SPACING.sm },
  pickedDate: { ...TYPE.callout, color: COLORS.white, fontWeight: '700' },
  pickedMoon: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },

  timeRow: { flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.hairline },
  timeName: { ...TYPE.callout, color: COLORS.text },
  timeValue: { ...TYPE.callout, ...TYPE.mono, color: COLORS.white, fontWeight: '600' },
});
