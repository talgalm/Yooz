import { createContext, useContext, useState, ReactNode } from 'react';
import { apiFetchWithRetry } from '../utils/api';
import { flushOfflineQueue } from '../utils/offlineQueue';

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
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      name: payload.participantName,
      activityCode: payload.activityCode,
      connectionType: payload.connectionType || 'single',
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      group: payload.group,
      age: payload.age,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronous init from localStorage so ProtectedRoute works on first render (no redirect on refresh)
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('yooz_token');
    if (saved) {
      const decoded = decodeToken(saved);
      if (decoded) return saved;
      localStorage.removeItem('yooz_token');
    }
    return null;
  });
  const [participant, setParticipant] = useState<Participant | null>(() => {
    const saved = localStorage.getItem('yooz_token');
    if (saved) return decodeToken(saved);
    return null;
  });

  const persistSession = (newToken: string, activityCode?: string) => {
    const decoded = decodeToken(newToken);
    if (!decoded) return;
    localStorage.setItem('yooz_token', newToken);
    if (activityCode) sessionStorage.setItem('yooz_play_code', activityCode);
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
        if (key?.startsWith('yooz_start_')) {
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
    localStorage.removeItem('yooz_token');
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
