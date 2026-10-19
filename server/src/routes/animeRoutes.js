import { Router } from 'express';
import * as anime from '../controllers/animeController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', anime.list);
router.get('/:id', anime.getOne);
router.post('/', requireAdmin, anime.create);
router.put('/:id', requireAdmin, anime.update);
router.delete('/:id', requireAdmin, anime.remove);

export default router;
