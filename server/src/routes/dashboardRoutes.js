import { Router } from 'express';
import * as dashboard from '../controllers/dashboardController.js';

const router = Router();

router.get('/stats', dashboard.stats);

export default router;
