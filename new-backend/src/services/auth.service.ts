import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { USERS_FILE, DATA_DIR, getJwtSecret } from '../config';

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
}

// Formato antigo para migracao
interface LegacyUser {
  username: string;
  password: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function isLegacyUser(u: unknown): u is LegacyUser {
  return typeof u === 'object' && u !== null && 'password' in u && !('passwordHash' in u);
}

export function getUsers(): User[] {
  ensureDataDir();
  let raw: unknown[];
  try {
    raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) as unknown[];
  } catch {
    return [];
  }

  if (!Array.isArray(raw) || raw.length === 0) return [];

  let needsMigration = false;
  const users: User[] = raw.map((entry, index) => {
    if (isLegacyUser(entry)) {
      needsMigration = true;
      return {
        id: index + 1,
        username: entry.username,
        passwordHash: entry.password, // ja e bcrypt hash
        role: 'admin' as const,
        createdAt: new Date().toISOString(),
      };
    }
    return entry as User;
  });

  if (needsMigration) {
    saveUsers(users);
    console.log('[auth] users.json migrado para novo formato');
  }

  return users;
}

export function saveUsers(users: User[]): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function getNextUserId(): number {
  const users = getUsers();
  return users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
}

export function ensureDefaultUser(): void {
  // So criar usuario padrao em development com flag explicita
  if (process.env.ALLOW_DEFAULT_USER !== 'true') return;

  const users = getUsers();
  if (users.length > 0) return;

  const hash = bcrypt.hashSync('seven100', 10);
  const defaultUser: User = {
    id: 1,
    username: 'seven',
    passwordHash: hash,
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  saveUsers([defaultUser]);
  console.log('[auth] Usuario padrao criado (ALLOW_DEFAULT_USER=true): seven / seven100');
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username e password sao obrigatorios' });
    return;
  }

  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) {
    res.status(401).json({ error: 'Credenciais invalidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Credenciais invalidas' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: '1d' },
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
}
