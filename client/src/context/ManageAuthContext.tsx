import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { manageApiFetch } from '../utils/manageApi';
import { decodeJwtPayload } from '../utils/jwt';

export type ManageRole = 'owner' | 'pm' | 'member';

export interface ManageUser {
  _id: string;
  name: string;
  email: string;
  role: ManageRole;
  color: string;
  tracksTime: boolean;
  /** Owner handed out a generated password — /manage stays blocked until it is changed. */
  mustChangePassword?: boolean;
}

interface ManageAuthContextType {
  token: string | null;
  user: ManageUser | null;
  isManageAuthenticated: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Persist a fresh user payload (after a password change) without re-logging in. */
  updateUser: (user: ManageUser) => void;
}

const ManageAuthContext = createContext<ManageAuthContextType | null>(null);

const VALID_ROLES: ManageRole[] = ['owner', 'pm', 'member'];
const TOKEN_KEY = 'yz_manage_token';
const USER_KEY = 'yz_manage_user';

/** Only trusts a token that carries the manage realm claim and has not expired. */
function readSavedToken(): string | null {
  const saved = localStorage.getItem(TOKEN_KEY);
  if (!saved) return null;
  try {
    const p = decodeJwtPayload<{ role: ManageRole; realm?: string; exp?: number }>(saved);
    if (p.realm !== 'manage' || !VALID_ROLES.includes(p.role)) throw new Error('wrong realm');
    if (p.exp && p.exp * 1000 < Date.now()) throw new Error('expired');
    return saved;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function readSavedUser(): ManageUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ManageUser;
  } catch {
    return null;
  }
}

export function ManageAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readSavedToken());
  const [user, setUser] = useState<ManageUser | null>(() => (readSavedToken() ? readSavedUser() : null));

  const clear = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const data = await manageApiFetch<{ token: string; user: ManageUser }>('/api/manage/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const updateUser = (u: ManageUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  useEffect(() => {
    window.addEventListener('yz_manage_unauthorized', clear);
    return () => window.removeEventListener('yz_manage_unauthorized', clear);
  }, []);

  return (
    <ManageAuthContext.Provider
      value={{
        token,
        user,
        isManageAuthenticated: !!token,
        isOwner: user?.role === 'owner',
        login,
        logout: clear,
        updateUser,
      }}
    >
      {children}
    </ManageAuthContext.Provider>
  );
}

export function useManageAuth() {
  const ctx = useContext(ManageAuthContext);
  if (!ctx) throw new Error('useManageAuth must be used within ManageAuthProvider');
  return ctx;
}
