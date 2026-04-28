const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../auth');

module.exports = function authMiddleware(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    // Aceita token via query param (ex: download direto via <a href>)
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token expirado ou inválido' });
  }
};
