import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import FileModal from '../components/FileModal';
import type { OSData, OSCliente, ValidStatus, StatusCounts } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ValidStatus, { label: string; badge: string; dot: string; dotCls: string }> = {
  PENDENTE: { label: 'Pendente', badge: 'bg-amber-400/10 text-amber-300 border border-amber-400/25', dot: 'bg-amber-400',   dotCls: 'text-amber-400' },
  PRODUCAO: { label: 'Produção', badge: 'bg-blue-400/10 text-blue-300 border border-blue-400/25',   dot: 'bg-blue-400',    dotCls: 'text-blue-400' },
  FEITO:    { label: 'Feito',    badge: 'bg-purple-400/10 text-purple-300 border border-purple-400/25', dot: 'bg-purple-400', dotCls: 'text-purple-400' },
  ENTREGUE: { label: 'Entregue', badge: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/25', dot: 'bg-emerald-400', dotCls: 'text-emerald-400' },
};

const ACCENT_MAP: Record<ValidStatus, string> = {
  PENDENTE: 'border-amber-500/30',
  PRODUCAO: 'border-blue-500/30',
  FEITO:    'border-purple-500/30',
  ENTREGUE: 'border-emerald-500/30',
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtDate(s: string) {
  const [d, m] = s.replace(',', '.').split('.');
  return `${parseInt(d)} ${MESES[parseInt(m) - 1] ?? m}`;
}
function fmtClient(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function countStatuses(cliente: OSCliente): StatusCounts {
  const c: StatusCounts = { PENDENTE: 0, PRODUCAO: 0, FEITO: 0, ENTREGUE: 0 };
  cliente.arquivos.forEach(a => { c[a.status]++; });
  return c;
}
function countGlobal(data: OSData): StatusCounts {
  const c: StatusCounts = { PENDENTE: 0, PRODUCAO: 0, FEITO: 0, ENTREGUE: 0 };
  Object.values(data).forEach(clientes =>
    Object.values(clientes).forEach(cl => cl.arquivos.forEach(a => { c[a.status]++; }))
  );
  return c;
}

type FilterKey = 'ALL' | ValidStatus;

// ── Toast UI ─────────────────────────────────────────────────────────────────

const TOAST_COLORS = {
  success: 'bg-emerald-950/95 border-emerald-800/60 text-emerald-200',
  error:   'bg-red-950/95 border-red-800/60 text-red-200',
  info:    'bg-gray-800/95 border-gray-700/60 text-gray-200',
};
const TOAST_ICON_BG = { success: 'bg-emerald-500', error: 'bg-red-500', info: 'bg-gray-600' };
const TOAST_ICONS   = { success: '✓', error: '✕', info: 'i' };

// ── Main Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]           = useState<OSData>({});
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterKey>('ALL');
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState<{ date: string; clienteNome: string } | null>(null);
  const [tunnelUrl, setTunnelUrl] = useState<string | null | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [generatingOS, setGeneratingOS] = useState(false);
  const { toasts, showToast } = useToast();
  const navigate = useNavigate();
  const sseRef = useRef<EventSource | null>(null);

  const username = localStorage.getItem('username') ?? 'seven';

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    try {
      const res = await api.getOS();
      setData(res);
      if (!silent) setLastUpdated('Atualizado ' + new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      if (!silent) showToast('Erro ao carregar dados', 'error');
      else console.error('[fetch]', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  const fetchTunnel = useCallback(async () => {
    try {
      const res = await api.getTunnelUrl();
      setTunnelUrl(res.url ?? null);
    } catch {
      setTunnelUrl(null);
    }
  }, []);

  // ── SSE ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchData();
    fetchTunnel();

    function connect() {
      const sse = new EventSource('/api/events');
      sseRef.current = sse;
      sse.onopen    = () => setConnected(true);
      sse.onmessage = () => fetchData(true);
      sse.onerror   = () => {
        setConnected(false);
        sse.close();
        setTimeout(connect, 5000);
      };
    }
    connect();

    const t1 = setInterval(() => fetchData(true), 30000);
    const t2 = setInterval(fetchTunnel, 15000);
    return () => {
      sseRef.current?.close();
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [fetchData, fetchTunnel]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login', { replace: true });
  }

  function changeStatus(dateKey: string, clienteNome: string, arquivo: string, status: ValidStatus) {
    setData(prev => {
      if (!prev[dateKey]?.[clienteNome]) return prev;
      const arquivos = prev[dateKey][clienteNome].arquivos.map(a =>
        a.nome === arquivo ? { ...a, status } : a,
      );
      return {
        ...prev,
        [dateKey]: { ...prev[dateKey], [clienteNome]: { ...prev[dateKey][clienteNome], arquivos } },
      };
    });
    api.updateStatus(dateKey, clienteNome, arquivo, status)
      .then(() => showToast(`${arquivo} → ${STATUS_CFG[status].label}`, 'success'))
      .catch(() => showToast('Erro ao salvar status', 'error'));
  }

  function togglePagamento(dateKey: string, clienteNome: string) {
    const pago = data[dateKey]?.[clienteNome]?.pago ?? false;
    const novoPago = !pago;
    setData(prev => {
      if (!prev[dateKey]?.[clienteNome]) return prev;
      return {
        ...prev,
        [dateKey]: { ...prev[dateKey], [clienteNome]: { ...prev[dateKey][clienteNome], pago: novoPago } },
      };
    });
    api.updatePagamento(dateKey, clienteNome, novoPago)
      .then(() => showToast(novoPago ? `${fmtClient(clienteNome)} marcado como pago` : `${fmtClient(clienteNome)} desmarcado`, novoPago ? 'success' : 'info'))
      .catch(() => showToast('Erro ao atualizar pagamento', 'error'));
  }

  async function gerarOS(dateKey: string, clienteNome: string) {
    setGeneratingOS(true);
    try {
      const res = await api.generateOS(dateKey, clienteNome);
      showToast(`O.S gerada: ${res.fileName}`, 'success');
      await fetchData(true);
    } catch (err) {
      showToast('Erro ao gerar O.S: ' + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      setGeneratingOS(false);
    }
  }

  async function compartilhar(e: React.MouseEvent, dateKey: string, clienteNome: string) {
    e.stopPropagation();
    const btn  = e.currentTarget as HTMLButtonElement;
    const span = btn.querySelector('span');
    if (span) span.textContent = 'Gerando…';
    btn.disabled = true;
    try {
      const res  = await api.getToken(dateKey, clienteNome);
      const base = tunnelUrl ?? window.location.origin;
      const link = `${base}/cliente/${res.token}`;
      copyToClipboard(link);
    } catch (err) {
      showToast('Erro ao gerar link: ' + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      if (span) span.textContent = 'Compartilhar';
      btn.disabled = false;
    }
  }

  function copyToClipboard(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Link copiado!', 'success'))
        .catch(() => copyFallback(text));
    } else {
      copyFallback(text);
    }
  }

  function copyFallback(text: string) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Link copiado!', 'success');
    } catch {
      showToast('Link: ' + text, 'info');
    }
    document.body.removeChild(ta);
  }

  // ── Filtered data ────────────────────────────────────────────────────────────

  const dates = Object.keys(data);
  const globalCounts = countGlobal(data);

  const filteredDates = dates.filter(dateKey => {
    const clientes = Object.values(data[dateKey]);
    return clientes.some(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'ALL' || c.arquivos.some(a => a.status === filter))
    );
  });

  const modalCliente = modal ? data[modal.date]?.[modal.clienteNome] : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#0d0d12] text-gray-100 min-h-screen antialiased">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`${t.exiting ? 'toast-out' : 'toast-in'} pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border
                      text-sm font-medium backdrop-blur-md shadow-2xl max-w-xs ${TOAST_COLORS[t.type]}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${TOAST_ICON_BG[t.type]} text-white`}>
              {TOAST_ICONS[t.type]}
            </span>
            <span className="truncate">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-[#111118] border-b border-gray-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Gestão de OS</h1>
              <p className="text-[11px] text-gray-500 leading-tight tracking-wide">Impressão &amp; Gráfica</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {(['PENDENTE','PRODUCAO','FEITO','ENTREGUE'] as ValidStatus[]).map(s => (
              <div key={s} className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_CFG[s].dot}`} />
                <span className="text-[11px] text-gray-400 font-medium">{STATUS_CFG[s].label}</span>
                <span className={`text-sm font-bold ${STATUS_CFG[s].dotCls} min-w-[16px] text-right`}>{globalCounts[s]}</span>
              </div>
            ))}

            {/* Tunnel indicator */}
            {tunnelUrl !== undefined && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border text-[11px] font-semibold
                ${tunnelUrl ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : 'bg-gray-800/60 border-gray-700/40 text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tunnelUrl ? 'bg-emerald-400 dot-live' : 'bg-gray-600'}`} />
                <span>{tunnelUrl ? 'Túnel ativo' : 'Local'}</span>
              </div>
            )}

            {/* Connection dot */}
            <div title={connected ? 'Conectado — tempo real' : 'Reconectando...'}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 cursor-default ml-1
                ${connected ? 'bg-emerald-400 shadow shadow-emerald-500/50' : 'bg-gray-600'}`} />

            {/* Username */}
            <div className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-1.5">
              <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <span className="text-xs text-gray-300 font-medium">{username}</span>
            </div>

            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border
                         bg-gray-800/60 border-gray-700/40 text-gray-400
                         hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tunnel banner */}
      {tunnelUrl && (
        <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-b border-emerald-800/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 dot-live flex-shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Acesso externo ativo</span>
              <span className="text-gray-600 text-[11px]">·</span>
              <span className="text-[11px] text-gray-400">Compartilhe este link:</span>
              <a href={tunnelUrl} target="_blank" rel="noreferrer"
                className="text-[12px] font-bold text-emerald-300 hover:text-white underline underline-offset-2 transition-colors truncate max-w-[280px] sm:max-w-none">
                {tunnelUrl}
              </a>
            </div>
            <button onClick={() => tunnelUrl && copyToClipboard(tunnelUrl)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold
                         bg-emerald-500/20 text-emerald-300 border border-emerald-500/30
                         hover:bg-emerald-500/30 hover:text-white transition-all flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              Copiar link
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-[#111118]/80 border-b border-gray-800/60 sticky top-[73px] z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full bg-gray-800/70 border border-gray-700/50 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-100 placeholder-gray-600
                         focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          <div className="flex gap-1.5">
            {(['ALL', 'PENDENTE', 'PRODUCAO', 'ENTREGUE'] as const).map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${filter === f ? 'bg-gray-700 text-white shadow-sm' : ''}
                  ${f === 'ALL'      ? 'text-gray-300 hover:bg-gray-700/60' : ''}
                  ${f === 'PENDENTE' ? 'text-amber-400  hover:bg-amber-400/10'  : ''}
                  ${f === 'PRODUCAO' ? 'text-blue-400   hover:bg-blue-400/10'   : ''}
                  ${f === 'ENTREGUE' ? 'text-emerald-400 hover:bg-emerald-400/10' : ''}
                `}
              >
                {f === 'ALL' ? 'Todos' : STATUS_CFG[f].label}
              </button>
            ))}
          </div>

          {lastUpdated && (
            <span className="text-[11px] text-gray-600 ml-auto hidden sm:block">{lastUpdated}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Carregando ordens de serviço...</p>
          </div>
        )}

        {!loading && filteredDates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 bg-gray-800/60 border border-gray-700/40 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Nenhuma OS encontrada</p>
              <p className="text-gray-600 text-sm mt-1">Adicione pastas na pasta de impressão</p>
            </div>
          </div>
        )}

        {!loading && filteredDates.map(dateKey => {
          const clientes = Object.values(data[dateKey]).filter(c =>
            c.nome.toLowerCase().includes(search.toLowerCase()) &&
            (filter === 'ALL' || c.arquivos.some(a => a.status === filter))
          );
          if (clientes.length === 0) return null;

          return (
            <section key={dateKey} className="mb-10 fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-400 to-blue-700" />
                <h2 className="text-base font-bold text-white">{fmtDate(dateKey)}</h2>
                <span className="bg-gray-800/70 border border-gray-700/40 text-gray-400 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {clientes.length} OS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {clientes.map(cliente => {
                  const counts   = countStatuses(cliente);
                  const total    = cliente.arquivos.length;
                  const pct      = total > 0 ? Math.round((counts.ENTREGUE / total) * 100) : 0;
                  const dominant = (Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? 'PENDENTE') as ValidStatus;
                  const accent   = counts.ENTREGUE === total && total > 0 ? ACCENT_MAP.ENTREGUE : ACCENT_MAP[dominant];

                  return (
                    <div key={cliente.nome}
                      onClick={() => setModal({ date: dateKey, clienteNome: cliente.nome })}
                      className={`card-enter group cursor-pointer bg-gray-800/40 border ${accent}
                                 rounded-2xl p-4 flex flex-col gap-3
                                 hover:bg-gray-800/70 hover:shadow-xl hover:shadow-black/30
                                 hover:-translate-y-0.5 transition-all duration-200`}
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-sm truncate group-hover:text-blue-300 transition-colors">
                            {fmtClient(cliente.nome)}
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-0.5">{fmtDate(dateKey)}</p>
                        </div>
                        <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </div>

                      {/* Status badges + payment */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(Object.entries(counts) as [ValidStatus, number][]).filter(([,n]) => n > 0).map(([s, n]) => (
                          <span key={s} className={`flex items-center gap-1 text-[10px] font-bold ${STATUS_CFG[s].badge} px-1.5 py-0.5 rounded-md`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[s].dot}`} />{n}
                          </span>
                        ))}
                        {total === 0 && <span className="text-[11px] text-gray-600 italic">Sem arquivos</span>}
                        <span className={`ml-auto flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border
                          ${cliente.pago
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {cliente.pago ? '✓ PAGO' : '✕ FALTA PAGAR'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-600">{total} arquivo{total !== 1 ? 's' : ''}</span>
                          <span className={`text-[10px] font-semibold ${pct === 100 ? 'text-emerald-400' : 'text-gray-500'}`}>{pct}%</span>
                        </div>
                        <div className="h-1 bg-gray-700/60 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Card actions */}
                      <div className="flex items-center gap-2 pt-0.5 border-t border-gray-700/30">
                        <button
                          onClick={e => { e.stopPropagation(); void gerarOS(dateKey, cliente.nome); }}
                          disabled={generatingOS}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border
                                     bg-indigo-500/10 text-indigo-400 border-indigo-500/20
                                     hover:bg-indigo-500/20 hover:border-indigo-400/40 hover:text-indigo-300
                                     transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <span>Gerar O.S</span>
                        </button>

                        <button
                          onClick={e => { e.stopPropagation(); togglePagamento(dateKey, cliente.nome); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all
                            ${cliente.pago
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d={cliente.pago ? 'M6 18L18 6M6 6l12 12' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}/>
                          </svg>
                          <span>{cliente.pago ? 'Desmarcar' : 'Marcar pago'}</span>
                        </button>

                        <button
                          onClick={e => { void compartilhar(e, dateKey, cliente.nome); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border
                                     bg-gray-700/40 text-gray-400 border-gray-600/40
                                     hover:bg-gray-600/40 hover:text-gray-200 hover:border-gray-500/60
                                     transition-all ml-auto">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                          </svg>
                          <span>Compartilhar</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Modal */}
      {modal && modalCliente && (
        <FileModal
          open={!!modal}
          data={modal.date}
          cliente={modalCliente}
          onClose={() => setModal(null)}
          onChangeStatus={changeStatus}
          onTogglePagamento={() => togglePagamento(modal.date, modal.clienteNome)}
          onGerarOS={() => void gerarOS(modal.date, modal.clienteNome)}
          generatingOS={generatingOS}
        />
      )}

    </div>
  );
}
