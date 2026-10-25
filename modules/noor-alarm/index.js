// Системный будильник iOS 26 (AlarmKit) для будильника на Фаджр.
// На других системах и в веб-сборке модуля нет — возвращается null, и
// будильник работает уведомлениями, как раньше.
import { requireOptionalNativeModule } from 'expo-modules-core';

const NoorAlarm = requireOptionalNativeModule('NoorAlarm');

export function alarmKitSupported() {
  try { return !!NoorAlarm?.isSupported(); } catch { return false; }
}

export default NoorAlarm;
