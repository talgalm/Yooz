export const texts = {
  en: {
    seconds: (s: number) => `${s}s`,
    minutes: (m: number) => `${m}m`,
    minutesAndSeconds: (m: number, s: number) => `${m}m ${s}s`,
  },
  he: {
    seconds: (s: number) => `${s} שניות`,
    minutes: (m: number) => `${m} דקות`,
    minutesAndSeconds: (m: number, s: number) => `${m}:${String(s).padStart(2, '0')} דקות`,
  },
};
