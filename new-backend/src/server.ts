import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { ensureDefaultUser } from './services/auth.service';
import { startWatcher } from './services/watcher.service';
import { broadcast } from './services/sse.service';
import { PORT, IMPRESSAO_DIR } from './config';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'new-backend', port: PORT });
});

app.use('/api', routes);

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
