import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, ScrollView, TouchableOpacity, AppState, LayoutAnimation, Platform, UIManager, Animated, useWindowDimensions } from 'react-native';
import Text from '../components/AppText';
import Icon from '../components/Icon';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import SlideToConfirm from '../components/SlideToConfirm';
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
import { publishPrayerDay, publishStreak } from '../utils/widgetBridge';
import { useLang } from '../i18n/LanguageContext';
import { prayerName } from '../constants/prayerNames';
import { useTabSwipe } from '../utils/useTabSwipe';
import MoonPhase from '../components/MoonPhase';
import CalendarSheet from '../components/CalendarSheet';
import PixelPal, { ENTRY_CLEARANCE, PAL_HEIGHT, PRESSED_HEIGHT, floorY } from '../tasbih/PixelPal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  // Намаз через один после ближайшего: список замкнут в круг, поэтому после
  // иши идёт фаджр следующих суток. Считается ниже nextName — выше он попадал
  // в мёртвую зону объявления и падал на первом же рендере.
  function toggleSchedule() {
    // Перед раскрытием — свежие замеры: баннер будильника или карточка ошибки
    // могли сдвинуть экран без onLayout самого списка.
    measureScroll();
    measureList();
    // Длительность в такт пружине кольца: иначе карточка сжималась быстрее
    // кольца, и оно на миг наезжало на строку «Расписание».
    LayoutAnimation.configureNext(LayoutAnimation.create(SCHEDULE_MS, 'easeInEaseOut', 'opacity'));
    setScheduleOpen((v) => !v);
  }

  // Раскрытое расписание опускается до самого ростка на таб-баре и
  // придавливает его: нижний край списка встаёт ровно на высоту
  // придавленного ростка над кромкой. Для этого прокрутка тянется на всю
  // высоту, список прижат к низу, а кольцо занимает то, что осталось сверху:
  // на высоком экране остаётся полным, на низком (SE, mini) сжимается.
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rowPad = winH < 760 ? 8 : 11;
  const pressLine = floorY(winH, insets.bottom) - PRESSED_HEIGHT;
  const scrollBox = useRef(null);
  const listBox = useRef(null);
  const [scrollBottom, setScrollBottom] = useState(null);
  const [listTop, setListTop] = useState(null);
  const [cardH, setCardH] = useState(0);
  const measureScroll = () => scrollBox.current?.measureInWindow((x, y, w, h) => {
    if (h) setScrollBottom(Math.round(y + h));
  });
  // Где стоит верх списка, пока расписание свёрнуто: отсюда край начинает ход.
  const measureList = () => {
    if (scheduleOpen) return;
    listBox.current?.measureInWindow((x, y) => setListTop(Math.round(y)));
  };
  const openPad = scrollBottom != null ? Math.max(0, scrollBottom - pressLine) : null;
  const press = pressTimings(listTop != null ? pressLine - listTop : null);

  // Кольцо вписывается в высоту, которая досталась карточке, но не крупнее
  // обычного и не мельче RING_MIN (дальше расписание прокручивается).
  const ringFit = scheduleOpen && cardH
    ? Math.max(RING_MIN, Math.min(1, (cardH - SPACING.sm * 2) / RING)) : 1;
  // В заметно сжатом кольце мелкие подписи не читаются — остаются название и отсчёт.
  const compactRing = ringFit < 0.85;
  const ringScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(ringScale, {
      toValue: ringFit, friction: 11, tension: 110,
      useNativeDriver: true, isInteraction: false,
    }).start();
  }, [ringFit, ringScale]);

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
        // Вместе с расписанием обновляем и ударный режим: так виджет получает
        // свежий снимок при каждом открытии приложения, а не только после чтения.
        publishStreak();
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
    <View style={styles.screen}>
      <ScreenWrapper swipeHandlers={swipe}>
        {alarmWindow && (
          <GlassView radius={RADIUS.lg} style={styles.alarmBanner}>
            <View style={styles.alarmHead}>
              <View style={styles.alarmIcon}>
                <Icon name="alarm" size={16} color={accent} />
              </View>
              <Text style={styles.alarmText}>{t('alarm_active')}</Text>
            </View>
            {/* Если запись не удалась, промис отклоняется — ползунок сам
                вернётся в начало, и подтверждение можно повторить. */}
            <SlideToConfirm label={t('slide_awake')} accessibilityLabel={t('im_awake')}
              accessibilityHint={t('im_awake_hint')}
              onConfirm={async () => { await updateSchedule(markAwake); setAlarmWindow(false); }} />
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

        {/* Нижний отступ свёрнутого расписания — под плавающий таб-бар и
            ростка над ним, как на остальных вкладках. У раскрытого — ровно до
            макушки придавленного ростка: туда ложится край списка. */}
        <View ref={scrollBox} onLayout={measureScroll} collapsable={false} style={styles.scrollBox}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollBody, {
          paddingBottom: scheduleOpen && openPad != null ? openPad : 120 + ENTRY_CLEARANCE,
        }]}>
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
              {/* Высота карточки меняется вместе с раскрытием (LayoutAnimation), а
                  кольцо сжимается трансформом — текст внутри не перестраивается.
                  Раскрытая карточка забирает всё место над списком (flexGrow),
                  но не больше свёрнутой: остаток уходит в строки расписания. */}
              <View onLayout={(e) => { if (scheduleOpen) setCardH(Math.round(e.nativeEvent.layout.height)); }}
                style={[styles.nextCard, scheduleOpen ? styles.nextCardOpen : styles.nextCardClosed]}>
                <Animated.View style={{ transform: [{ scale: ringScale }] }}>
                <ProgressRing size={RING} stroke={9} progress={progress} color={accent}>
                  {/* Луна за цифрами: дуга кольца отмеряет промежуток между
                      намазами, а диск внутри — лунный месяц. Два разных счёта
                      времени в одном месте, и ни один не мешает другому. */}
                  <MoonPhase size={168} color={accent} date={today} />
                  {/* Подпись короткая: «намаз» и так ясен по названию под ней, а
                      капитель с разрядкой на верхней хорде круга не помещалась. */}
                  {!compactRing && (
                    <Text style={styles.nextLabel} numberOfLines={1} adjustsFontSizeToFit
                      minimumFontScale={0.8}>{t("next_short")}</Text>
                  )}
                  <Text style={styles.nextName}>{nextName ? prayerName(nextName, lang) : ""}</Text>
                  <Text style={styles.countdown}>{countdown}</Text>
                  {!!nextName && !compactRing && (
                    <Text style={styles.nextAt}>{nextTime}</Text>
                  )}
                </ProgressRing>
                </Animated.View>
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

              {/* Список смонтирован всегда, а свёрнутый — нулевой высоты с обрезкой.
                  Тогда раскрытие — это рост его высоты, и LayoutAnimation ведёт
                  нижний край вниз, как шторку, до самого ростка; новые строки
                  просто проявлялись бы на месте. */}
              <View ref={listBox} onLayout={measureList}
                pointerEvents={scheduleOpen ? 'auto' : 'none'}
                accessibilityElementsHidden={!scheduleOpen}
                importantForAccessibility={scheduleOpen ? 'auto' : 'no-hide-descendants'}
                style={[styles.list, scheduleOpen ? styles.listOpen : styles.listClosed]}>
              {PRAYERS.map((p, i) => {
                const isNext = p === nextName;
                const isSunrise = p === "Sunrise";
                const r = reminders[p];
                return (
                  // Для восхода экран напоминаний не открывается: «за 10 минут
                  // до восхода» — не то напоминание, ради которого его показывают.
                  <TouchableOpacity key={p} activeOpacity={isSunrise ? 1 : 0.85} style={styles.rowWrap}
                    onPress={() => !isSunrise && setReminderPrayer(p)}>
                    <View style={[styles.row, styles.rowFill, { paddingVertical: rowPad }, i > 0 && styles.rowDivider]}>
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
                {/* Край шторки: им список и давит на ростка. */}
                <View pointerEvents="none" style={styles.listEdge} />
              </View>
            </>
          )}

        </ScrollView>
        </View>

        <LocationPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
        <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} onFajrAlarmChange={() => setRefresh(v => v + 1)} />
        <PrayerReminderSheet prayer={reminderPrayer} onClose={() => setReminderPrayer(null)} />
        <CalendarSheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
      </ScreenWrapper>
      {/* Вход в «Сад тасбиха» — пиксельный росток без подписей. При открытии
          приложения он выпрыгивает из-за таб-бара и гуляет по его кромке, поэтому
          живёт отдельным слоем поверх всего экрана, а не в прокрутке. Касаний
          слой не забирает. */}
      {/* Раскрытое расписание «придавливает» ростка: край списка доходит до
          макушки, и он сплющивается и щурится, а когда спойлер закрыт —
          пружинкой возвращает форму. */}
      <PixelPal squashed={scheduleOpen} pressDelay={press.delay} pressMs={press.pressMs}
        releaseMs={press.releaseMs} />
    </View>
  );
}

