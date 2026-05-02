import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { USERS_FILE } from '../config';

export const JWT_SECRET = process.env.JWT_SECRET ?? 'gestao-os-jwt-secret-2024';

interface User {
  username: string;
  password: string;
}

function getUsers(): User[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) as User[];
  } catch {
    return [];
  }
}

export function ensureDefaultUser(): void {
  const users = getUsers();
  if (users.length > 0) return;
  const hash = bcrypt.hashSync('seven100', 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify([{ username: 'seven', password: hash }], null, 2));
  console.log('[auth] Usuário padrão criado: seven / seven100');
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username e password são obrigatórios' });
    return;
  }

  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, username: user.username });
}
