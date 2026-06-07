export interface BordaRankedItem {
  item: string;
  bordaScore: number;
  rank: number;
}

interface SurveyItemResult {
  itemIndex: number;
  metadata?: Record<string, unknown>;
}

interface SurveyReport {
  data?: { itemResults?: SurveyItemResult[] };
}

/** Rank position 1 (index 0) earns N points, last earns 1 point. */
export function computeBordaRanking(rankings: string[][], referenceItems: string[]): BordaRankedItem[] {
  const n = referenceItems.length;
  const scores = new Map<string, number>();
  for (const item of referenceItems) scores.set(item, 0);

  for (const ranking of rankings) {
    for (let i = 0; i < ranking.length; i++) {
      const item = ranking[i];
      const points = Math.max(1, n - i);
      scores.set(item, (scores.get(item) ?? 0) + points);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item, bordaScore], idx) => ({ item, bordaScore, rank: idx + 1 }));
}

function latestSurveyResult(report: SurveyReport, itemIndex: number): SurveyItemResult | null {
  const matches = (report.data?.itemResults ?? []).filter((ir) => {
    if (ir.itemIndex !== itemIndex) return false;
    const meta = ir.metadata;
    return meta?.orderSurvey === true && Array.isArray(meta.ranking);
  });
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

export function extractOrderSurveyVotes(
  reports: SurveyReport[],
  itemIndex: number,
): { rankings: string[][]; items: string[] | null } {
  const rankings: string[][] = [];
  let items: string[] | null = null;

  for (const report of reports) {
    const ir = latestSurveyResult(report, itemIndex);
    if (!ir?.metadata) continue;
    const ranking = ir.metadata.ranking;
    if (!Array.isArray(ranking) || !ranking.every((x) => typeof x === 'string')) continue;
    rankings.push(ranking as string[]);
    if (!items && Array.isArray(ir.metadata.items)) {
      items = ir.metadata.items as string[];
    }
  }

  return { rankings, items };
}

export function countOrderSurveyVotes(reports: SurveyReport[], itemIndex: number): number {
  return extractOrderSurveyVotes(reports, itemIndex).rankings.length;
}
