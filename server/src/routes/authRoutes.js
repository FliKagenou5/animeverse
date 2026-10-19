import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimits.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', me);

export default router;
