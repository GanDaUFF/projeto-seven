import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from './appConfig';

const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');

interface SecretsData {
  jwtSecret: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadOrCreateSecrets(): SecretsData {
  ensureDataDir();

  if (fs.existsSync(SECRETS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8')) as SecretsData;
    } catch {
      // Arquivo corrompido — regenerar
    }
  }

  const secrets: SecretsData = {
    jwtSecret: crypto.randomBytes(64).toString('hex'),
  };

  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), 'utf-8');
  console.log('[secrets] Arquivo de secrets criado em data/secrets.json');
  return secrets;
}

const secrets = loadOrCreateSecrets();

export function getJwtSecret(): string {
  // Variavel de ambiente tem prioridade
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  return secrets.jwtSecret;
}
