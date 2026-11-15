import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null });

  const refresh = useCallback(
    () =>
      api
        .get('/api/auth/me')
        .then((user) => setState({ loading: false, user }))
        .catch(() => setState({ loading: false, user: null })),
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const user = await api.post('/api/auth/login', { email, password });
    setState({ loading: false, user });
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setState({ loading: false, user: null });
    }
  };

  return (
    <AuthCtx.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function RequireRole({ role, children }) {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="animate-pulse-soft text-4xl">🎁</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'super' && user.role !== 'superadmin') return <Navigate to="/admin" replace />;
  if (role === 'business' && user.role === 'superadmin') return <Navigate to="/super" replace />;
  return children;
}
