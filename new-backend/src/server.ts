import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { ensureDefaultUser } from './services/auth.service';
import { startWatcher } from './services/watcher.service';
import { broadcast } from './services/sse.service';
import { PORT, IMPRESSAO_DIR, ROOT } from './config';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'new-backend', port: PORT });
});

app.use('/api', routes);

// Modo producao: backend serve o frontend React buildado
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(ROOT, 'new-frontend', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[server] Servindo frontend buildado de ${distPath}`);
  } else {
    console.warn(`[server] NODE_ENV=production mas ${distPath} nao existe.`);
    console.warn('[server] Rode "npm run build" no new-frontend antes de iniciar em producao.');
  }
}

// Usuario padrao apenas se ALLOW_DEFAULT_USER=true (development)
ensureDefaultUser();

// Watcher so inicia se pasta de impressao estiver configurada
if (IMPRESSAO_DIR) {
  startWatcher(broadcast);
} else {
  console.warn('[server] Pasta de impressao nao configurada. Watcher desativado.');
  console.warn('[server] Configure via GET /api/config ou edite config.json');
}

app.listen(PORT, () => {
  console.log(`\nNew backend rodando em http://localhost:${PORT}`);
  if (IMPRESSAO_DIR) {
    console.log(`Monitorando: ${IMPRESSAO_DIR}\n`);
  } else {
    console.log('Pasta de impressao: NAO CONFIGURADA\n');
  }
});
