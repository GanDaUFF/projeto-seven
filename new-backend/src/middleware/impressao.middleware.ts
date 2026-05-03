import type { Request, Response, NextFunction } from 'express';
import { isImpressaoDirConfigured } from '../config';

export function requireImpressaoDir(_req: Request, res: Response, next: NextFunction): void {
  if (!isImpressaoDirConfigured()) {
    res.status(503).json({ error: 'A pasta de impressão ainda não foi configurada.' });
    return;
  }
  next();
}
