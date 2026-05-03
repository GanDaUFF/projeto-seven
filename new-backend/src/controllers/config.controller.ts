import type { Request, Response } from 'express';
import { getConfig, updateConfig, isImpressaoDirConfigured } from '../config';

export function getAppConfig(_req: Request, res: Response): void {
  const config = getConfig();
  res.json({
    nomeGrafica: config.nomeGrafica,
    telefoneGrafica: config.telefoneGrafica,
    impressaoDir: config.impressaoDir,
    logoPath: config.logoPath,
    publicBaseUrl: config.publicBaseUrl,
    ambiente: config.ambiente,
    impressaoDirConfigured: isImpressaoDirConfigured(),
  });
}

export function patchAppConfig(req: Request, res: Response): void {
  const allowed = ['impressaoDir', 'nomeGrafica', 'telefoneGrafica', 'logoPath', 'publicBaseUrl'] as const;
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  for (const field of allowed) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Nenhum campo valido para atualizar.' });
    return;
  }

  const updated = updateConfig(updates);
  const needsRestart = 'impressaoDir' in updates;

  res.json({
    nomeGrafica: updated.nomeGrafica,
    telefoneGrafica: updated.telefoneGrafica,
    impressaoDir: updated.impressaoDir,
    logoPath: updated.logoPath,
    publicBaseUrl: updated.publicBaseUrl,
    ambiente: updated.ambiente,
    impressaoDirConfigured: isImpressaoDirConfigured(),
    ...(needsRestart ? { warning: 'Alteracao na pasta de impressao requer reinicio do servidor.' } : {}),
  });
}
