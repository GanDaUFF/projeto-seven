import { getDb } from '../database/database';
import type { StatusRepository } from './status.repository';

function nowIso(): string {
  return new Date().toISOString();
}

interface FileStatusRow { status: string }
interface PaymentRow { paid: number }
interface TokenRow { token: string }
interface TokenLookupRow { token_key: string; token: string }
interface FileStatusFullRow { file_key: string; status: string }
interface PaymentFullRow { payment_key: string; paid: number }
interface TokenFullRow { token_key: string; token: string }

class SqliteStatusRepository implements StatusRepository {
  getFileStatus(fileKey: string): string | null {
    const row = getDb()
      .prepare<[string], FileStatusRow>('SELECT status FROM file_statuses WHERE file_key = ?')
      .get(fileKey);
    return row?.status ?? null;
  }

  setFileStatus(fileKey: string, status: string): void {
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO file_statuses (file_key, status, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(file_key) DO UPDATE SET
           status = excluded.status,
           updated_at = excluded.updated_at`,
      )
      .run(fileKey, status, ts, ts);
  }

  getAllFileStatuses(): Record<string, string> {
    const rows = getDb()
      .prepare<[], FileStatusFullRow>('SELECT file_key, status FROM file_statuses')
      .all();
    const result: Record<string, string> = {};
    for (const row of rows) result[row.file_key] = row.status;
    return result;
  }

  getClientPayment(paymentKey: string): boolean {
    const row = getDb()
      .prepare<[string], PaymentRow>('SELECT paid FROM client_payments WHERE payment_key = ?')
      .get(paymentKey);
    return row?.paid === 1;
  }

  setClientPayment(paymentKey: string, paid: boolean): void {
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO client_payments (payment_key, paid, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(payment_key) DO UPDATE SET
           paid = excluded.paid,
           updated_at = excluded.updated_at`,
      )
      .run(paymentKey, paid ? 1 : 0, ts, ts);
  }

  getAllClientPayments(): Record<string, boolean> {
    const rows = getDb()
      .prepare<[], PaymentFullRow>('SELECT payment_key, paid FROM client_payments')
      .all();
    const result: Record<string, boolean> = {};
    for (const row of rows) result[row.payment_key] = row.paid === 1;
    return result;
  }

  getPublicToken(tokenKey: string): string | null {
    const row = getDb()
      .prepare<[string], TokenRow>(
        'SELECT token FROM public_tokens WHERE token_key = ? AND disabled_at IS NULL',
      )
      .get(tokenKey);
    return row?.token ?? null;
  }

  setPublicToken(tokenKey: string, token: string): void {
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO public_tokens (token_key, token, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(token_key) DO UPDATE SET
           token = excluded.token,
           updated_at = excluded.updated_at,
           disabled_at = NULL`,
      )
      .run(tokenKey, token, ts, ts);
  }

  findToken(token: string): { tokenKey: string; token: string } | null {
    const row = getDb()
      .prepare<[string], TokenLookupRow>(
        'SELECT token_key, token FROM public_tokens WHERE token = ? AND disabled_at IS NULL',
      )
      .get(token);
    return row ? { tokenKey: row.token_key, token: row.token } : null;
  }

  getAllAsLegacyMap(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this.getAllFileStatuses())) out[k] = v;
    for (const [k, v] of Object.entries(this.getAllClientPayments())) out[`pag:${k}`] = v;
    const tokenRows = getDb()
      .prepare<[], TokenFullRow>(
        'SELECT token_key, token FROM public_tokens WHERE disabled_at IS NULL',
      )
      .all();
    for (const row of tokenRows) out[`tok:${row.token_key}`] = row.token;
    return out;
  }
}

export const statusRepository: StatusRepository = new SqliteStatusRepository();
