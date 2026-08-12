/**
 * TTS + media preloading shared by AvatarStation and AvatarQuizStation.
 *
 * Extracted verbatim from AvatarStation so both stations stay in sync — the
 * buffering and fallback behaviour here was tuned against real mobile
 * browsers (iOS silent mode, missing canplaythrough) and shouldn't diverge.
 */

export interface SpeechHandle {
  stop: () => void;
}

export function speakBrowser(
  text: string,
  voiceType: 'man' | 'woman',
  onEnd?: () => void
): SpeechHandle {
  const noop: SpeechHandle = { stop: () => {} };
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return noop;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    u.rate = voiceType === 'man' ? 0.92 : 1;
    u.pitch = voiceType === 'woman' ? 1.3 : 0.4;
    const voices = window.speechSynthesis.getVoices();
    const hebVoices = voices.filter((v) => v.lang === 'he-IL' || v.lang.startsWith('he'));
    if (hebVoices.length > 0) {
      const genderKey = voiceType === 'woman' ? 'female' : 'male';
      const gendered = hebVoices.find(
        (v) =>
          v.name.toLowerCase().includes(genderKey) ||
          (v as unknown as { gender?: string }).gender === genderKey
      );
      u.voice = gendered || hebVoices[0];
    }
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    window.speechSynthesis.speak(u);
    return {
      stop: () => {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
      },
    };
  } catch {
    onEnd?.();
    return noop;
  }
}

export interface PreparedSpeech {
  play: (onEnd: () => void) => void;
  stop: () => void;
  /**
   * Clip length in ms when it is known (the TTS audio path). Undefined for the
   * browser-speech fallback, which never reports a duration. Callers use it to
   * time the UI against the real audio instead of guessing from word count.
   */
  durationMs?: number;
}

export async function fetchWithNetworkRetry(
  url: string,
  options: RequestInit,
  retries = 4
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      if (!(err instanceof TypeError) || attempt >= retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** Pre-fetch and buffer TTS audio so playback can start with no network gap.
 *  Falls back to browser SpeechSynthesis when the TTS API is unavailable. */
export async function prepareSpeech(
  text: string,
  voiceType: 'man' | 'woman' = 'man'
): Promise<PreparedSpeech> {
  try {
    const res = await fetchWithNetworkRetry('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceType }),
    });
    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    await new Promise<void>((resolve, reject) => {
      const ok = () => { cleanup(); resolve(); };
      const err = () => { cleanup(); reject(new Error('audio load failed')); };
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', ok);
        audio.removeEventListener('error', err);
      };
      audio.addEventListener('canplaythrough', ok);
      audio.addEventListener('error', err);
      audio.load();
      // safety: some mobile browsers never fire canplaythrough
      window.setTimeout(() => { cleanup(); resolve(); }, 1500);
    });

    let stopped = false;
    const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration * 1000
      : undefined;
    return {
      durationMs,
      play: (onEnd) => {
        if (stopped) { onEnd(); return; }
        const finish = () => {
          try { URL.revokeObjectURL(audioUrl); } catch { /* noop */ }
          if (!stopped) onEnd();
        };
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(finish);
      },
      stop: () => {
        stopped = true;
        try { audio.pause(); } catch { /* noop */ }
        try { URL.revokeObjectURL(audioUrl); } catch { /* noop */ }
      },
    };
  } catch {
    let browserHandle: SpeechHandle | null = null;
    let stopped = false;
    return {
      play: (onEnd) => {
        if (stopped) { onEnd(); return; }
        browserHandle = speakBrowser(text, voiceType, onEnd);
      },
      stop: () => {
        stopped = true;
        browserHandle?.stop();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      },
    };
  }
}

/** Warm the browser cache for the video URL so `<video>` plays immediately
 *  when it mounts, instead of waiting on a fresh network fetch. */
export function preloadVideoUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.src = url;
      const done = () => {
        v.removeEventListener('canplaythrough', done);
        v.removeEventListener('loadeddata', done);
        v.removeEventListener('error', done);
        resolve();
      };
      v.addEventListener('canplaythrough', done);
      v.addEventListener('loadeddata', done);
      v.addEventListener('error', done);
      v.load();
      window.setTimeout(done, 1500);
    } catch {
      resolve();
    }
  });
}

/**
 * Strip Hebrew gendered slash-suffixes before speaking.
 *
 * Inclusive Hebrew writes "את/ה", "תענה/י", "מכיר/ה" — correct on screen, but
 * every TTS engine reads the slash out loud. Dropping the suffix leaves the
 * base word ("את", "תענה", "מכיר"), which is a real word and reads naturally.
 * Latin slashes are untouched, so URLs still survive.
 *
 * Display text keeps the slashes; only the spoken copy is rewritten.
 */
export function speechText(text: string): string {
  return text.replace(/\/[א-ת]{1,2}(?![א-ת])/g, '');
}

/** Unlock speechSynthesis on iOS — must run inside a user gesture. */
export function primeSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}
