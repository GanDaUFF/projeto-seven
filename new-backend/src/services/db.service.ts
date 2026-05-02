import fs from 'fs';
import crypto from 'crypto';
import { DATA_DIR, STATUS_FILE } from '../config';

export const VALID_STATUSES = ['PENDENTE', 'PRODUCAO', 'FEITO', 'ENTREGUE'] as const;
export type ValidStatus = (typeof VALID_STATUSES)[number];

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile(): Record<string, unknown> {
  ensureDataDir();
  if (!fs.existsSync(STATUS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeFile(data: Record<string, unknown>): void {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getStatuses(): Record<string, string> {
  const all = readFile();
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith('pag:') && !k.startsWith('tok:')) result[k] = v as string;
  }
  return result;
}

export function updateStatus(data: string, cliente: string, arquivo: string, status: string): void {
  const all = readFile();
  all[`${data}/${cliente}/${arquivo}`] = status;
  writeFile(all);
}

export function getPagamentos(): Record<string, boolean> {
  const all = readFile();
  const result: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith('pag:')) result[k.slice(4)] = v as boolean;
  }
  return result;
}

export function updatePagamento(data: string, cliente: string, pago: boolean): void {
  const all = readFile();
  all[`pag:${data}/${cliente}`] = Boolean(pago);
  writeFile(all);
}

export function getOrCreateToken(data: string, cliente: string): string {
  const all = readFile();
  const key = `tok:${data}/${cliente}`;
  if (!all[key]) {
    all[key] = crypto.randomBytes(16).toString('hex');
    writeFile(all);
  }
  return all[key] as string;
}

export function findClientByToken(token: string): { data: string; cliente: string } | null {
  const all = readFile();
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith('tok:') && v === token) {
      const rest = k.slice(4);
      const slash = rest.indexOf('/');
      return { data: rest.slice(0, slash), cliente: rest.slice(slash + 1) };
    }
  }
  return null;
}
