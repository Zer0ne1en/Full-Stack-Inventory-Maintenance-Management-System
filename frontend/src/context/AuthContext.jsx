import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session, SESSION_EXPIRED_EVENT } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => session.user);
  const [status, setStatus] = useState(() => (session.token ? 'verifying' : 'anonymous'));
  const [sessionLost, setSessionLost] = useState(false);

  const applySession = useCallback((next) => {
    session.token = next.token;
    session.user = next.user;
    setUser(next.user);
    setStatus('authenticated');
    setSessionLost(false);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const result = await api.post('/auth/login', { email, password });
      applySession(result);
      return result.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    session.clear();
    setUser(null);
    setStatus('anonymous');
    setSessionLost(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!session.token) {
      setStatus('anonymous');
      return null;
    }
    try {
      const me = await api.get('/auth/me');
      session.user = me;
      setUser(me);
      setStatus('authenticated');
      setSessionLost(false);
      return me;
    } catch {
      session.clear();
      setUser(null);
      setStatus('anonymous');
      return null;
    }
  }, []);

  // Revalidate the stored token once on load so a stale token never lingers.
  useEffect(() => {
    if (status !== 'verifying') return;
    refresh();
  }, [status, refresh]);

  // If any request is told the token is dead, abandon the session immediately
  // rather than leaving the UI half-logged-in showing raw API errors.
  useEffect(() => {
    const onExpired = () => {
      session.clear();
      setUser(null);
      setStatus('anonymous');
      setSessionLost(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      sessionLost,
      login,
      logout,
      refresh,
      isAuthenticated: status === 'authenticated' && !!user,
      isAdmin: user?.role === 'ADMIN',
      isTechnician: user?.role === 'TECHNICIAN',
      canEdit: user?.role === 'ADMIN' || user?.role === 'TECHNICIAN',
    }),
    [user, status, sessionLost, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
