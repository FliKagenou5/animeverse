import { Router } from 'express';
import animeRoutes from './animeRoutes.js';
import authRoutes from './authRoutes.js';
import battleRoutes from './battleRoutes.js';
import characterRoutes from './characterRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import galleryRoutes from './galleryRoutes.js';
import tierListRoutes from './tierListRoutes.js';
import tierRoutes from './tierRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/characters', characterRoutes);
router.use('/anime', animeRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/battles', battleRoutes);
router.use('/tier-lists', tierListRoutes);
router.use('/tiers', tierRoutes);
router.use('/gallery', galleryRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
