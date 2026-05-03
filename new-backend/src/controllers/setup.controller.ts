import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getUsers, saveUsers, getNextUserId } from '../services/auth.service';
import type { User } from '../services/auth.service';

export function getSetupStatus(_req: Request, res: Response): void {
  const users = getUsers();
  res.json({ needsSetup: users.length === 0 });
}

export function postSetupAdmin(req: Request, res: Response): void {
  const { username, password, confirmPassword } = req.body as {
    username?: string;
    password?: string;
    confirmPassword?: string;
  };

  // Verificar se setup ja foi feito
  const users = getUsers();
  if (users.length > 0) {
    res.status(403).json({ error: 'Setup ja foi realizado. Ja existe um administrador.' });
    return;
  }

  // Validacoes
  if (!username || username.trim().length < 3) {
    res.status(400).json({ error: 'Username deve ter pelo menos 3 caracteres.' });
    return;
  }

  if (!password || password.length < 6) {
    res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'As senhas nao conferem.' });
    return;
  }

  const newUser: User = {
    id: getNextUserId(),
    username: username.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  saveUsers([newUser]);
  console.log(`[setup] Administrador criado: ${newUser.username}`);

  res.json({
    success: true,
    user: { id: newUser.id, username: newUser.username, role: newUser.role },
  });
}
