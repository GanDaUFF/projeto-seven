/**
 * Contrato de persistencia para status de arquivos, pagamentos e tokens publicos.
 * A implementacao SQLite vive em sqliteStatus.repository.ts.
 *
 * Chaves logicas (mantidas iguais ao formato historico do status.json para
 * minimizar risco de migracao):
 *   - fileKey:    "DD.MM/CLIENTE/arquivo.ext"
 *   - paymentKey: "DD.MM/CLIENTE"
 *   - tokenKey:   "DD.MM/CLIENTE"
 */
export interface StatusRepository {
  getFileStatus(fileKey: string): string | null;
  setFileStatus(fileKey: string, status: string): void;
  getAllFileStatuses(): Record<string, string>;

  getClientPayment(paymentKey: string): boolean;
  setClientPayment(paymentKey: string, paid: boolean): void;
  getAllClientPayments(): Record<string, boolean>;

  getPublicToken(tokenKey: string): string | null;
  setPublicToken(tokenKey: string, token: string): void;
  findToken(token: string): { tokenKey: string; token: string } | null;

  /** Snapshot no formato legacy do status.json (compat / debug). */
  getAllAsLegacyMap(): Record<string, unknown>;
}
