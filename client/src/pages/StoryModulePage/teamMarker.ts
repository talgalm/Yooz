const TEAM_COLORS = ['#e17055', '#d63031', '#e84393', '#2d3436', '#e67e22', '#795548'];

const lastNumber = (name: string) => name.match(/\d+/g)?.pop();

export function teamMarkerLabel(name: string): string {
  const number = lastNumber(name);
  if (number) return number.slice(-3);
  const words = name.trim().split(/\s+/);
  return Array.from(words[words.length - 1]).slice(0, 2).join('');
}

export function teamMarkerColor(name: string): string {
  const number = lastNumber(name);
  const key = number
    ? Number(number)
    : Array.from(name).reduce((h, c) => (h * 31 + (c.codePointAt(0) ?? 0)) % 1_000_003, 0);
  return TEAM_COLORS[key % TEAM_COLORS.length];
}
