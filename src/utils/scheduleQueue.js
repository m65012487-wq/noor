let tail = Promise.resolve();
export function updateSchedule(action) {
  const next = tail.catch(() => {}).then(action);
  tail = next;
  return next;
}