// Диаметр кольца в обычном виде и предел сжатия при раскрытом расписании.
const RING = 216;
const RING_MIN = 0.5;

// Раскрытие и сворачивание расписания.
const SCHEDULE_MS = 420;

// Когда край списка касается ростка. Край идёт по кривой easeInEaseOut —
// cubic-bezier(0.42, 0, 0.58, 1), её ход по высоте равен 3s² − 2s³. Ищем
// параметр s, при котором до конца хода (travel) остаётся высота, которую
// край продавливает (PAL_HEIGHT − PRESSED_HEIGHT), и переводим его во время.
const PRESS_DEPTH = PAL_HEIGHT - PRESSED_HEIGHT;
function bezierTime(progress) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const s = (lo + hi) / 2;
    if (3 * s * s - 2 * s * s * s < progress) lo = s; else hi = s;
  }
  const s = (lo + hi) / 2;
  return 3 * (1 - s) * (1 - s) * s * 0.42 + 3 * (1 - s) * s * s * 0.58 + s * s * s;
}
function pressTimings(travel) {
  // Пока ход не измерен — типичный для обычного телефона.
  const d = travel > PRESS_DEPTH ? travel : 240;
  const delay = Math.round(SCHEDULE_MS * bezierTime(1 - PRESS_DEPTH / d));
  return {
    delay,
    pressMs: Math.max(40, SCHEDULE_MS - delay),
    releaseMs: Math.max(60, Math.round(SCHEDULE_MS * bezierTime(PRESS_DEPTH / d))),
  };
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
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: { padding: SPACING.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.md },
  locChip: { alignSelf: 'flex-start' },
  dateBlock: { alignItems: 'flex-end', paddingLeft: SPACING.sm },
  dateGreg: { ...TYPE.caption, color: COLORS.text, fontWeight: '600', ...SHADOW },
  dateHijri: { ...TYPE.caption, color: COLORS.accentSoft, marginTop: 1, ...SHADOW },
  locText: { ...TYPE.callout, color: COLORS.text, paddingVertical: SPACING.sm, fontWeight: '500' },

  scrollBox: { flex: 1 },
  scrollBody: { flexGrow: 1 },
  nextCard: { alignItems: 'center', justifyContent: 'center' },
  nextCardClosed: { height: RING + SPACING.lg * 2, marginBottom: SPACING.md },
  // Вес 1000 против 1 у списка: свободное место достаётся карточке, пока она
  // не упрётся в свой максимум, и только остаток — строкам.
  nextCardOpen: { flexGrow: 1000, flexBasis: 0, marginBottom: SPACING.xs,
    minHeight: Math.round(RING * RING_MIN) + SPACING.sm * 2, maxHeight: RING + SPACING.lg * 2 },
  list: { overflow: 'hidden' },
  listClosed: { height: 0 },
  listOpen: { flexGrow: 1 },
  rowWrap: { flexGrow: 1 },
  rowFill: { flexGrow: 1 },
  listEdge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.32)' },
  nextLabel: { ...TYPE.overline, letterSpacing: 1.2, maxWidth: 130, textAlign: 'center',
    color: COLORS.accentSoft, ...SHADOW },
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


  alarmBanner: { padding: SPACING.md, gap: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  alarmHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  alarmIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceStrong },
  alarmText: { ...TYPE.callout, fontWeight: '600', color: COLORS.white, flex: 1 },
});
