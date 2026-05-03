import { Router } from 'express';
import {
  getOS,
  postStatus,
  postPagamento,
  postGenerateOS,
  getDownload,
} from '../controllers/os.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireImpressaoDir } from '../middleware/impressao.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/os', requireImpressaoDir, getOS);
router.post('/status', postStatus);
router.post('/pagamento', postPagamento);
router.post('/generate-os', requireImpressaoDir, postGenerateOS);
router.get('/download', requireImpressaoDir, getDownload);

export default router;
