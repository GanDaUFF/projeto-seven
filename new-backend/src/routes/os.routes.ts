import { Router } from 'express';
import {
  getOS,
  postStatus,
  postPagamento,
  postGenerateOS,
  getDownload,
} from '../controllers/os.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/os', getOS);
router.post('/status', postStatus);
router.post('/pagamento', postPagamento);
router.post('/generate-os', postGenerateOS);
router.get('/download', getDownload);

export default router;
