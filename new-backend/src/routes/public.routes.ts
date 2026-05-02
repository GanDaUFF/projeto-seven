import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  postToken,
  getPublicCliente,
  getTunnelUrl,
  getConfig,
} from '../controllers/os.controller';
import { addClient, removeClient } from '../services/sse.service';

const router = Router();

router.get('/config', getConfig);
router.get('/tunnel-url', getTunnelUrl);
router.post('/token', postToken);
router.get('/public/cliente/:token', getPublicCliente);

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
