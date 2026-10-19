import { Router } from 'express';
import * as tierLists from '../controllers/tierListsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', tierLists.list);
router.post('/', tierLists.create);
router.get('/:id', tierLists.getOne);
router.put('/:id', tierLists.update);
router.delete('/:id', tierLists.remove);

export default router;
