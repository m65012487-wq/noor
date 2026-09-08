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
  const [notifSound, setNotifSound] = useState('chime');
  const [adhanNotifSound, setAdhanNotifSound] = useState('birds');
  const [hijriOffset, setHijriOffset] = useState(-1);
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
      setNotifSound(await loadJSON('notifSound', 'chime'));
      setAdhanNotifSound(await loadJSON('adhanNotifSound', 'birds'));
      setHijriOffset(await loadJSON('hijriOffset', -1));
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
  const chooseNotifSound = async (id) => { setNotifSound(id); await saveJSON('notifSound', id); };
  const chooseAdhanNotifSound = async (id) => { setAdhanNotifSound(id); await saveJSON('adhanNotifSound', id); };
  // Табличная хиджра расходится с объявленной датой на день-другой:
  // месяц начинают по наблюдению молодого месяца, а не по арифметике.
  // По умолчанию −1: на 7 сентября 2026 ДУМ КБР объявил 25 раби аль-авваль,
  // а таблица даёт 26. Одна опорная точка — не закон, поэтому поправка
  // вынесена в настройки.
  const chooseHijriOffset = async (v) => { setHijriOffset(v); await saveJSON('hijriOffset', v); };
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
      value={{ adhanSound, chooseAdhan, notifSound, chooseNotifSound,
        adhanNotifSound, chooseAdhanNotifSound,
        hijriOffset, chooseHijriOffset,
        reminders, setReminder, dailyGoal, chooseGoal,
        calcMethod, chooseCalcMethod, apiSource, chooseApiSource,
        timeSourceId, chooseTimeSource, asrSchool, chooseAsrSchool,
        tune, setTuneFor, PRAYERS }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);

// Звуки уведомлений. Их два набора, и это не прихоть: до этого напоминание
// «за десять минут» и само наступление времени звучали одинаково, поэтому
// на слух они не различались — а это разные события.
//
// В уведомление iOS пускает только короткий файл из бандла, не длиннее
// тридцати секунд. Поэтому сам азан звучать в уведомлении не может: записи
// азанов лежат на сервере и идут минутами. Азан играет в приложении.

// Напоминание перед намазом: короткое и негромкое.
export const NOTIF_SOUNDS = [
  { id: 'default', label_en: 'System',  label_ru: 'Системный',   file: undefined },
  { id: 'chime',   label_en: 'Chime',   label_ru: 'Колокольчик', file: 'chime.wav' },
  { id: 'bell',    label_en: 'Bell',    label_ru: 'Колокол',     file: 'bell.wav' },
  { id: 'soft',    label_en: 'Soft',    label_ru: 'Тихий',       file: 'soft.wav' },
  { id: 'balafon', label_en: 'Balafon', label_ru: 'Балафон',     file: 'balafon.wav' },
];

// Наступление времени намаза: длиннее и заметнее, чем напоминание.
export const ADHAN_NOTIF_SOUNDS = [
  { id: 'birds',   label_en: 'Birdsong', label_ru: 'Птичья трель', file: 'birds.wav' },
  { id: 'dawn',    label_en: 'Dawn',     label_ru: 'Рассвет',      file: 'dawn.wav' },
  { id: 'bell',    label_en: 'Bell',     label_ru: 'Колокол',      file: 'bell.wav' },
  { id: 'balafon', label_en: 'Balafon',  label_ru: 'Балафон',      file: 'balafon.wav' },
  { id: 'default', label_en: 'System',   label_ru: 'Системный',    file: undefined },
];

// Файлы для прослушивания в настройках. Уведомление берёт звук по имени из
// бандла, а плееру нужен сам ресурс — отсюда вторая таблица.
export const SOUND_ASSETS = {
  chime: require('../../assets/sounds/chime.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  soft: require('../../assets/sounds/soft.wav'),
  balafon: require('../../assets/sounds/balafon.wav'),
  birds: require('../../assets/sounds/birds.wav'),
  dawn: require('../../assets/sounds/dawn.wav'),
};

export function notifSoundFile(id) {
  return NOTIF_SOUNDS.find((x) => x.id === id)?.file;
}

export function adhanNotifSoundFile(id) {
  return ADHAN_NOTIF_SOUNDS.find((x) => x.id === id)?.file;
}
