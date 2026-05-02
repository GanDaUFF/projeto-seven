import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

type Status = 'PENDENTE' | 'PRODUCAO' | 'FEITO' | 'ENTREGUE';

type ClienteData = Awaited<ReturnType<typeof api.getPublicCliente>>;

const STATUS_CFG: Record<Status, { label: string; dot: string; badge: string }> = {
  PENDENTE: { label: 'Pendente', dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-300 border border-amber-400/25' },
  PRODUCAO: { label: 'Produção', dot: 'bg-blue-400',    badge: 'bg-blue-400/10 text-blue-300 border border-blue-400/25' },
  FEITO:    { label: 'Feito',    dot: 'bg-purple-400',  badge: 'bg-purple-400/10 text-purple-300 border border-purple-400/25' },
  ENTREGUE: { label: 'Entregue', dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/25' },
};

const FILE_ICONS: Record<string, string> = {
  pdf:'📄', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️',
  ai:'🎨', psd:'🎨', cdr:'🎨', svg:'🎨',
  mp4:'🎬', mov:'🎬', zip:'📦', rar:'📦',
};
function fileIcon(name: string) {
  return FILE_ICONS[name.split('.').pop()?.toLowerCase() ?? ''] ?? '📎';
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtDate(s: string) {
  const [d, m] = s.replace(',', '.').split('.');
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1] ?? m}`;
}
function fmtClient(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function PublicCliente() {
  const { token } = useParams<{ token: string }>();
  const [cliente, setCliente]   = useState<ClienteData | null>(null);
  const [error, setError]       = useState(false);
  const [lastRefresh, setLastRefresh] = useState('Atualizando...');

  const fetchPedido = useCallback(async () => {
    if (!token) { setError(true); return; }
    try {
      const data = await api.getPublicCliente(token);
      setCliente(data);
      document.title = `${fmtClient(data.cliente)} — Seven`;
      setLastRefresh('Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setError(true);
    }
  }, [token]);

  useEffect(() => {
    fetchPedido();
    const interval = setInterval(fetchPedido, 30000);
    return () => clearInterval(interval);
  }, [fetchPedido]);

  const arquivos = cliente
    ? cliente.arquivos.filter(a => !a.nome.startsWith('OS_') && a.nome !== 'Thumbs.db' && a.nome !== 'desktop.ini')
    : [];

  const total   = arquivos.length;
  const prontos = arquivos.filter(a => a.status === 'FEITO' || a.status === 'ENTREGUE').length;
  const pct     = total > 0 ? Math.round((prontos / total) * 100) : 0;

  const counts: Record<Status, number> = { PENDENTE: 0, PRODUCAO: 0, FEITO: 0, ENTREGUE: 0 };
  arquivos.forEach(a => { counts[a.status as Status]++; });

  const ORDER: Record<Status, number> = { PENDENTE: 0, PRODUCAO: 1, FEITO: 2, ENTREGUE: 3 };
  const sorted = [...arquivos].sort((a, b) => ORDER[a.status as Status] - ORDER[b.status as Status]);

  return (
    <div className="bg-[#0d0d12] text-gray-100 min-h-screen antialiased flex flex-col">

      {/* Loading */}
      {!cliente && !error && (
        <div className="flex flex-col items-center justify-center flex-1 min-h-screen gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando pedido...</p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 min-h-screen gap-4 text-center px-4">
          <div className="w-16 h-16 bg-red-900/30 border border-red-800/40 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <p className="text-gray-300 font-semibold">Link inválido ou expirado</p>
            <p className="text-gray-600 text-sm mt-1">Solicite um novo link ao atendente.</p>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {cliente && !error && (
        <>
          {/* Header */}
          <header className="bg-[#111118] border-b border-gray-800/80">
            <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white leading-tight">Seven Impressão</h1>
                  <p className="text-[11px] text-gray-500 leading-tight">Acompanhe seu pedido</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-live" />
                <span>{lastRefresh}</span>
              </div>
            </div>
          </header>

          {/* Main */}
          <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
            <div className="fade-in bg-gray-800/40 border border-gray-700/50 rounded-2xl overflow-hidden">

              {/* Card header */}
              <div className="px-6 py-5 border-b border-gray-700/50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Cliente</p>
                    <h2 className="text-xl font-bold text-white">{fmtClient(cliente.cliente)}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{fmtDate(cliente.data)}</p>
                  </div>
                  {cliente.pago ? (
                    <span className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                      Pago
                    </span>
                  ) : (
                    <span className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Pagamento pendente
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4 flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Progresso da produção</span>
                    <span className="font-semibold text-gray-400">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-700/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Status counts */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {(Object.entries(counts) as [Status, number][])
                    .filter(([, n]) => n > 0)
                    .map(([s, n]) => (
                      <span key={s} className={`flex items-center gap-1.5 text-[11px] font-semibold ${STATUS_CFG[s].badge} px-2.5 py-1 rounded-lg`}>
                        <span className={`w-2 h-2 rounded-full ${STATUS_CFG[s].dot}`} />
                        {STATUS_CFG[s].label}: {n}
                      </span>
                    ))
                  }
                </div>
              </div>

              {/* File list */}
              <div className="divide-y divide-gray-700/40">
                {sorted.length === 0
                  ? <p className="text-center text-gray-600 text-sm py-8">Nenhum arquivo encontrado</p>
                  : sorted.map(arq => {
                      const cfg = STATUS_CFG[arq.status as Status] ?? STATUS_CFG.PENDENTE;
                      return (
                        <div key={arq.nome} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-700/10 transition-colors">
                          <span className="text-lg flex-shrink-0">{fileIcon(arq.nome)}</span>
                          <p className="flex-1 text-sm text-gray-200 font-medium truncate">{arq.nome}</p>
                          <span className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold ${cfg.badge} px-2.5 py-1 rounded-lg`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })
                }
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-900/30 flex items-center justify-between">
                <p className="text-[11px] text-gray-600">Atualização automática a cada 30 segundos</p>
                <button onClick={fetchPedido}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  Atualizar agora
                </button>
              </div>

            </div>

            <p className="text-center text-[12px] text-gray-700 mt-6">
              Dúvidas? Entre em contato com a Seven Impressão.
            </p>
          </main>
        </>
      )}

    </div>
  );
}
