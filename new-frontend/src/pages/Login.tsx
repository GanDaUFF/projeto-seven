import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  if (localStorage.getItem('token')) {
    navigate('/', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    const ok = await login(username, password);
    if (ok) navigate('/', { replace: true });
  }

  return (
    <div className="bg-[#0d0d12] text-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm fade-in">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Gestão de OS</h1>
          <p className="text-sm text-gray-500 mt-1">Impressão &amp; Gráfica</p>
        </div>

        {/* Card */}
        <div className="bg-[#17171f] border border-gray-700/60 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-5">Entrar no sistema</h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-950/80 border border-red-800/60 text-red-300 text-sm px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                placeholder="Digite seu usuário"
                className="w-full bg-gray-800/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                className="w-full bg-gray-800/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold
                         bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                         text-white transition-all shadow-lg shadow-blue-900/30
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
