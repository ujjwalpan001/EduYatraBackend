import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createQuestion, updateQuestion, getQuestionAnalytics } from '../controllers/questionController.js'; // Adjust imports as needed

const router = express.Router();

router.post('/', authenticateToken, createQuestion); // Keep if you need to create questions
router.put('/:questionId', authenticateToken, updateQuestion); // Update a question
router.get('/analytics', authenticateToken, getQuestionAnalytics); // Get all question analytics
router.get('/analytics/:questionBankId', authenticateToken, getQuestionAnalytics); // Get question analytics by bank

export default router;