import fs from 'fs';
import path from 'path';
import { DATA_DIR, STATUS_FILE } from '../config';
import { getDb, getMeta, setMeta } from './database';
import { statusRepository } from '../repositories/sqliteStatus.repository';

const MIGRATED_KEY = 'status_json_migrated_at';
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function backupStatusJson(): string | null {
  if (!fs.existsSync(STATUS_FILE)) return null;
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const dest = path.join(BACKUPS_DIR, `status.backup.${timestamp()}.json`);
  if (fs.existsSync(dest)) return dest; // mesmo segundo, ja tem backup
  fs.copyFileSync(STATUS_FILE, dest);
  return dest;
}

interface ImportCounts { statuses: number; payments: number; tokens: number }

function importLegacyMap(raw: Record<string, unknown>): ImportCounts {
  const counts: ImportCounts = { statuses: 0, payments: 0, tokens: 0 };

  const tx = getDb().transaction(() => {
    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith('pag:')) {
        const paymentKey = key.slice(4);
        statusRepository.setClientPayment(paymentKey, Boolean(value));
        counts.payments++;
      } else if (key.startsWith('tok:')) {
        const tokenKey = key.slice(4);
        if (typeof value === 'string' && value.length > 0) {
          statusRepository.setPublicToken(tokenKey, value);
          counts.tokens++;
        }
      } else {
        if (typeof value === 'string' && value.length > 0) {
          statusRepository.setFileStatus(key, value);
          counts.statuses++;
        }
      }
    }
  });
  tx();

  return counts;
}

export function migrateStatusJsonIfNeeded(): void {
  if (getMeta(MIGRATED_KEY)) {
    return; // ja migrado em boot anterior
  }

  if (!fs.existsSync(STATUS_FILE)) {
    setMeta(MIGRATED_KEY, new Date().toISOString());
    console.log('[migrate] status.json nao existe — nada a importar.');
    return;
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')) as Record<string, unknown>;
  } catch (e) {
    console.error('[migrate] status.json invalido:', (e as Error).message);
    console.error('[migrate] Sistema seguira com SQLite vazio. status.json sera ignorado.');
    setMeta(MIGRATED_KEY, new Date().toISOString());
    return;
  }

  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    setMeta(MIGRATED_KEY, new Date().toISOString());
    console.log('[migrate] status.json vazio — nada a importar.');
    return;
  }

  const backup = backupStatusJson();
  if (backup) console.log(`[migrate] Backup do status.json salvo em ${backup}`);

  const counts = importLegacyMap(raw);
  setMeta(MIGRATED_KEY, new Date().toISOString());

  console.log(
    `[migrate] status.json importado para SQLite: ${counts.statuses} status, ` +
    `${counts.payments} pagamentos, ${counts.tokens} tokens.`,
  );
  console.log('[migrate] status.json original NAO foi apagado (preservado por seguranca).');
}
