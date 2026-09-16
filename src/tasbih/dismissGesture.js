// Horizontal movement must clearly dominate vertical scrolling.
export function capturesDismiss({ dx, dy, numberActiveTouches }, direction = 'right') {
  if (numberActiveTouches !== 1) return false;
  return direction === 'down'
    ? dy > 18 && dy > Math.abs(dx) * 1.5
    : dx > 18 && dx > Math.abs(dy) * 1.5;
}
export function finishesDismiss({ dx, dy, vx, vy }, direction = 'right') {
  const distance = direction === 'down' ? dy : dx;
  const cross = direction === 'down' ? dx : dy;
  const velocity = direction === 'down' ? vy : vx;
  return distance > Math.abs(cross) * 1.5 && (distance > 90 || (distance > 36 && velocity > 0.7));
}
