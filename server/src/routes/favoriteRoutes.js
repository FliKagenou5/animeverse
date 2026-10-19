import { Router } from 'express';
import * as favorites from '../controllers/favoritesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/ids', favorites.ids);
router.get('/', favorites.list);
router.post('/', favorites.add);
router.delete('/:characterId', favorites.remove);

export default router;
