import { createContext, useContext, useState, ReactNode } from 'react';
import { apiFetch } from '../utils/api';

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
  age?: number;
}

interface AuthContextType {
  token: string | null;
  participant: Participant | null;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
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

  const login = async (data: LoginData) => {
    const res = await apiFetch<{ token: string; participant: Participant }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('yooz_token', res.token);
    if (data.activityCode) sessionStorage.setItem('yooz_play_code', data.activityCode);
    setToken(res.token);
    setParticipant(res.participant);
  };

  const logout = () => {
    localStorage.removeItem('yooz_token');
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('yooz_session_') || key?.startsWith('yooz_game_progress_') || key?.startsWith('puzzle_progress_')) {
        sessionStorage.removeItem(key);
      }
    }
    setToken(null);
    setParticipant(null);
  };

  return (
    <AuthContext.Provider value={{ token, participant, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
