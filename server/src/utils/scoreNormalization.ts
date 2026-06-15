// ─── Score normalization helpers ───
//
// Raw participant scores (`data.totalScore`) live on an arbitrary scale that
// depends on the games in the activity — they can range from 0 to a couple of
// thousand. That makes a fixed "pass at 70" rule meaningless. These helpers
// rescale every score to a 0-100 range relative to the maximum achievable score
// of the activity, so a configurable pass grade actually makes sense.

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

/**
 * Sum of the max possible score for a single report — the ceiling for the items
 * that report actually has results for.
 */
export function maxScoreForReport(report: ReportLike): number {
  return (report.data?.itemResults ?? []).reduce((sum, item) => sum + maxPossibleOf(item), 0);
}

/**
 * Activity-level ceiling: for each item index, the highest max-possible-score
 * observed across all reports, summed together. This is the "maximum score" an
 * activity can yield, and the denominator used to normalize every participant.
 */
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

/**
 * Rescale a raw score to 0-100 against a ceiling. When the ceiling is unknown
 * (no max-score data) the raw value is returned rounded so nothing breaks.
 */
export function normalizeScore(raw: number, ceiling: number): number {
  if (!ceiling || ceiling <= 0) return Math.round(raw);
  return Math.max(0, Math.min(100, Math.round((raw / ceiling) * 100)));
}

/**
 * Resolve the ceiling for an activity: prefer the true max-possible total, fall
 * back to the highest raw score observed (relative normalization) so the top
 * scorer maps to 100 even when items don't report a max.
 */
export function resolveCeiling(reports: ReportLike[], rawScores: number[]): number {
  const ceiling = maxPossibleTotal(reports);
  if (ceiling > 0) return ceiling;
  return rawScores.length > 0 ? Math.max(...rawScores) : 0;
}

/** Coerce any input into a valid 0-100 pass threshold, defaulting to 70. */
export function clampPassThreshold(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PASS_THRESHOLD;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Resolve an activity's stored pass threshold:
 *   - null  → no pass grade (pass/fail disabled)
 *   - undefined (never configured) → default 70
 *   - number → clamped 0-100
 */
export function resolvePassThreshold(stored: number | null | undefined): number | null {
  if (stored === null) return null;
  if (stored === undefined) return DEFAULT_PASS_THRESHOLD;
  return clampPassThreshold(stored);
}
