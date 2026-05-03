import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  postToken,
  getPublicCliente,
  getTunnelUrl,
} from '../controllers/os.controller';
import { addClient, removeClient } from '../services/sse.service';
import { requireImpressaoDir } from '../middleware/impressao.middleware';

const router = Router();

router.get('/tunnel-url', getTunnelUrl);
router.post('/token', requireImpressaoDir, postToken);
router.get('/public/cliente/:token', requireImpressaoDir, getPublicCliente);

router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  addClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

export default router;
