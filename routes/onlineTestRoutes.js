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
  getExamQuestions, // Include missing import
  regenerateQuestionSets,
  getQuestionSetsDebug,
  submitTest,
  getAttendedTests,
  getStudentPerformance
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
router.get('/attended-tests', authenticateToken, getAttendedTests); // IMPORTANT: Must be before /:id route
router.get('/student-performance', authenticateToken, getStudentPerformance); // Student performance stats

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

// Test submission endpoints - MUST be before dynamic routes
router.post('/submit-test', authenticateToken, submitTest);

// Dynamic routes after static routes
router.post('/create', authenticateToken, createExam);
router.get('/all', authenticateToken, getAllExams);
router.get('/:id', authenticateToken, getExamById);
router.patch('/:id', authenticateToken, updateExam);
router.patch('/:id/security', authenticateToken, updateSecuritySettings);
router.post('/:id/assign-group', authenticateToken, assignGroup);
router.patch('/:id/schedule', authenticateToken, scheduleExam);
router.post('/:id/regenerate-sets', authenticateToken, regenerateQuestionSets); // Add regenerate endpoint
router.get('/:id/debug-sets', authenticateToken, getQuestionSetsDebug); // Debug endpoint
router.get('/:id/test-save', authenticateToken, async (req, res) => {
  // Test endpoint to verify QuestionSetQuestion can save
  try {
    const QuestionSetQuestion = (await import('../models/QuestionSetQues.js')).default;
    const QuestionSet = (await import('../models/QuestionSet.js')).default;
    
    console.log('\n🧪 TEST SAVE ENDPOINT CALLED');
    console.log(`   QuestionSet collection: ${QuestionSet.collection.name}`);
    console.log(`   QuestionSetQuestion collection: ${QuestionSetQuestion.collection.name}`);
    
    // Count existing documents
    const setCount = await QuestionSet.countDocuments();
    const questionCount = await QuestionSetQuestion.countDocuments();
    
    console.log(`   Existing QuestionSets: ${setCount}`);
    console.log(`   Existing QuestionSetQuestions: ${questionCount}`);
    
    // Check raw collections
    const db = mongoose.connection.db;
    const rawSets = await db.collection('questionsets').countDocuments();
    const rawQuestions = await db.collection('questionsetsquestion').countDocuments();
    
    console.log(`   Raw 'questionsets': ${rawSets}`);
    console.log(`   Raw 'questionsetsquestion': ${rawQuestions}`);
    
    res.json({
      success: true,
      collections: {
        questionSetModel: QuestionSet.collection.name,
        questionSetQuestionModel: QuestionSetQuestion.collection.name
      },
      counts: {
        modelQuestionSets: setCount,
        modelQuestionSetQuestions: questionCount,
        rawQuestionSets: rawSets,
        rawQuestionSetQuestions: rawQuestions
      }
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/:id/questions', authenticateToken, getExamQuestions); // Add missing route

export default router;