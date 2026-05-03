import fs from 'fs';
import path from 'path';
import { IMPRESSAO_DIR } from '../config';
import { getStatuses, getPagamentos } from './db.service';
import type { OSData, OSCliente } from '../types';

function isDir(p: string): boolean {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function isFile(p: string): boolean {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function parseDateDir(s: string): number | null {
  const [d, m] = s.split('.').map(Number);
  return !isNaN(d) && !isNaN(m) ? m * 100 + d : null;
}

export function readStructure(): OSData {
  if (!IMPRESSAO_DIR) return {};
  if (!fs.existsSync(IMPRESSAO_DIR)) {
    fs.mkdirSync(IMPRESSAO_DIR, { recursive: true });
    return {};
  }

  const statuses = getStatuses();
  const pagamentos = getPagamentos();

  const dateDirs = fs.readdirSync(IMPRESSAO_DIR)
    .filter((d) => isDir(path.join(IMPRESSAO_DIR, d)))
    .sort((a, b) => {
      const va = parseDateDir(a), vb = parseDateDir(b);
      if (va !== null && vb !== null) return vb - va;
      return b.localeCompare(a);
    });

  const result: OSData = {};

  for (const dateDir of dateDirs) {
    const datePath = path.join(IMPRESSAO_DIR, dateDir);
    let clienteDirs: string[] = [];

    try {
      clienteDirs = fs.readdirSync(datePath)
        .filter((d) => isDir(path.join(datePath, d)))
        .sort();
    } catch (e) {
      console.warn(`[os] Erro ao ler ${datePath}:`, (e as Error).message);
    }

    result[dateDir] = {};

    for (const clienteDir of clienteDirs) {
      const clientePath = path.join(datePath, clienteDir);
      let arquivos: string[] = [];

      try {
        arquivos = fs.readdirSync(clientePath)
          .filter((f) => isFile(path.join(clientePath, f)))
          .sort();
      } catch (e) {
        console.warn(`[os] Erro ao ler ${clientePath}:`, (e as Error).message);
      }

      const cliente: OSCliente = {
        nome: clienteDir,
        pago: pagamentos[`${dateDir}/${clienteDir}`] ?? false,
        arquivos: arquivos.map((nome) => ({
          nome,
          status: (statuses[`${dateDir}/${clienteDir}/${nome}`] as OSCliente['arquivos'][number]['status']) ?? 'PENDENTE',
        })),
      };

      result[dateDir][clienteDir] = cliente;
    }
  }

  return result;
}

export function readClienteByToken(data: string, clienteNome: string) {
  const statuses = getStatuses();
  const pagamentos = getPagamentos();
  const clientePath = path.join(IMPRESSAO_DIR, data, clienteNome);

  let arquivos: string[] = [];
  try {
    arquivos = fs.readdirSync(clientePath)
      .filter((f) => isFile(path.join(clientePath, f)))
      .sort();
  } catch { /* pasta inexistente */ }

  return {
    cliente: clienteNome,
    data,
    pago: pagamentos[`${data}/${clienteNome}`] ?? false,
    arquivos: arquivos.map((nome) => ({
      nome,
      status: statuses[`${data}/${clienteNome}/${nome}`] ?? 'PENDENTE',
    })),
  };
}
