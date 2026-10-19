import { Router } from 'express';
import * as gallery from '../controllers/galleryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', gallery.list);
router.post('/:id/favorite', requireAuth, gallery.addFavorite);
router.delete('/:id/favorite', requireAuth, gallery.removeFavorite);

export default router;
