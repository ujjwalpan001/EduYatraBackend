import express from 'express';
import mongoose from 'mongoose';
import { 
  createExam, 
  getAllExams, 
  getExamById, 
  updateExam, 
  updateSecuritySettings, 
  assignGroup, 
  scheduleExam,
  getExamQuestions // Include missing import
} from '../controllers/onlineTestController.js';
import { authenticateToken } from '../middleware/auth.js';
import Class from '../models/Class.js';
import Question from '../models/Question.js';
import QuestionBank from '../models/QuestionBank.js';
import { getInstitutes, getCourses } from '../controllers/questionController.js';

import { getAssignedExams } from '../controllers/onlineTestController.js';

const router = express.Router();

// Static routes first
router.get('/institutes', authenticateToken, getInstitutes); // Already fixed
router.get('/courses', authenticateToken, getCourses); // Add courses route
router.get('/question-banks', authenticateToken, async (req, res) => {
  console.log('Fetching question banks...', { path: req.path, params: req.params });
  try {
    const questionBanks = await QuestionBank.find({ deleted_at: null }).select('_id name');
    console.log('Question banks fetched:', questionBanks);
    res.status(200).json({ success: true, questionBanks });
  } catch (error) {
    console.error("❌ Error fetching question banks:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/assigned', authenticateToken, getAssignedExams);

router.get('/groups', authenticateToken, async (req, res) => {
  console.log('Fetching classes...', { path: req.path, params: req.params });
  try {
    const classes = await Class.find({ deleted_at: null }).select('_id class_name');
    res.status(200).json({ success: true, classes });
  } catch (error) {
    console.error("❌ Error fetching classes:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/questions', authenticateToken, async (req, res) => {
  console.log('Fetching questions...', { path: req.path, params: req.params, query: req.query });
  try {
    const { questionBankId } = req.query;
    if (!questionBankId || !mongoose.Types.ObjectId.isValid(questionBankId)) {
      return res.status(400).json({ success: false, error: 'Valid questionBankId is required' });
    }
    const questions = await Question.find({ question_bank_id: questionBankId, deleted_at: null })
      .select('_id latex_code question_type difficulty_rating');
    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error("❌ Error fetching questions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dynamic routes after static routes
router.post('/create', authenticateToken, createExam);
router.get('/all', authenticateToken, getAllExams);
router.get('/:id', authenticateToken, getExamById);
router.patch('/:id', authenticateToken, updateExam);
router.patch('/:id/security', authenticateToken, updateSecuritySettings);
router.post('/:id/assign-group', authenticateToken, assignGroup);
router.patch('/:id/schedule', authenticateToken, scheduleExam);
router.get('/:id/questions', authenticateToken, getExamQuestions); // Add missing route

export default router;