import { getConfig, PORT } from '../config';

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

export function getPublicBaseUrl(): string {
  const env = process.env.PUBLIC_BASE_URL?.trim();
  if (env) return stripTrailingSlash(env);

  const cfg = getConfig().publicBaseUrl?.trim();
  if (cfg) return stripTrailingSlash(cfg);

  return `http://localhost:${PORT}`;
}

export function isPublicBaseUrlConfigured(): boolean {
  const env = process.env.PUBLIC_BASE_URL?.trim();
  if (env) return true;
  const cfg = getConfig().publicBaseUrl?.trim();
  return !!cfg;
}

export function joinUrl(base: string, path: string): string {
  return `${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;
}
