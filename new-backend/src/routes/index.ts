import { Router } from 'express';
import authRoutes from './auth.routes';
import osRoutes from './os.routes';
import publicRoutes from './public.routes';

const router = Router();

router.use(publicRoutes);
router.use(authRoutes);
router.use(osRoutes);

export default router;
