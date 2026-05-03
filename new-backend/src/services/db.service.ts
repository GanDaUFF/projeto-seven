import crypto from 'crypto';
import { statusRepository } from '../repositories/sqliteStatus.repository';

export const VALID_STATUSES = ['PENDENTE', 'PRODUCAO', 'FEITO', 'ENTREGUE'] as const;
export type ValidStatus = (typeof VALID_STATUSES)[number];

/**
 * Camada fina sobre o StatusRepository. Mantida com as mesmas assinaturas que
 * o backend ja consumia quando a fonte de dados era data/status.json — assim
 * controllers, services de OS e rotas nao precisaram mudar com a Sprint 3A.
 */

export function getStatuses(): Record<string, string> {
  return statusRepository.getAllFileStatuses();
}

export function updateStatus(data: string, cliente: string, arquivo: string, status: string): void {
  const fileKey = `${data}/${cliente}/${arquivo}`;
  statusRepository.setFileStatus(fileKey, status);
}

export function getPagamentos(): Record<string, boolean> {
  return statusRepository.getAllClientPayments();
}

export function updatePagamento(data: string, cliente: string, pago: boolean): void {
  const paymentKey = `${data}/${cliente}`;
  statusRepository.setClientPayment(paymentKey, Boolean(pago));
}

export function getOrCreateToken(data: string, cliente: string): string {
  const tokenKey = `${data}/${cliente}`;
  const existing = statusRepository.getPublicToken(tokenKey);
  if (existing) return existing;

  const token = crypto.randomBytes(16).toString('hex');
  statusRepository.setPublicToken(tokenKey, token);
  return token;
}

export function findClientByToken(token: string): { data: string; cliente: string } | null {
  const found = statusRepository.findToken(token);
  if (!found) return null;

  const slash = found.tokenKey.indexOf('/');
  if (slash < 0) return null;

  return {
    data: found.tokenKey.slice(0, slash),
    cliente: found.tokenKey.slice(slash + 1),
  };
}
