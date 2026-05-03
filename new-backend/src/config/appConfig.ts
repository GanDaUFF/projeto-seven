import fs from 'fs';
import path from 'path';

// Raiz do projeto: 3 niveis acima de new-backend/src/config/
export const ROOT = path.join(__dirname, '..', '..', '..');

const CONFIG_FILE = path.join(ROOT, 'config.json');

export interface AppConfig {
  impressaoDir: string;
  nomeGrafica: string;
  telefoneGrafica: string;
  logoPath: string;
  publicBaseUrl: string;
  portaBackend: number;
  ambiente: string;
}

const DEFAULTS: AppConfig = {
  impressaoDir: '',
  nomeGrafica: '',
  telefoneGrafica: '',
  logoPath: '',
  publicBaseUrl: '',
  portaBackend: 3001,
  ambiente: 'development',
};

const UPDATABLE_FIELDS: (keyof AppConfig)[] = [
  'impressaoDir',
  'nomeGrafica',
  'telefoneGrafica',
  'logoPath',
  'publicBaseUrl',
];

let cached: AppConfig | null = null;

function migrateOldConfig(raw: Record<string, unknown>): Record<string, unknown> {
  const migrated = { ...raw };

  // impressaoPath -> impressaoDir
  if ('impressaoPath' in migrated && !('impressaoDir' in migrated)) {
    migrated.impressaoDir = migrated.impressaoPath;
    delete migrated.impressaoPath;
  }

  // port -> portaBackend
  if ('port' in migrated && !('portaBackend' in migrated)) {
    migrated.portaBackend = migrated.port;
    delete migrated.port;
  }

  return migrated;
}

function loadConfig(): AppConfig {
  let raw: Record<string, unknown> = {};

  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as Record<string, unknown>;
    raw = migrateOldConfig(raw);
  } catch {
    // config.json nao existe ou invalido — usar defaults
  }

  const config: AppConfig = {
    impressaoDir: (raw.impressaoDir as string) ?? DEFAULTS.impressaoDir,
    nomeGrafica: (raw.nomeGrafica as string) ?? DEFAULTS.nomeGrafica,
    telefoneGrafica: (raw.telefoneGrafica as string) ?? DEFAULTS.telefoneGrafica,
    logoPath: (raw.logoPath as string) ?? DEFAULTS.logoPath,
    publicBaseUrl: (raw.publicBaseUrl as string) ?? DEFAULTS.publicBaseUrl,
    portaBackend: (raw.portaBackend as number) ?? DEFAULTS.portaBackend,
    ambiente: (raw.ambiente as string) ?? DEFAULTS.ambiente,
  };

  // Salvar config.json com formato atualizado
  saveConfig(config);
  cached = config;
  return config;
}

function saveConfig(config: AppConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return { ...cached };
}

export function updateConfig(partial: Partial<AppConfig>): AppConfig {
  const current = getConfig();

  for (const key of UPDATABLE_FIELDS) {
    if (key in partial && partial[key] !== undefined) {
      (current as unknown as Record<string, unknown>)[key] = partial[key];
    }
  }

  saveConfig(current);
  cached = current;
  return { ...current };
}

export function isImpressaoDirConfigured(): boolean {
  const config = getConfig();
  return config.impressaoDir.trim().length > 0;
}

// Inicializar config na carga do modulo
const config = loadConfig();

// Exports retrocompativeis com o antigo config.ts
export const DATA_DIR = path.join(ROOT, 'data');
export const STATUS_FILE = path.join(DATA_DIR, 'status.json');
export const USERS_FILE = path.join(DATA_DIR, 'users.json');
export const PORT = Number(process.env.PORT ?? config.portaBackend ?? 3001);

export const IMPRESSAO_DIR: string = config.impressaoDir
  ? (path.isAbsolute(config.impressaoDir)
      ? config.impressaoDir
      : path.resolve(ROOT, config.impressaoDir))
  : '';
