import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, TouchableOpacity, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassView from '../components/GlassView';
import { Card, SectionTitle, Subtitle } from '../components/ui';
import LocationPicker from '../components/LocationPicker';
import SettingsModal from '../components/SettingsModal';
import PrayerReminderSheet from '../components/PrayerReminderSheet';
import { COLORS, SPACING, RADIUS, FONTS } from '../constants/theme';
import { useAppearance } from '../utils/AppearanceContext';
import { getNextPrayer, saveJSON, loadJSON } from '../utils/helpers';
import { getPrayerTimes2, TIME_SOURCES } from '../utils/prayerSource';
import { useLang } from '../i18n/LanguageContext';
import { prayerName } from '../constants/prayerNames';
import { useTabSwipe } from '../utils/useTabSwipe';
import { useLocation } from '../utils/LocationContext';
import { useAppSettings } from '../utils/AppSettingsContext';
import { scheduleFajrAlarm, markAwake, isInAlarmWindow, getFajrAlarmSettings } from '../utils/fajrAlarm';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function PrayerTimesScreen() {
  const { t, lang } = useLang();
  const swipe = useTabSwipe('Prayer');
  const { flat: mono } = useAppearance();
  const { coords } = useLocation();
  const { reminders, timeSourceId, asrSchool } = useAppSettings();
  const [timings, setTimings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [nextName, setNextName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderPrayer, setReminderPrayer] = useState(null);
  const timer = useRef(null);

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

  async function load() {
    setLoading(true); setError(null); setTimings(null);
    try {
      const tt = await getPrayerTimes2({
        lat: coords.lat, lng: coords.lng, sourceId: timeSourceId, school: asrSchool,
      });
      setTimings(tt); saveJSON('lastTimings', tt);
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
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
        <GlassView style={styles.locChip} radius={RADIUS.pill} intensity={28}>
          <Text style={styles.locText}>  {coords?.label || t('change_location')}  </Text>
        </GlassView>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {loading && <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />}
        {error && (
          <Card style={{ borderColor: COLORS.danger }}>
            <Text style={{ color: COLORS.text }}>{error}</Text>
          </Card>
        )}

        {timings && !loading && (
          <>
            <Card azure style={styles.nextCard}>
              <Text style={styles.nextLabel}>{t('next_prayer')}</Text>
              <Text style={styles.nextName}>{nextName ? prayerName(nextName, lang) : ''}</Text>
              <Text style={[styles.countdown, mono && styles.countdownDot]}>{countdown}</Text>
            </Card>

            {PRAYERS.map((p) => {
              const isNext = p === nextName;
              const r = reminders[p];
              return (
                <TouchableOpacity key={p} activeOpacity={0.85} onPress={() => setReminderPrayer(p)}>
                  <GlassView intensity={isNext ? 45 : 22} radius={RADIUS.md}
                    style={styles.rowGlass} azure={isNext}>
                    <View style={styles.row}>
                      <Text style={[styles.prayer, isNext && styles.prayerActive]}>{prayerName(p, lang)}</Text>
                      <View style={styles.rowRight}>
                        {r?.enabled && (
                          <Ionicons name="notifications" size={14} color={COLORS.accentSoft}
                            style={{ marginRight: 8 }} />
                        )}
                        <Text style={[styles.time, mono && styles.timeDot, isNext && styles.prayerActive]}>{timings[p]}</Text>
                      </View>
                    </View>
                  </GlassView>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.hint}>{t('customize')} →</Text>
          </>
        )}
      </ScrollView>

      <LocationPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} onFajrAlarmChange={() => setTimings((x) => (x ? { ...x } : x))} />
      <PrayerReminderSheet prayer={reminderPrayer} onClose={() => setReminderPrayer(null)} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: { padding: 8 },
  locChip: { alignSelf: 'flex-start', marginBottom: SPACING.md },
  locText: { color: COLORS.text, fontSize: 14, paddingVertical: 8, fontWeight: '500' },
  nextCard: { alignItems: 'center', paddingVertical: SPACING.lg },
  nextLabel: { color: COLORS.accentSoft, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  nextName: { color: COLORS.white, fontSize: 36, fontWeight: '800', marginVertical: SPACING.xs },
  countdown: { color: COLORS.text, fontSize: 20, fontVariant: ['tabular-nums'] },
  countdownDot: { fontSize: 24, letterSpacing: 3, color: COLORS.white },
  timeDot: { letterSpacing: 2 },
  rowGlass: { marginBottom: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  prayer: { color: COLORS.text, fontSize: 18 },
  time: { color: COLORS.text, fontSize: 18, fontVariant: ['tabular-nums'] },
  prayerActive: { color: COLORS.white, fontWeight: '700' },
  hint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: SPACING.xs },
  alarmBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  alarmText: { color: COLORS.white, fontSize: 14, flex: 1 },
  awakeBtn: { backgroundColor: 'rgba(76,175,114,0.45)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#4caf72' },
  awakeText: { color: COLORS.white, fontWeight: '800' },
});
