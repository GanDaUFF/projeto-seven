import { Router } from 'express';
import { getAppConfig, patchAppConfig } from '../controllers/config.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /api/config — publico (frontend precisa antes do login)
router.get('/config', getAppConfig);

// PATCH /api/config — requer autenticacao
router.patch('/config', authMiddleware, patchAppConfig);

export default router;
