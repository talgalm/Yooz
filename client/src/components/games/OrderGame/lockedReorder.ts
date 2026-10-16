export function freeTarget(locked: boolean[], from: number, wanted: number): number {
  const last = locked.length - 1;
  const target = Math.max(0, Math.min(last, wanted));
  if (!locked[target]) return target;
  const away = target >= from ? 1 : -1;
  for (let step = 1; step <= last; step += 1) {
    for (const slot of [target + away * step, target - away * step]) {
      if (slot >= 0 && slot <= last && !locked[slot]) return slot;
    }
  }
  return from;
}

export function moveSkippingLocked<T>(items: T[], locked: boolean[], from: number, to: number): T[] {
  const free = items.map((_, slot) => slot).filter((slot) => !locked[slot]);
  const fromPos = free.indexOf(from);
  const toPos = free.indexOf(to);
  if (fromPos === -1 || toPos === -1 || fromPos === toPos) return items;
  const moving = free.map((slot) => items[slot]);
  const [moved] = moving.splice(fromPos, 1);
  moving.splice(toPos, 0, moved);
  const next = [...items];
  free.forEach((slot, k) => {
    next[slot] = moving[k];
  });
  return next;
}
