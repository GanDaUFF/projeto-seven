const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'gestao-os-jwt-secret-2024';

function getUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function ensureDefaultUser() {
  const users = getUsers();
  if (users.length > 0) return;
  const hash = bcrypt.hashSync('seven100', 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify([{ username: 'seven', password: hash }], null, 2));
  console.log('[auth] Usuário padrão criado: seven');
}

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, username: user.username });
}

module.exports = { login, ensureDefaultUser, JWT_SECRET };
