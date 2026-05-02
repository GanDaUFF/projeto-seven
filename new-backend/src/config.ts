import fs from 'fs';
import path from 'path';

// proj/ raiz do projeto (dois níveis acima de new-backend/src/)
export const ROOT = path.join(__dirname, '..', '..');

interface Config {
  impressaoPath: string;
  port: number;
}

function loadConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf-8')) as Config;
  } catch {
    return { impressaoPath: './impressao', port: 3000 };
  }
}

const config = loadConfig();

export const IMPRESSAO_DIR = path.isAbsolute(config.impressaoPath)
  ? config.impressaoPath
  : path.resolve(ROOT, config.impressaoPath);

export const PORT = Number(process.env.PORT ?? 3001);
export const DATA_DIR = path.join(ROOT, 'data');
export const STATUS_FILE = path.join(DATA_DIR, 'status.json');
export const USERS_FILE = path.join(DATA_DIR, 'users.json');
