import { Router } from 'express';
import * as battles from '../controllers/battlesController.js';
import { requireAuth } from '../middleware/auth.js';
import { analysisLimiter } from '../middleware/rateLimits.js';

const router = Router();

router.post('/analyze', analysisLimiter, battles.analyze);
router.get('/', requireAuth, battles.list);
router.post('/', requireAuth, battles.save);
router.get('/:id', requireAuth, battles.getOne);

export default router;
