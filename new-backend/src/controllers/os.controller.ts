import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { readStructure, readClienteByToken } from '../services/os.service';
import {
  updateStatus,
  updatePagamento,
  VALID_STATUSES,
  getOrCreateToken,
  findClientByToken,
} from '../services/db.service';
import { generateOS } from '../services/generateOS.service';
import { broadcast } from '../services/sse.service';
import { getPublicBaseUrl, joinUrl } from '../services/publicUrl.service';
import { IMPRESSAO_DIR } from '../config';

export function getOS(_req: Request, res: Response): void {
  try {
    res.json(readStructure());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao ler estrutura de pastas' });
  }
}

export function postStatus(req: Request, res: Response): void {
  const { data, cliente, arquivo, status } = req.body as {
    data?: string; cliente?: string; arquivo?: string; status?: string;
  };

  if (!data || !cliente || !arquivo || !status) {
    res.status(400).json({ error: 'Campos data, cliente, arquivo e status são obrigatórios' });
    return;
  }

  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  updateStatus(data, cliente, arquivo, status);
  broadcast();
  res.json({ success: true });
}

export function postPagamento(req: Request, res: Response): void {
  const { data, cliente, pago } = req.body as {
    data?: string; cliente?: string; pago?: boolean;
  };

  if (!data || !cliente || pago === undefined) {
    res.status(400).json({ error: 'Campos data, cliente e pago são obrigatórios' });
    return;
  }

  updatePagamento(data, cliente, Boolean(pago));
  broadcast();
  res.json({ success: true });
}

export async function postGenerateOS(req: Request, res: Response): Promise<void> {
  const { data, cliente } = req.body as { data?: string; cliente?: string };

  if (!data || !cliente) {
    res.status(400).json({ error: 'Campos data e cliente são obrigatórios' });
    return;
  }

  try {
    const result = await generateOS(IMPRESSAO_DIR, data, cliente);
    broadcast();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export function getDownload(req: Request, res: Response): void {
  const { data, cliente, arquivo } = req.query as {
    data?: string; cliente?: string; arquivo?: string;
  };

  if (!data || !cliente || !arquivo) {
    res.status(400).json({ error: 'Parâmetros data, cliente e arquivo são obrigatórios' });
    return;
  }

  const filePath = path.resolve(IMPRESSAO_DIR, data, cliente, arquivo);

  if (!filePath.startsWith(path.resolve(IMPRESSAO_DIR))) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Arquivo não encontrado' });
    return;
  }

  res.download(filePath, arquivo);
}

export function postToken(req: Request, res: Response): void {
  const { data, cliente } = req.body as { data?: string; cliente?: string };
  if (!data || !cliente) {
    res.status(400).json({ error: 'data e cliente são obrigatórios' });
    return;
  }
  const token = getOrCreateToken(data, cliente);
  const url = joinUrl(getPublicBaseUrl(), `/cliente/${token}`);
  res.json({ token, url });
}

export function getPublicCliente(req: Request, res: Response): void {
  const found = findClientByToken(req.params.token);
  if (!found) {
    res.status(404).json({ error: 'Token inválido ou expirado' });
    return;
  }
  res.json(readClienteByToken(found.data, found.cliente));
}

export function getTunnelUrl(_req: Request, res: Response): void {
  res.json({ url: getPublicBaseUrl() });
}

