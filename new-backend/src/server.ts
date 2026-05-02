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

ensureDefaultUser();
startWatcher(broadcast);

app.listen(PORT, () => {
  console.log(`\n✅ New backend rodando em http://localhost:${PORT}`);
  console.log(`📁 Monitorando: ${IMPRESSAO_DIR}\n`);
});
