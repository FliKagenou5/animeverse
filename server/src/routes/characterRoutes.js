import { Router } from 'express';
import {
  create,
  getOne,
  list,
  remove,
  update,
} from '../controllers/charactersController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', list);
router.get('/:id', getOne);
router.post('/', requireAdmin, create);
router.put('/:id', requireAdmin, update);
router.delete('/:id', requireAdmin, remove);

export default router;
