import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './helpers';

const AppSettingsContext = createContext(null);

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Default per-prayer reminder config: minutes before (0 = at time), enabled.
function defaultReminders() {
  const r = {};
  PRAYERS.forEach((p) => { r[p] = { minutesBefore: 0, enabled: true }; });
  return r;
}

export function AppSettingsProvider({ children }) {
  const [adhanSound, setAdhanSound] = useState('alafasy');
  const [reminders, setReminders] = useState(defaultReminders());
  const [dailyGoal, setDailyGoal] = useState(5);
  const [calcMethod, setCalcMethod] = useState('mwl');
  const [apiSource, setApiSource] = useState('auto');
  const [timeSourceId, setTimeSourceId] = useState('mwl_intl');
  const [asrSchool, setAsrSchool] = useState('shafi');
  const [tune, setTune] = useState({ Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setAdhanSound(await loadJSON('adhanSound', 'alafasy'));
      setReminders(await loadJSON('prayerReminders', defaultReminders()));
      setDailyGoal(await loadJSON('dailyGoal', 5));
      setCalcMethod(await loadJSON('calcMethod', 'mwl'));
      setApiSource(await loadJSON('apiSource', 'auto'));
      setTimeSourceId(await loadJSON('timeSourceId', 'mwl_intl'));
      setAsrSchool(await loadJSON('asrSchool', 'shafi'));
      setTune(await loadJSON('prayerTune', { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 }));
      setReady(true);
    })();
  }, []);

  const chooseAdhan = async (id) => { setAdhanSound(id); await saveJSON('adhanSound', id); };
  const chooseCalcMethod = async (id) => { setCalcMethod(id); await saveJSON('calcMethod', id); };
  const chooseApiSource = async (id) => { setApiSource(id); await saveJSON('apiSource', id); };
  const chooseTimeSource = async (id) => { setTimeSourceId(id); await saveJSON('timeSourceId', id); };
  const chooseAsrSchool = async (id) => { setAsrSchool(id); await saveJSON('asrSchool', id); };
  const setTuneFor = async (prayer, minutes) => {
    const next = { ...tune, [prayer]: minutes };
    setTune(next); await saveJSON('prayerTune', next);
  };
  const setReminder = async (prayer, cfg) => {
    const next = { ...reminders, [prayer]: { ...reminders[prayer], ...cfg } };
    setReminders(next);
    await saveJSON('prayerReminders', next);
  };
  const chooseGoal = async (g) => { setDailyGoal(g); await saveJSON('dailyGoal', g); };

  if (!ready) return null;

  return (
    <AppSettingsContext.Provider
      value={{ adhanSound, chooseAdhan, reminders, setReminder, dailyGoal, chooseGoal,
        calcMethod, chooseCalcMethod, apiSource, chooseApiSource,
        timeSourceId, chooseTimeSource, asrSchool, chooseAsrSchool,
        tune, setTuneFor, PRAYERS }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
