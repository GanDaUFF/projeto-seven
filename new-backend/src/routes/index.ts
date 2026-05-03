import { Router } from 'express';
import authRoutes from './auth.routes';
import osRoutes from './os.routes';
import publicRoutes from './public.routes';
import configRoutes from './config.routes';
import setupRoutes from './setup.routes';

const router = Router();

router.use(publicRoutes);
router.use(configRoutes);
router.use(setupRoutes);
router.use(authRoutes);
router.use(osRoutes);

export default router;
