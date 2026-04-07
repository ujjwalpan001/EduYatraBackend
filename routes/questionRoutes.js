import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
	createQuestion,
	updateQuestion,
	getQuestionAnalytics,
	getQuestionBanks,
	getCourses,
	getInstitutes,
} from '../controllers/questionController.js';

const router = express.Router();

router.post('/', authenticateToken, createQuestion); // Keep if you need to create questions
router.put('/:questionId', authenticateToken, updateQuestion); // Update a question
router.get('/analytics', authenticateToken, getQuestionAnalytics); // Get all question analytics
router.get('/analytics/:questionBankId', authenticateToken, getQuestionAnalytics); // Get question analytics by bank
router.get('/questionBanks', authenticateToken, getQuestionBanks);
router.get('/courses', authenticateToken, getCourses);
router.get('/institutes', authenticateToken, getInstitutes);

export default router;