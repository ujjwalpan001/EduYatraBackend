// backend/routes/contentRoutes.js
import express from 'express';
const router = express.Router();
import * as contentController from '../controllers/contentController.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

// All routes require admin authentication
router.use(authenticateToken);
router.use(authenticateAdmin);

// ==================== SLIDERS ====================
router.get('/sliders', contentController.listSliders);
router.post('/sliders', contentController.createSlider);
router.put('/sliders/:sliderId', contentController.updateSlider);
router.delete('/sliders/:sliderId', contentController.deleteSlider);

// ==================== POSTERS ====================
router.get('/posters', contentController.listPosters);
router.post('/posters', contentController.createPoster);
router.put('/posters/:posterId', contentController.updatePoster);
router.delete('/posters/:posterId', contentController.deletePoster);

// ==================== ADVERTISEMENTS ====================
router.get('/ads', contentController.listAds);
router.post('/ads', contentController.createAd);
router.put('/ads/:adId', contentController.updateAd);
router.delete('/ads/:adId', contentController.deleteAd);

// ==================== STATISTICS ====================
router.get('/stats', contentController.getContentStats);

export default router;
