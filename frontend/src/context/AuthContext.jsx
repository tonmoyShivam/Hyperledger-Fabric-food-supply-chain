import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

const STORAGE_TOKEN = 'token';
const STORAGE_USER = 'user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN));
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(STORAGE_TOKEN)));

  const persistSession = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem(STORAGE_TOKEN, nextToken);
    } else {
      localStorage.removeItem(STORAGE_TOKEN);
    }
    if (nextUser) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_USER);
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    persistSession(null, null);
  }, [persistSession]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await authApi.login(email, password);
      const nextToken = data.token || data.accessToken;
      const nextUser = data.user || {
        email: data.email || email,
        role: data.role,
        organization: data.organization || data.org || data.mspId,
        name: data.name,
      };
      persistSession(nextToken, nextUser);
      return nextUser;
    },
    [persistSession]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.me();
        if (!cancelled) {
          const nextUser = data.user || data;
          setUser(nextUser);
          localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
        }
      } catch {
        if (!cancelled) {
          persistSession(null, null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [token, persistSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role || null,
      organization: user?.organization || user?.org || user?.mspId || null,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      logout,
    }),
    [token, user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
