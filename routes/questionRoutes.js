import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createQuestion, updateQuestion } from '../controllers/questionController.js'; // Adjust imports as needed

const router = express.Router();

router.post('/', authenticateToken, createQuestion); // Keep if you need to create questions
router.put('/:questionId', authenticateToken, updateQuestion); // Update a question

export default router;