import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, ScrollView, TouchableOpacity, AppState, LayoutAnimation, Platform, UIManager } from 'react-native';
import Text from '../components/AppText';
import Icon from '../components/Icon';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import LocationPicker from '../components/LocationPicker';
import SettingsModal from '../components/SettingsModal';
import PrayerReminderSheet from '../components/PrayerReminderSheet';
import { COLORS, SPACING, RADIUS, TYPE } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { getNextPrayer, intervalProgress, saveJSON, loadJSON } from '../utils/helpers';
import ProgressRing from '../components/ProgressRing';
import { getPrayerTimes2, TIME_SOURCES, localTimesForDate } from '../utils/prayerSource';
import { schedulePrayerReminders } from '../utils/prayerNotifications';
import { publishPrayerDay } from '../utils/widgetBridge';
import { useLang } from '../i18n/LanguageContext';
import { prayerName } from '../constants/prayerNames';
import { useTabSwipe } from '../utils/useTabSwipe';
import MoonPhase from '../components/MoonPhase';
import CalendarSheet from '../components/CalendarSheet';
import { formatGregorian, formatHijri } from '../utils/hijri';
import { useLocation } from '../utils/LocationContext';
import { useAppSettings, notifSoundFile, adhanNotifSoundFile } from '../utils/AppSettingsContext';
import { scheduleFajrAlarm, markAwake, isInAlarmWindow, getFajrAlarmSettings } from '../utils/fajrAlarm';

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
  const { reminders, timeSourceId, asrSchool, notifSound, adhanNotifSound, hijriOffset } = useAppSettings();
  const today = new Date();
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
  const timer = useRef(null);
  // Намаз через один после ближайшего: список замкнут в круг, поэтому после
  // иши идёт фаджр следующих суток. Считается ниже nextName — выше он попадал
  // в мёртвую зону объявления и падал на первом же рендере.
  const afterNext = nextName
    ? PRAYERS[(PRAYERS.indexOf(nextName) + 1) % PRAYERS.length]
    : null;

  function toggleSchedule() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScheduleOpen((v) => !v);
  }

  const [alarmWindow, setAlarmWindow] = useState(false);

  useEffect(() => { if (coords) load(); }, [coords, timeSourceId, asrSchool]);

  // Smart Fajr alarm: (re)schedule when times arrive; opening the app inside
  // the window counts as waking up (auto-stops the chain) but keeps the banner
  // so the person sees what happened.
  useEffect(() => {
    (async () => {
      if (!timings) return;
      const parse = (str) => { // "HH:MM" today
        if (!str) return null;
        const [h, m] = String(str).split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0); return d;
      };
      const fajr = parse(timings.Fajr);
      const sunrise = parse(timings.Sunrise);
      await scheduleFajrAlarm(fajr, sunrise, {
        title: lang === 'ru' ? 'Фаджр! Пора вставать 🕌' : 'Fajr! Time to wake up 🕌',
        body: lang === 'ru'
          ? 'Открой приложение или нажми «Я проснулся» — будильник остановится.'
          : "Open the app or tap \"I'm awake\" to stop the alarm.",
      });
      setAlarmWindow(await isInAlarmWindow() && (await getFajrAlarmSettings()).enabled);
    })();
  }, [timings]);

  // App became active during the window -> treat as awake.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st === 'active' && await isInAlarmWindow()) {
        await markAwake();
        setAlarmWindow(await isInAlarmWindow() && (await getFajrAlarmSettings()).enabled);
      }
    });
    return () => sub.remove();
  }, []);


  // Напоминания о намазе. Планировщик работает на локальном расчёте, поэтому
  // расписание ставится на неделю вперёд и переживает отсутствие сети.
  // Пересобираем при смене места, настроек напоминаний, источника и языка:
  // тексты уведомлений уже лежат в очереди и сами не переведутся.
  useEffect(() => {
    if (!coords) return;
    schedulePrayerReminders({
      timesForDate: (date) => localTimesForDate({
        lat: coords.lat, lng: coords.lng, sourceId: timeSourceId, school: asrSchool, date,
      }),
      reminders,
      sound: notifSoundFile(notifSound),
      atTimeSound: adhanNotifSoundFile(adhanNotifSound),
      label: (p) => prayerName(p, lang),
      // Заголовок — имя намаза, тело — что происходит. Раньше в тело
      // попадали подписи кнопок настроек («В момент азана», «мин до»),
      // и уведомление читалось как обрывок фразы из другого места.
      body: (p, minutes) => {
        if (p === "Sunrise") return t("notif_sunrise");
        if (minutes === 0) return t("notif_now");
        return t("notif_in").replace("{n}", String(minutes));
      },
    });
  }, [coords, reminders, timeSourceId, asrSchool, lang, t, notifSound, adhanNotifSound]);
  async function load() {
    setLoading(true); setError(null); setTimings(null);
    try {
      const tt = await getPrayerTimes2({
        lat: coords.lat, lng: coords.lng, sourceId: timeSourceId, school: asrSchool,
      });
      setTimings(tt); saveJSON('lastTimings', tt);
      // Виджет читает готовый срез: считать времена второй раз на Swift
      // значило бы завести источник правды, который однажды разойдётся.
      publishPrayerDay({
        timings: tt,
        order: PRAYERS,
        label: (key) => prayerName(key, lang),
        city: coords?.label || "",
        nextKey: getNextPrayer(tt)?.name,
      });
    } catch (e) {
      const cached = await loadJSON('lastTimings');
      if (cached) { setTimings(cached); setError(t('offline_times')); }
      else setError(t('load_error'));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!timings) return;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const next = getNextPrayer(timings);
      if (!next) return;
      setNextName(next.name);
      const diff = next.date - new Date();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
      setProgress(intervalProgress(timings));
    }, 1000);
    return () => clearInterval(timer.current);
  }, [timings]);

  return (
    <ScreenWrapper swipeHandlers={swipe}>
      {alarmWindow && (
        <GlassView radius={RADIUS.md} style={styles.alarmBanner}>
          <Text style={styles.alarmText}>⏰ {t('alarm_active')}</Text>
          <TouchableOpacity style={styles.awakeBtn}
            onPress={async () => { await markAwake(); setAlarmWindow(false); }}>
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
                  <Text style={styles.nextAt}>{timings[nextName]}</Text>
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
                      <Text style={styles.spoilerNext}>{timings[afterNext]}</Text>
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

      <LocationPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} onFajrAlarmChange={() => setTimings((x) => (x ? { ...x } : x))} />
      <PrayerReminderSheet prayer={reminderPrayer} onClose={() => setReminderPrayer(null)} />
      <CalendarSheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
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
