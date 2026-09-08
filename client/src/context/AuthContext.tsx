import { createContext, useContext, useState, ReactNode } from 'react';
import { apiFetchWithRetry } from '../utils/api';
import { flushOfflineQueue } from '../utils/offlineQueue';
import { newParticipantSessionId, rememberActivityCode, rememberParticipantActivity } from '../utils/participantActivity';
import { deleteCollageDatabases } from '../components/stations/collageSplitStorage';
import { decodeJwtPayload, isStaleDailyResetToken } from '../utils/jwt';

type ConnectionType = 'single' | 'group';

interface Participant {
  name: string;
  activityCode: string;
  connectionType: ConnectionType;
  email?: string;
  phoneNumber?: string;
  group?: string;
  age?: number;
}

interface LoginData {
  activityCode: string;
  participantName?: string;
  email?: string;
  phoneNumber?: string;
  group?: string;
  groupToken?: string;
  age?: number;
}

interface AuthContextType {
  token: string | null;
  participant: Participant | null;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  establishSession: (token: string, activityCode?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeToken(token: string): Participant | null {
  try {
    const payload = decodeJwtPayload<{ participantName?: string; activityCode?: string; connectionType?: string; email?: string; phoneNumber?: string; group?: string; age?: number }>(token);
    // A token without an activity code can't address anything — treat it as no session.
    if (!payload.activityCode) return null;
    return {
      name: payload.participantName || '',
      activityCode: payload.activityCode,
      connectionType: payload.connectionType === 'group' ? 'group' : 'single',
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      group: payload.group,
      age: payload.age,
    };
  } catch {
    return null;
  }
}

// Cookie mirror of the participant token: survives environments where an
// in-app webview drops localStorage between opens. localStorage stays primary.
const TOKEN_COOKIE_MAX_AGE = 7 * 24 * 3600; // matches server JWT expiry

function readTokenCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )yooz_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function writeTokenCookie(token: string | null): void {
  document.cookie = token
    ? `yooz_token=${encodeURIComponent(token)}; max-age=${TOKEN_COOKIE_MAX_AGE}; path=/; SameSite=Lax`
    : 'yooz_token=; max-age=0; path=/; SameSite=Lax';
}

function readStoredToken(): string | null {
  const local = localStorage.getItem('yooz_token');
  const stored = local ?? readTokenCookie();
  if (!stored) return null;
  if (isStaleDailyResetToken(stored)) {
    localStorage.removeItem('yooz_token');
    writeTokenCookie(null);
    return null;
  }
  // Re-seed localStorage — api.ts reads the token from there directly.
  if (!local) localStorage.setItem('yooz_token', stored);
  return stored;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronous init from localStorage so ProtectedRoute works on first render (no redirect on refresh)
  const [token, setToken] = useState<string | null>(() => {
    const saved = readStoredToken();
    if (saved) {
      const decoded = decodeToken(saved);
      if (decoded) {
        rememberActivityCode(decoded.activityCode);
        return saved;
      }
      localStorage.removeItem('yooz_token');
      writeTokenCookie(null);
    }
    return null;
  });
  const [participant, setParticipant] = useState<Participant | null>(() => {
    const saved = readStoredToken();
    if (saved) return decodeToken(saved);
    return null;
  });

  const persistSession = (newToken: string, activityCode?: string) => {
    const decoded = decodeToken(newToken);
    if (!decoded) return;
    // A login always starts a fresh collage scope. The previous session's
    // photos/videos are unreachable under the new id, so drop the blobs too.
    newParticipantSessionId();
    deleteCollageDatabases();
    localStorage.setItem('yooz_token', newToken);
    writeTokenCookie(newToken);
    rememberActivityCode(activityCode || decoded.activityCode);
    setToken(newToken);
    setParticipant(decoded);
  };

  const login = async (data: LoginData) => {
    const res = await apiFetchWithRetry<{ token: string; participant: Participant }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Identifier for "is this the same user as before" — case-insensitive email,
    // falling back to phone or name. Used to decide whether to wipe local progress.
    const newUserId =
      data.email?.trim().toLowerCase()
      || data.phoneNumber?.trim()
      || data.participantName?.trim().toLowerCase()
      || '';
    const prevUserId = localStorage.getItem('yooz_last_user_id') || '';
    if (prevUserId && newUserId && prevUserId !== newUserId) {
      // Different user on this device — clear any leftover progress so they start from the top.
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (
          key?.startsWith('yooz_session_') ||
          key?.startsWith('yooz_game_progress_') ||
          key?.startsWith('puzzle_progress_') ||
          key?.startsWith('yooz_avatar_chat_') ||
          key?.startsWith('yooz_entering_text_')
        ) {
          sessionStorage.removeItem(key);
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        // yooz_session_* is mirrored to localStorage (see storySession.ts) so
        // the previous user's progress survives a sessionStorage wipe on
        // mobile. Has to be cleared here too or a different user opening the
        // same link continues from the old session.
        if (
          key?.startsWith('yooz_start_') ||
          key?.startsWith('yooz_session_')
        ) {
          localStorage.removeItem(key);
        }
      }
    }
    if (newUserId) localStorage.setItem('yooz_last_user_id', newUserId);
    persistSession(res.token, data.activityCode);
    void flushOfflineQueue();
  };

  const establishSession = (newToken: string, activityCode?: string) => {
    persistSession(newToken, activityCode);
    void flushOfflineQueue();
  };

  const logout = () => {
    rememberParticipantActivity(participant?.activityCode);
    localStorage.removeItem('yooz_token');
    writeTokenCookie(null);
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (
        key?.startsWith('yooz_session_') ||
        key?.startsWith('yooz_game_progress_') ||
        key?.startsWith('puzzle_progress_') ||
        key?.startsWith('yooz_avatar_chat_') ||
        key?.startsWith('yooz_entering_text_')
      ) {
        sessionStorage.removeItem(key);
      }
    }
    setToken(null);
    setParticipant(null);
  };

  return (
    <AuthContext.Provider value={{ token, participant, isAuthenticated: !!token, login, establishSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
