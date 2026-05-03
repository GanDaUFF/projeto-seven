import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('username', res.user?.username ?? username);
      localStorage.setItem('role', res.user?.role ?? 'user');
      setToken(res.token);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setToken(null);
  }, []);

  return { token, login, logout, loading, error };
}
