
export const DEFAULT_PASS_THRESHOLD = 70;

interface ItemResultLike {
  itemIndex?: number;
  maxPossibleScore?: number;
}

interface ReportLike {
  data?: { itemResults?: ItemResultLike[] | null } | null;
}

function maxPossibleOf(item: ItemResultLike): number {
  return typeof item.maxPossibleScore === 'number' && item.maxPossibleScore > 0
    ? item.maxPossibleScore
    : 0;
}

export function maxScoreForReport(report: ReportLike): number {
  return (report.data?.itemResults ?? []).reduce((sum, item) => sum + maxPossibleOf(item), 0);
}

export function maxPossibleTotal(reports: ReportLike[]): number {
  const perItemMax = new Map<number, number>();
  for (const report of reports) {
    for (const item of report.data?.itemResults ?? []) {
      const idx = item.itemIndex ?? 0;
      const max = maxPossibleOf(item);
      if (max > (perItemMax.get(idx) ?? 0)) perItemMax.set(idx, max);
    }
  }
  let total = 0;
  for (const value of perItemMax.values()) total += value;
  return total;
}

export function normalizeScore(raw: number, ceiling: number): number {
  if (!ceiling || ceiling <= 0) return Math.round(raw);
  return Math.max(0, Math.min(100, Math.round((raw / ceiling) * 100)));
}

export function resolveCeiling(reports: ReportLike[], rawScores: number[]): number {
  const ceiling = maxPossibleTotal(reports);
  if (ceiling > 0) return ceiling;
  return rawScores.length > 0 ? Math.max(...rawScores) : 0;
}

export function clampPassThreshold(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PASS_THRESHOLD;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function resolvePassThreshold(stored: number | null | undefined): number | null {
  if (stored === null) return null;
  if (stored === undefined) return DEFAULT_PASS_THRESHOLD;
  return clampPassThreshold(stored);
}
