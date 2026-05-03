import { Router } from 'express';
import { getSetupStatus, postSetupAdmin } from '../controllers/setup.controller';

const router = Router();

// Rotas publicas (sem autenticacao) — auto-protegidas por logica interna
router.get('/setup/status', getSetupStatus);
router.post('/setup/admin', postSetupAdmin);

export default router;
