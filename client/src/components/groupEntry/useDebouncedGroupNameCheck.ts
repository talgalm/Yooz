import { useEffect, useState } from 'react';

type NameCheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function useDebouncedGroupNameCheck(activityCode: string, name: string, debounceMs = 400) {
  const [status, setStatus] = useState<NameCheckStatus>('idle');

  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setStatus(trimmed.length === 0 ? 'idle' : 'invalid');
      return;
    }
    if (trimmed.length > 50) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/activities/${encodeURIComponent(activityCode)}/groups/check-name?name=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) {
          setStatus('invalid');
          return;
        }
        const data = await res.json() as { available: boolean };
        setStatus(data.available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [activityCode, name, debounceMs]);

  return status;
}

export function extractInviteToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const joinMatch = trimmed.match(/\/join\/([^/?#]+)/i);
  if (joinMatch) return joinMatch[1];

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}
