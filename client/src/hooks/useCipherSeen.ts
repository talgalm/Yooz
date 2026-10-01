import { useCallback, useState } from 'react';

function readSeen(key: string): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function useCipherSeen(key: string): [number[], (indices: number[]) => void] {
  const [seen, setSeen] = useState<number[]>(() => readSeen(key));
  const markSeen = useCallback((indices: number[]) => {
    setSeen(indices);
    try {
      localStorage.setItem(key, JSON.stringify(indices));
    } catch {
      return;
    }
  }, [key]);
  return [seen, markSeen];
}
