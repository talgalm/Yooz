import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { managerApiFetch } from '../utils/managerApi';

interface Manager {
  email: string;
  activityCode: string;
  activityName: string;
}

interface ManagerAuthContextType {
  token: string | null;
  manager: Manager | null;
  isManagerAuthenticated: boolean;
  login: (activityCode: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const ManagerAuthContext = createContext<ManagerAuthContextType | null>(null);

function decodeToken(token: string): Manager | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role !== 'manager') return null;
    return {
      email: payload.email,
      activityCode: payload.activityCode,
      activityName: '', // will be set from login response
    };
  } catch {
    return null;
  }
}

export function ManagerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [manager, setManager] = useState<Manager | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('yooz_manager_token');
    if (saved) {
      const decoded = decodeToken(saved);
      if (decoded) {
        // Restore activity name from localStorage
        const savedName = localStorage.getItem('yooz_manager_activity_name');
        if (savedName) decoded.activityName = savedName;
        setToken(saved);
        setManager(decoded);
      } else {
        localStorage.removeItem('yooz_manager_token');
        localStorage.removeItem('yooz_manager_activity_name');
      }
    }
  }, []);

  const login = async (activityCode: string, email: string, password: string) => {
    const data = await managerApiFetch<{ token: string; manager: Manager }>('/api/manager/login', {
      method: 'POST',
      body: JSON.stringify({ activityCode, email, password }),
    });
    localStorage.setItem('yooz_manager_token', data.token);
    localStorage.setItem('yooz_manager_activity_name', data.manager.activityName);
    setToken(data.token);
    setManager(data.manager);
  };

  const logout = () => {
    localStorage.removeItem('yooz_manager_token');
    localStorage.removeItem('yooz_manager_activity_name');
    setToken(null);
    setManager(null);
  };

  return (
    <ManagerAuthContext.Provider value={{ token, manager, isManagerAuthenticated: !!token, login, logout }}>
      {children}
    </ManagerAuthContext.Provider>
  );
}

export function useManagerAuth() {
  const ctx = useContext(ManagerAuthContext);
  if (!ctx) throw new Error('useManagerAuth must be used within ManagerAuthProvider');
  return ctx;
}
