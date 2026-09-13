import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, ScrollView, TouchableOpacity, AppState, LayoutAnimation, Platform, UIManager } from 'react-native';
import Text from '../components/AppText';
import Icon from '../components/Icon';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { Card, SectionTitle } from '../components/ui';
import LocationPicker from '../components/LocationPicker';
import SettingsModal from '../components/SettingsModal';
import PrayerReminderSheet from '../components/PrayerReminderSheet';
import { COLORS, SPACING, RADIUS, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';

import ProgressRing from '../components/ProgressRing';
import { getPrayerDay, getPrayerWindow, prayerEvents } from '../utils/prayerSchedule';
import { localDateKey } from '../utils/calendarDate';
import { updateSchedule } from '../utils/scheduleQueue';
import { schedulePrayerReminders } from '../utils/prayerNotifications';
import { publishPrayerDay } from '../utils/widgetBridge';
import { useLang } from '../i18n/LanguageContext';
import { prayerName } from '../constants/prayerNames';
import { useTabSwipe } from '../utils/useTabSwipe';
import MoonPhase from '../components/MoonPhase';
import CalendarSheet from '../components/CalendarSheet';
import GardenPrototypeScreen from './GardenPrototypeScreen';
import GateEntry from '../tasbih/GateEntry';
import { formatGregorian, formatHijri } from '../utils/hijri';
import { useLocation } from '../utils/LocationContext';
import { useAppSettings, notifSoundFile, adhanNotifSoundFile } from '../utils/AppSettingsContext';
import { scheduleFajrDays, markAwake, isInAlarmWindow, getFajrAlarmSettings } from '../utils/fajrAlarm';

// Восход стоит между фаджром и зухром: он завершает время утренней молитвы,
// и без него в расписании оставался необъяснимый разрыв.
const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PrayerTimesScreen() {
  const { t, lang } = useLang();
  const swipe = useTabSwipe('Prayer');
  const { accent } = useAppearance();
  const { coords } = useLocation();
  const { reminders, timeSourceId, asrSchool, notifSound, adhanNotifSound, hijriOffset, tune } = useAppSettings();
  const [clock, setClock] = useState(new Date());
  const today = clock;
  const [days, setDays] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const dayKey = localDateKey(clock);
  const [nextTime, setNextTime] = useState('');
  const [afterTime, setAfterTime] = useState('');
  const [afterNext, setAfterNext] = useState(null);
  const [timings, setTimings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);
  const [nextName, setNextName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderPrayer, setReminderPrayer] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [gardenOpen, setGardenOpen] = useState(false);
  // Намаз через один после ближайшего: список замкнут в круг, поэтому после
  // иши идёт фаджр следующих суток. Считается ниже nextName — выше он попадал
  // в мёртвую зону объявления и падал на первом же рендере.
  function toggleSchedule() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScheduleOpen((v) => !v);
  }

  const [alarmWindow, setAlarmWindow] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { setClock(new Date()); setRefresh(v => v + 1); }
    });
    return () => { clearInterval(tick); sub.remove(); };
  }, []);

  useEffect(() => {
    if (!coords) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTimings(null);
    setDays([]);
    const options = { lat: coords.lat, lng: coords.lng, sourceId: timeSourceId, school: asrSchool, tune };
    getPrayerDay(options)
      .then(day => {
        if (cancelled) return [];
        setTimings(day.timings);
        if (day.offlineFallback) setError(lang === 'ru' ? 'Нет ответа источника: используется локальный расчёт выбранного метода.' : 'Source unavailable: using the selected method offline.');
        setLoading(false);
        return getPrayerWindow(options);
      })
      .then(window => {
        if (cancelled) return;
        setDays(window);
        setTimings(window.find(day => day.date === dayKey)?.timings || null);
        publishPrayerDay({ days: window, order: PRAYERS, label: key => prayerName(key, lang), city: coords.label || '' });
      })
      .catch(() => { if (!cancelled) setError(t('load_error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [coords, timeSourceId, asrSchool, tune, dayKey, refresh, lang, t]);

  useEffect(() => {
    if (!days.length) return undefined;
    let cancelled = false;
    updateSchedule(async () => {
      if (cancelled) return;
      await schedulePrayerReminders({
        timesForDate: date => days.find(day => day.date === localDateKey(date))?.timings,
        reminders, sound: notifSoundFile(notifSound), atTimeSound: adhanNotifSoundFile(adhanNotifSound),
        label: p => prayerName(p, lang),
        body: (p, minutes) => p === 'Sunrise' ? t('notif_sunrise')
          : minutes === 0 ? (lang === 'ru' ? 'Время ' : 'Time for ') + prayerName(p, lang)
          : (lang === 'ru' ? minutes + ' минут до ' : minutes + ' minutes until ') + prayerName(p, lang),
      });
      await scheduleFajrDays(days, {
        title: lang === 'ru' ? 'Фаджр — время проснуться' : 'Fajr — time to wake up',
        body: lang === 'ru' ? 'Подтвердите «Я проснулся» в приложении.' : 'Confirm “I’m awake” in the app.',
      });
      if (!cancelled) setAlarmWindow(await isInAlarmWindow() && (await getFajrAlarmSettings()).enabled);
    }).catch(() => { if (!cancelled) setError(lang === 'ru' ? 'Не удалось обновить уведомления. Проверьте разрешения.' : 'Could not update notifications. Check permissions.'); });
    return () => { cancelled = true; };
  }, [days, reminders, notifSound, adhanNotifSound, lang, t]);

  useEffect(() => {
    const events = prayerEvents(days, clock);
    const next = events.next;
    if (!next) { setNextName(''); return; }
    setNextName(next.name);
    setNextTime(next.time);
    setAfterNext(events.afterNext?.name || null);
    setAfterTime(events.afterNext?.time || '');
    const diff = Math.max(0, next.date - clock);
    setCountdown(`${Math.floor(diff / 3600000)}:${String(Math.floor(diff / 60000) % 60).padStart(2, '0')}:${String(Math.floor(diff / 1000) % 60).padStart(2, '0')}`);
    setProgress(events.progress);
  }, [days, clock]);

  return (
    <ScreenWrapper swipeHandlers={swipe}>
      {alarmWindow && (
        <GlassView radius={RADIUS.md} style={styles.alarmBanner}>
          <Text style={styles.alarmText}>⏰ {t('alarm_active')}</Text>
          <TouchableOpacity style={styles.awakeBtn}
            onPress={async () => { await updateSchedule(markAwake); setAlarmWindow(false); }}>
            <Text style={styles.awakeText}>{t('im_awake')}</Text>
          </TouchableOpacity>
        </GlassView>
      )}
      <View style={styles.header}>
        <SectionTitle>{t('prayer_title')}</SectionTitle>
        <TouchableOpacity onPress={() => setSettingsOpen(true)} style={styles.gear}>
          <Icon name="settings" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Две даты рядом: григорианская привычна, по хиджре живёт всё
          остальное в приложении — посты, месяцы, праздники. Держать в голове
          перевод между ними неудобно, поэтому обе на виду. Нажатие открывает
          календарь, где они сведены помесячно. */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
          <GlassView style={styles.locChip} radius={RADIUS.pill} intensity={28}>
            <Text style={styles.locText}>  {coords?.label || t('change_location')}  </Text>
          </GlassView>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCalendarOpen(true)} activeOpacity={0.8}
          style={styles.dateBlock}>
          <Text style={styles.dateGreg}>{formatGregorian(today, lang)}</Text>
          <Text style={styles.dateHijri}>{formatHijri(today, hijriOffset, lang)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {loading && <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />}
        {error && (
          <Card style={{ borderColor: COLORS.danger }}>
            <Text style={{ color: COLORS.text }}>{error}</Text>
          </Card>
        )}

        {timings && !loading && (
          <>
            {/* Кольцо показывает, сколько прошло от предыдущего намаза
                до следующего: цифра обратного отсчёта этого не передаёт.

                Расписание намеренно лежит прямо на обоях, без стеклянных
                плиток. Плитка под каждой строкой закрывала ровно ту часть
                картинки, ради которой обои и выбирают, а читаемость держат
                тень под текстом и тонкие разделители — их хватает. */}
            <View style={styles.nextCard}>
              <ProgressRing size={216} stroke={9} progress={progress} color={accent}>
                {/* Луна за цифрами: дуга кольца отмеряет промежуток между
                    намазами, а диск внутри — лунный месяц. Два разных счёта
                    времени в одном месте, и ни один не мешает другому. */}
                <MoonPhase size={168} color={accent} date={today} />
                <Text style={styles.nextLabel}>{t("next_prayer")}</Text>
                <Text style={styles.nextName}>{nextName ? prayerName(nextName, lang) : ""}</Text>
                <Text style={styles.countdown}>{countdown}</Text>
                {!!nextName && (
                  <Text style={styles.nextAt}>{nextTime}</Text>
                )}
              </ProgressRing>
            </View>

            {/* Свёрнутое расписание показывает намаз ЧЕРЕЗ ОДИН, а не
                ближайший: ближайший уже стоит в кольце над ним, и повторять
                его во второй строке — тратить место на то же самое. */}
            <TouchableOpacity activeOpacity={0.85} onPress={toggleSchedule}>
              <View style={[styles.spoilerRow, scheduleOpen && styles.spoilerOpen]}>
                <Text style={styles.spoilerTitle}>{t('schedule')}</Text>
                <View style={styles.rowRight}>
                  {!scheduleOpen && !!afterNext && (
                    <>
                      <Text style={styles.spoilerLabel}>{prayerName(afterNext, lang)}</Text>
                      <Text style={styles.spoilerNext}>{afterTime}</Text>
                    </>
                  )}
                  <Icon name={scheduleOpen ? 'up' : 'down'}
                    size={18} color={COLORS.textMuted} style={{ marginLeft: 10 }} />
                </View>
              </View>
            </TouchableOpacity>

            {scheduleOpen && PRAYERS.map((p, i) => {
              const isNext = p === nextName;
              const isSunrise = p === "Sunrise";
              const r = reminders[p];
              return (
                // Для восхода экран напоминаний не открывается: «за 10 минут
                // до восхода» — не то напоминание, ради которого его показывают.
                <TouchableOpacity key={p} activeOpacity={isSunrise ? 1 : 0.85}
                  onPress={() => !isSunrise && setReminderPrayer(p)}>
                  <View style={[styles.row, i > 0 && styles.rowDivider]}>
                    <Text style={[styles.prayer, isNext && styles.prayerActive,
                      isSunrise && styles.sunrise]}>{prayerName(p, lang)}</Text>
                    <View style={styles.rowRight}>
                      {r?.enabled && !isSunrise && (
                        <Icon name="bell" size={14} color={COLORS.accentSoft}
                          style={{ marginRight: 8 }} />
                      )}
                      <Text style={[styles.time, isNext && styles.prayerActive]}>{timings[p]}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {!scheduleOpen && <GateEntry />}
      <LocationPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} onFajrAlarmChange={() => setRefresh(v => v + 1)}
        onOpenGarden={() => {
          setSettingsOpen(false);
          // iOS не показывает новое модальное окно, пока предыдущее ещё
          // закрывается, — без паузы сад молча не открывался бы.
          setTimeout(() => setGardenOpen(true), 450);
        }} />
      <PrayerReminderSheet prayer={reminderPrayer} onClose={() => setReminderPrayer(null)} />
      <CalendarSheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <GardenPrototypeScreen visible={gardenOpen} onClose={() => setGardenOpen(false)} />
    </ScreenWrapper>
  );
}

// Текст лежит прямо на обоях, поэтому ему нужна собственная опора: мягкая
// тень отделяет светлые буквы от светлых участков рисунка. Плитка делала
// это раньше — ценой того, что закрывала сам рисунок.
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.45)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: { padding: SPACING.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.md },
  locChip: { alignSelf: 'flex-start' },
  dateBlock: { alignItems: 'flex-end', paddingLeft: SPACING.sm },
  dateGreg: { ...TYPE.caption, color: COLORS.text, fontWeight: '600', ...SHADOW },
  dateHijri: { ...TYPE.caption, color: COLORS.accentSoft, marginTop: 1, ...SHADOW },
  locText: { ...TYPE.callout, color: COLORS.text, paddingVertical: SPACING.sm, fontWeight: '500' },

  nextCard: { alignItems: 'center', paddingVertical: SPACING.lg, marginBottom: SPACING.md },
  nextLabel: { ...TYPE.overline, color: COLORS.accentSoft, ...SHADOW },
  // Внутри кольца имя намаза набирается мельче: display на 36 пунктов
  // упирался в дугу и ломал вертикальный ритм.
  nextName: { ...TYPE.heading, color: COLORS.white, marginTop: SPACING.xs, ...SHADOW },
  countdown: { ...TYPE.title, ...TYPE.mono, color: COLORS.text,
    fontWeight: '400', letterSpacing: 0.5, marginTop: SPACING.xxs, ...SHADOW },
  nextAt: { ...TYPE.callout, ...TYPE.mono, color: COLORS.textMuted, marginTop: SPACING.xxs, ...SHADOW },

  spoilerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs },
  spoilerOpen: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.hairline },
  spoilerTitle: { ...TYPE.overline, color: COLORS.text, ...SHADOW },
  spoilerLabel: { ...TYPE.callout, color: COLORS.textMuted, marginRight: SPACING.sm, ...SHADOW },
  spoilerNext: { ...TYPE.subhead, ...TYPE.mono, color: COLORS.white, fontWeight: '700', ...SHADOW },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs },
  // Разделитель вместо плитки: строка отделена от соседней, но обои под ней
  // остаются целыми. Первой строке он не нужен — над ней уже заголовок.
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.hairline },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  prayer: { ...TYPE.subhead, color: COLORS.text, fontWeight: '400', ...SHADOW },
  time: { ...TYPE.subhead, ...TYPE.mono, color: COLORS.text, fontWeight: '400', ...SHADOW },
  prayerActive: { color: COLORS.white, fontWeight: '700' },
  // Восход приглушён: он в списке для ориентира, а не как время молитвы.
  sunrise: { color: COLORS.textMuted },
  hint: { ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md, ...SHADOW },


  alarmBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  alarmText: { ...TYPE.callout, color: COLORS.white, flex: 1 },
  awakeBtn: { backgroundColor: 'rgba(76,175,114,0.45)', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.success },
  awakeText: { ...TYPE.callout, color: COLORS.white, fontWeight: '800' },
});
