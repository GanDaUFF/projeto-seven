import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AppConfig, AppConfigPatch } from '../types';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [form, setForm] = useState<AppConfigPatch>({});

  useEffect(() => {
    api.getConfig()
      .then(c => {
        setConfig(c);
        setForm({
          nomeGrafica: c.nomeGrafica,
          telefoneGrafica: c.telefoneGrafica,
          impressaoDir: c.impressaoDir,
          logoPath: c.logoPath,
          publicBaseUrl: c.publicBaseUrl,
        });
      })
      .catch(err => setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Erro ao carregar configurações.' }))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof AppConfigPatch>(key: K, value: AppConfigPatch[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus({ kind: 'loading' });
    try {
      const updated = await api.patchConfig(form);
      setConfig(updated);
      const msg = updated.warning ?? 'Configurações salvas com sucesso.';
      setStatus({ kind: 'success', message: msg });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#0d0d12] text-gray-100 min-h-screen antialiased">
      <header className="bg-[#111118] border-b border-gray-800/80 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Configurações</h1>
              <p className="text-[11px] text-gray-500 leading-tight tracking-wide">Dados da gráfica e pasta de impressão</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Carregando configurações...</p>
          </div>
        )}

        {!loading && config && (
          <form onSubmit={handleSubmit} className="bg-[#17171f] border border-gray-700/60 rounded-2xl p-6 shadow-2xl">

            {!config.impressaoDirConfigured && (
              <div className="mb-5 flex items-start gap-2 bg-amber-950/60 border border-amber-800/60 text-amber-200 text-sm px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>A pasta de impressão ainda não foi configurada. Funcionalidades de OS ficarão indisponíveis até que ela seja definida.</span>
              </div>
            )}

            {status.kind === 'success' && (
              <div className="mb-5 flex items-start gap-2 bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-sm px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                <span>{status.message}</span>
              </div>
            )}

            {status.kind === 'error' && (
              <div className="mb-5 flex items-start gap-2 bg-red-950/80 border border-red-800/60 text-red-300 text-sm px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{status.message}</span>
              </div>
            )}

            <Field label="Nome da gráfica" value={form.nomeGrafica ?? ''} onChange={v => update('nomeGrafica', v)} placeholder="ex: Gráfica Seven" />
            <Field label="Telefone / WhatsApp" value={form.telefoneGrafica ?? ''} onChange={v => update('telefoneGrafica', v)} placeholder="ex: (11) 99999-0000" />
            <Field
              label="Pasta de impressão"
              value={form.impressaoDir ?? ''}
              onChange={v => update('impressaoDir', v)}
              placeholder="ex: C:\\Users\\Empresa\\Desktop\\IMPRESSAO"
              hint="Cole o caminho absoluto. Após alterar, reinicie o servidor para o monitoramento atualizar."
            />
            <Field label="URL pública" value={form.publicBaseUrl ?? ''} onChange={v => update('publicBaseUrl', v)} placeholder="ex: https://seven.minhagrafica.com" />
            <Field label="Caminho da logo" value={form.logoPath ?? ''} onChange={v => update('logoPath', v)} placeholder="ex: C:\\caminho\\para\\logo.png" />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold
                           bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                           text-white transition-all shadow-lg shadow-blue-900/30
                           disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold
                           bg-gray-800/60 border border-gray-700/40 text-gray-300
                           hover:bg-gray-700/60 transition-all">
                Voltar
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, hint,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600
                   focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
      />
      {hint && <p className="mt-1 text-[11px] text-gray-600">{hint}</p>}
    </div>
  );
}
