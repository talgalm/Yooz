import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApiFetch } from '../utils/adminApi';
import { decodeJwtPayload } from '../utils/jwt';

export type AdminRole = 'viewer' | 'admin' | 'super_admin' | 'customer';

interface Admin {
  email: string;
  role: AdminRole;
  name?: string;
}

interface AdminAuthContextType {
  token: string | null;
  admin: Admin | null;
  isAdminAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const VALID_ROLES: AdminRole[] = ['viewer', 'admin', 'super_admin', 'customer'];

function decodeToken(token: string): Admin | null {
  try {
    const payload = decodeJwtPayload<{ role: AdminRole; email: string; name?: string; exp?: number }>(token);
    if (!VALID_ROLES.includes(payload.role)) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { email: payload.email, role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}

function getSavedAdminAuth(): { token: string | null; admin: Admin | null } {
  const savedToken = localStorage.getItem('yooz_admin_token');
  if (!savedToken) {
    return { token: null, admin: null };
  }

  const savedAdmin = decodeToken(savedToken);
  if (!savedAdmin) {
    localStorage.removeItem('yooz_admin_token');
    return { token: null, admin: null };
  }

  return { token: savedToken, admin: savedAdmin };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getSavedAdminAuth().token);
  const [admin, setAdmin] = useState<Admin | null>(() => getSavedAdminAuth().admin);

  const login = async (email: string, password: string) => {
    const data = await adminApiFetch<{ token: string; admin: Admin }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('yooz_admin_token', data.token);
    setToken(data.token);
    setAdmin(data.admin);
  };

  const loginWithGoogle = async (googleToken: string) => {
    const data = await adminApiFetch<{ token: string; admin: Admin }>('/api/admin/login/google', {
      method: 'POST',
      body: JSON.stringify({ googleToken }),
    });
    localStorage.setItem('yooz_admin_token', data.token);
    setToken(data.token);
    setAdmin(data.admin);
  };

  const logout = () => {
    localStorage.removeItem('yooz_admin_token');
    setToken(null);
    setAdmin(null);
  };

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('yooz_admin_token');
      setToken(null);
      setAdmin(null);
    };
    window.addEventListener('yooz_admin_unauthorized', handler);
    return () => window.removeEventListener('yooz_admin_unauthorized', handler);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ token, admin, isAdminAuthenticated: !!token, login, loginWithGoogle, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export function useCanEditContent(): boolean {
  return useAdminAuth().admin?.role !== 'viewer';
}
