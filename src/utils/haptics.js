import * as Haptics from 'expo-haptics';

export function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
export function hapticMedium() {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}
export function hapticHeavy() {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}
export function hapticSuccess() {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
}
