export const texts = {
  en: {
    seconds: (s: number) => `${s}s`,
    minutes: (m: number) => `${m}m`,
    minutesAndSeconds: (m: number, s: number) => `${m}m ${s}s`,
  },
  he: {
    // Full unit words, matching the exported Excel reports.
    seconds: (s: number) => `${s} שניות`,
    minutes: (m: number) => `${m} דקות`,
    minutesAndSeconds: (m: number, s: number) => `${m}:${String(s).padStart(2, '0')} דקות`,
  },
};
