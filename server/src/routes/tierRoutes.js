import { Router } from 'express';
import * as tiers from '../controllers/tiersController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', tiers.list);
router.put('/:key', requireAdmin, tiers.update);

export default router;
