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
export function hapticError() {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
}

// Конец круга должен ощущаться отчётливо. Одиночный Heavy, пущенный вместе с
// лёгким касанием счёта, сливался с ним и не чувствовался, поэтому круг —
// это серия: тяжёлый удар, жёсткий и ещё один тяжёлый с паузами, на которых
// Taptic Engine успевает «отпустить». Паузы подобраны на слух пальцем:
// короче — удары склеиваются в один, длиннее — читаются как три отдельных.
const later = (ms, fn) => setTimeout(() => { try { fn(); } catch {} }, ms);
const impact = (style) => Haptics.impactAsync(style).catch(() => {});

export function hapticCircle() {
  impact(Haptics.ImpactFeedbackStyle.Heavy);
  later(120, () => impact(Haptics.ImpactFeedbackStyle.Rigid));
  later(250, () => impact(Haptics.ImpactFeedbackStyle.Heavy));
}
// Вся последовательность закончена: круг, а затем системный «успех» —
// длинный и узнаваемый, чтобы отличить конец всего от конца одного круга.
export function hapticComplete() {
  hapticCircle();
  later(520, () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); });
}
