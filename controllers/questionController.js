import mongoose from 'mongoose';
import Question from '../models/Question.js';
import User from '../models/User.js';
import QuestionBank from '../models/QuestionBank.js';
import Course from '../models/Course.js';
import Institute from '../models/Institute.js';

const getValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
};

export const createQuestion = async (req, res) => {
  try {
    const {
      latex_code,
      katex_code,
      correct_option_latex,
      correct_option_katex,
      incorrect_option_latex,
      incorrect_option_katex,
      level,
      image = "",
      question_type,
      topic,
      Sub_topic = "",
      bloom_level = "",
      solution_latex = "",
      katex_solution = "",
      subject,
      question_stats = {},
      courseCode,
      instituteName,
      visibility,
      questionBankName,
      difficulty_rating = 0,
      updated_at = new Date()
    } = req.body;

    // Validate required fields
    if (!latex_code || !katex_code || !correct_option_latex || !correct_option_katex || !question_type || !subject) {
      return res.status(400).json({ success: false, error: "Missing required question fields" });
    }
    if (!questionBankName || !questionBankName.trim()) {
      return res.status(400).json({ success: false, error: "Question bank name is required" });
    }
    if (!courseCode || !courseCode.trim()) {
      return res.status(400).json({ success: false, error: "Course code is required" });
    }
    if (!instituteName || !instituteName.trim()) {
      return res.status(400).json({ success: false, error: "Institute name is required" });
    }

    // Use authenticated user ID
    const userId = req.user.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Invalid user authentication" });
    }

    // Step 1: Ensure User exists (should already exist from login, but verify)
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "Authenticated user not found" });
    }

    // Step 2: Handle QuestionBank by name
    let questionBank = await QuestionBank.findOne({ name: questionBankName, deleted_at: null });
    let questionBankId;
    if (!questionBank) {
      const newQuestionBank = new QuestionBank({
        name: questionBankName,
        created_by: userId,
        visibility: visibility || 'private'
      });
      const savedBank = await newQuestionBank.save();
      questionBankId = savedBank._id;
    } else {
      questionBankId = questionBank._id;
    }

    // Step 3: Handle Course by courseCode
    let course = await Course.findOne({ course_code: courseCode, deleted_at: null });
    let courseId;
    if (!course) {
      const newCourse = new Course({
        name: `Course ${courseCode}`,
        course_code: courseCode,
        description: ''
      });
      const savedCourse = await newCourse.save();
      courseId = savedCourse._id;
    } else {
      courseId = course._id;
    }

    // Step 4: Handle Institute by name
    let institute = await Institute.findOne({ name: instituteName, deleted_at: null });
    let instituteId;
    if (!institute) {
      const newInstitute = new Institute({
        name: instituteName,
        location: ''
      });
      const savedInstitute = await newInstitute.save();
      instituteId = savedInstitute._id;
    } else {
      instituteId = institute._id;
    }

    // Step 5: Create and Save the Question
    const newQuestion = new Question({
      latex_code,
      katex_code,
      level,
      image,
      uploaded_by: userId,
      created_by: userId,
      question_type,
      correct_option_latex,
      correct_option_katex,
      incorrect_option_latex,
      incorrect_option_katex,
      topic,
      Sub_topic,
      bloom_level,
      solution_latex,
      katex_solution,
      subject,
      question_stats,
      course_id: courseId,
      institute_id: instituteId,
      question_bank_id: questionBankId,
      visibility: visibility || 'public',
      difficulty_rating,
      updated_at
    });

    const savedQuestion = await newQuestion.save();
    res.status(201).json({ success: true, question: savedQuestion });
  } catch (error) {
    console.error("❌ Error creating question:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getQuestionBanks = async (req, res) => {
  try {
    const questionBanks = await QuestionBank.find({ deleted_at: null }).select('name');
    res.status(200).json({ success: true, questionBanks });
  } catch (err) {
    console.error("❌ Error fetching question banks:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ deleted_at: null }).select('course_code name');
    res.status(200).json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching courses' });
  }
};

export const getInstitutes = async (req, res) => {
  try {
    console.log("📥 API Call: GET /api/exams/institutes");

    const institutes = await Institute.find({
      $or: [
        { deleted_at: null },
        { deleted_at: { $exists: false } }
      ]
    }).select('name');

    console.log("✅ Fetched institutes:", institutes);

    res.status(200).json({ success: true, institutes });
  } catch (err) {
    console.error("❌ Error in getInstitutes:", err.message);
    res.status(500).json({ success: false, message: 'Error fetching institutes' });
  }
};


export const getQuestionsByQuestionBank = async (req, res) => {
  try {
    const { questionBankId } = req.query;

    if (!questionBankId || !mongoose.Types.ObjectId.isValid(questionBankId)) {
      return res.status(400).json({ success: false, error: "Valid questionBankId is required" });
    }

    const questions = await Question.find({ question_bank_id: questionBankId, deleted_at: null })
      .select('_id latex_code question_type difficulty_rating');

    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error("❌ Error fetching questions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};