import { useEffect } from 'react';
import type { OSCliente, ValidStatus, StatusCounts } from '../types';
import { api } from '../services/api';

const STATUS_CFG: Record<ValidStatus, { label: string; badge: string; dot: string; active: string; hover: string }> = {
  PENDENTE: {
    label:  'Pendente',
    badge:  'bg-amber-400/10 text-amber-300 border border-amber-400/25',
    dot:    'bg-amber-400',
    active: 'bg-amber-400/20 text-amber-300 border-amber-400/50',
    hover:  'text-gray-500 border-gray-700/50 hover:bg-amber-400/10 hover:text-amber-300 hover:border-amber-400/30',
  },
  PRODUCAO: {
    label:  'Produção',
    badge:  'bg-blue-400/10 text-blue-300 border border-blue-400/25',
    dot:    'bg-blue-400',
    active: 'bg-blue-400/20 text-blue-300 border-blue-400/50',
    hover:  'text-gray-500 border-gray-700/50 hover:bg-blue-400/10 hover:text-blue-300 hover:border-blue-400/30',
  },
  FEITO: {
    label:  'Feito',
    badge:  'bg-purple-400/10 text-purple-300 border border-purple-400/25',
    dot:    'bg-purple-400',
    active: 'bg-purple-400/20 text-purple-300 border-purple-400/50',
    hover:  'text-gray-500 border-gray-700/50 hover:bg-purple-400/10 hover:text-purple-300 hover:border-purple-400/30',
  },
  ENTREGUE: {
    label:  'Entregue',
    badge:  'bg-emerald-400/10 text-emerald-300 border border-emerald-400/25',
    dot:    'bg-emerald-400',
    active: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/50',
    hover:  'text-gray-500 border-gray-700/50 hover:bg-emerald-400/10 hover:text-emerald-300 hover:border-emerald-400/30',
  },
};

const FILE_ICONS: Record<string, string> = {
  pdf:'📄', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️',
  ai:'🎨', psd:'🎨', cdr:'🎨', svg:'🎨',
  mp4:'🎬', mov:'🎬', zip:'📦', rar:'📦',
};
function fileIcon(name: string) {
  return FILE_ICONS[name.split('.').pop()?.toLowerCase() ?? ''] ?? '📎';
}

function countStatuses(cliente: OSCliente): StatusCounts {
  const c: StatusCounts = { PENDENTE: 0, PRODUCAO: 0, FEITO: 0, ENTREGUE: 0 };
  cliente.arquivos.forEach(a => { c[a.status]++; });
  return c;
}

function fmtDate(s: string) {
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [d, m] = s.replace(',', '.').split('.');
  return `${parseInt(d)} ${MESES[parseInt(m) - 1] ?? m}`;
}
function fmtClient(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface Props {
  open: boolean;
  data: string;
  cliente: OSCliente;
  onClose: () => void;
  onChangeStatus: (data: string, clienteNome: string, arquivo: string, status: ValidStatus) => void;
  onTogglePagamento: () => void;
  onGerarOS: () => void;
  generatingOS: boolean;
}

export default function FileModal({
  open, data, cliente, onClose, onChangeStatus, onTogglePagamento, onGerarOS, generatingOS,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const counts  = countStatuses(cliente);
  const total   = cliente.arquivos.length;
  const ORDER   = { PENDENTE: 0, PRODUCAO: 1, FEITO: 2, ENTREGUE: 3 };
  const sorted  = [...cliente.arquivos].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div
      className={`modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? 'open' : ''}`}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel bg-[#17171f] border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gray-700/60 flex items-center justify-center text-lg flex-shrink-0">📁</div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-base truncate">{fmtClient(cliente.nome)}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {fmtDate(data)} · {total} arquivo{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700/60 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Status counters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-700/50 flex-shrink-0 flex-wrap">
          {(Object.entries(counts) as [ValidStatus, number][]).map(([s, n]) => (
            <div key={s} className={`flex items-center gap-1.5 ${STATUS_CFG[s].badge} px-2.5 py-1 rounded-lg`}>
              <span className={`w-2 h-2 rounded-full ${STATUS_CFG[s].dot}`} />
              <span className="text-[11px] font-semibold">{STATUS_CFG[s].label}</span>
              <span className="text-xs font-bold">{n}</span>
            </div>
          ))}
        </div>

        {/* File list */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-700/40 px-1">
          {sorted.length === 0
            ? <p className="text-center text-gray-600 text-sm py-8">Nenhum arquivo nesta pasta</p>
            : sorted.map(arq => (
              <div key={arq.nome} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors">
                <span className="text-lg flex-shrink-0">{fileIcon(arq.nome)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-100 font-medium truncate">{arq.nome}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Download */}
                  <a
                    href={api.downloadUrl(data, cliente.nome, arq.nome)}
                    download={arq.nome}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-700/50
                               text-gray-500 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/40 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                  </a>
                  <div className="w-px h-4 bg-gray-700/60" />
                  {/* Status buttons */}
                  <div className="flex gap-1">
                    {(Object.keys(STATUS_CFG) as ValidStatus[]).map(key => {
                      const isActive = key === arq.status;
                      return (
                        <button key={key}
                          disabled={isActive}
                          onClick={() => onChangeStatus(data, cliente.nome, arq.nome, key)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all
                                     ${isActive ? STATUS_CFG[key].active : STATUS_CFG[key].hover}
                                     disabled:cursor-default`}
                        >
                          {STATUS_CFG[key].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700/50 flex-shrink-0 flex items-center gap-2">
          <span className="text-[11px] text-gray-600 mr-auto">
            {counts.ENTREGUE} de {total} entregue{counts.ENTREGUE !== 1 ? 's' : ''}
          </span>

          <button onClick={onGerarOS} disabled={generatingOS}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-indigo-500/15 text-indigo-400 border border-indigo-500/25
                       hover:bg-indigo-500/25 hover:text-indigo-300 hover:border-indigo-400/50
                       transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {generatingOS ? 'Gerando…' : 'Gerar O.S'}
          </button>

          <button onClick={onTogglePagamento}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-shrink-0
              ${cliente.pago
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={cliente.pago ? 'M5 13l4 4L19 7' : 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}/>
            </svg>
            {cliente.pago ? 'Pago' : 'Marcar pago'}
          </button>

          <button onClick={onClose} className="text-xs font-semibold text-gray-500 hover:text-white transition-colors ml-1">
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
