/**
 * TTS + media preloading shared by AvatarStation and AvatarQuizStation.
 *
 * Extracted verbatim from AvatarStation so both stations stay in sync — the
 * buffering and fallback behaviour here was tuned against real mobile
 * browsers (iOS silent mode, missing canplaythrough) and shouldn't diverge.
 */

import { currentLang, currentLocale, langHeader } from '../../../utils/currentLang';

export interface SpeechHandle {
  stop: () => void;
}

/**
 * The last-resort voice, used when the TTS endpoint cannot be reached.
 *
 * It speaks in the participant's language: this used to be pinned to Hebrew,
 * so an English activity that fell back here either mispronounced every word
 * or, far more often, said nothing at all - the browser has no voice for a
 * language it was not asked for, and `speak()` on a voiceless language is
 * silent without raising anything.
 */
export function speakBrowser(
  text: string,
  voiceType: 'man' | 'woman',
  onEnd?: () => void,
  lang: string = currentLang()
): SpeechHandle {
  const noop: SpeechHandle = { stop: () => {} };
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return noop;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = currentLocale(lang);
    u.rate = voiceType === 'man' ? 0.92 : 1;
    u.pitch = voiceType === 'woman' ? 1.3 : 0.4;
    const voices = window.speechSynthesis.getVoices();
    const matching = voices.filter((v) => v.lang === u.lang || v.lang.startsWith(lang));
    if (matching.length > 0) {
      const genderKey = voiceType === 'woman' ? 'female' : 'male';
      const gendered = matching.find(
        (v) =>
          v.name.toLowerCase().includes(genderKey) ||
          (v as unknown as { gender?: string }).gender === genderKey
      );
      u.voice = gendered || matching[0];
    } else if (voices.length > 0) {
      // Nothing installed for this language: say so, because the symptom is
      // pure silence and there is no other way to tell it from a working clip.
      console.warn(`[speech] no ${u.lang} voice in this browser - the fallback will be silent`);
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

/**
 * The participant's own session, when there is one.
 *
 * These endpoints are public - they have to be, the avatar starts talking
 * before anything is submitted - but the token identifies who is asking, and
 * the server spends its per-participant allowance rather than lumping a whole
 * venue behind one shared address into a single quota.
 */
function authHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem('yooz_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchWithNetworkRetry(
  url: string,
  options: RequestInit,
  retries = 4
): Promise<Response> {
  let lastError: unknown;
  const withLang = {
    ...options,
    headers: { ...langHeader(), ...authHeader(), ...(options.headers || {}) },
  };
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(url, withLang);
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
  } catch (err) {
    // The fallback below is often inaudible - most desktops carry no Hebrew
    // voice - so a refused or failed clip must leave a trace. Without this the
    // station just goes quiet and looks like a broken voice setting.
    console.warn('[speech] TTS unavailable, falling back to the browser voice:', err);
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
 * Rewrite Hebrew gendered slash-forms into neutral ones before speaking.
 *
 * Inclusive Hebrew writes "את/ה", "תענה/י", "מכיר/ה" — fine on screen, but a
 * TTS engine reads the slash out loud. Simply dropping the suffix isn't
 * neutral either: "את/ה" would become "את", which is feminine singular.
 *
 * Hebrew has no true neuter, so the plural form is the usual stand-in — it
 * reads naturally and commits to no gender. Anything not in the table falls
 * back to the base word, which at least never pronounces the slash.
 *
 * Latin slashes are untouched, so URLs survive. Display text keeps its
 * slashes; only the spoken copy is rewritten.
 */
const NEUTRAL_SPEECH_FORMS: Record<string, string> = {
  'את/ה': 'אתם',
  'בוא/י': 'בואו',
  'תענה/י': 'תענו',
  'ענה/י': 'ענו',
  'תוכל/י': 'תוכלו',
  'כתוב/י': 'כתבו',
  'שים/י': 'שימו',
  'קח/י': 'קחו',
  'בדוק/י': 'בדקו',
  'תבחר/י': 'תבחרו',
  'זכור/י': 'זכרו',
  'שאל/י': 'שאלו',
  'נסה/י': 'נסו',
  'מכיר/ה': 'מכירים',
  'יודע/ת': 'יודעים',
  'יכול/ה': 'יכולים',
  'צריך/ה': 'צריכים',
  'רוצה/ה': 'רוצים',
  'מדריך/ה': 'מדריכים',
  'עובד/ת': 'עובדים',
  'בטוח/ה': 'בטוחים',
};

export function speechText(text: string): string {
  let out = text;
  for (const [gendered, neutral] of Object.entries(NEUTRAL_SPEECH_FORMS)) {
    out = out.split(gendered).join(neutral);
  }
  // Anything the table missed: drop the slash suffix so it is never spoken.
  return out.replace(/\/[א-ת]{1,2}(?![א-ת])/g, '');
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
