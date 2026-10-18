interface Scored {
  totalScore: number;
}

export function rankGroups<T extends Scored>(groups: T[]): (T & { rank: number })[] {
  const sorted = [...groups].sort((a, b) => b.totalScore - a.totalScore);
  return sorted.map((group) => ({ ...group, rank: 1 + sorted.filter((other) => other.totalScore > group.totalScore).length }));
}

export function groupWinners<T extends Scored>(groups: T[]): T[] {
  const top = Math.max(0, ...groups.map((group) => group.totalScore));
  return top > 0 ? groups.filter((group) => group.totalScore === top) : [];
}

export const PODIUM_PLACES = 3;

export function podiumSteps<T extends Scored>(groups: T[]): (T & { rank: number })[][] {
  const steps: (T & { rank: number })[][] = [];
  for (const group of rankGroups(groups).filter((g) => g.totalScore > 0 && g.rank <= PODIUM_PLACES)) {
    const last = steps[steps.length - 1];
    if (last && last[0].totalScore === group.totalScore) last.push(group);
    else steps.push([group]);
  }
  return steps;
}
