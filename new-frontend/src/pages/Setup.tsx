import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Setup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function validate(): string | null {
    if (username.trim().length < 3) return 'Usuário deve ter pelo menos 3 caracteres.';
    if (password.length < 6) return 'Senha deve ter pelo menos 6 caracteres.';
    if (password !== confirmPassword) return 'As senhas não conferem.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);
    setError(null);
    try {
      await api.postSetupAdmin(username.trim(), password, confirmPassword);
      navigate('/login', { replace: true, state: { setupSuccess: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar administrador.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#0d0d12] text-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm fade-in">

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Configuração inicial do Seven</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">Crie o primeiro administrador do sistema</p>
        </div>

        <div className="bg-[#17171f] border border-gray-700/60 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-1">Novo administrador</h2>
          <p className="text-xs text-gray-500 mb-5">Esta etapa só aparece uma vez.</p>

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
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Usuário administrador</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                placeholder="ex: admin"
                className="w-full bg-gray-800/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-gray-800/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Repita a senha"
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
              {loading ? 'Criando…' : 'Criar administrador'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
