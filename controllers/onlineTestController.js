import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Class from '../models/Class.js'; // Import Class model
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import Course from '../models/Course.js'; // Ensure Course model exists
export const getAssignedExams = async (req, res) => {
  try {
    const { user } = req; // From auth middleware
    if (!user || user.role !== 'student') {
      console.log('Unauthorized access attempt:', { userId: user?.id, role: user?.role });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Find classes where the student is enrolled (by email)
    const classes = await Class.find({
      'students.email': user.email,
      deleted_at: null,
    }).select('_id class_name');

    if (!classes.length) {
      console.log(`No classes found for student email: ${user.email}`);
      return res.status(200).json({ success: true, exams: [] });
    }

    const classIds = classes.map(cls => cls._id);

    // Find exams assigned to these classes
    const exams = await Exam.find({
      class_id: { $in: classIds },
      is_published: true, // Only show published exams
      deleted_at: null,
    }).select('_id title duration_minutes number_of_questions_per_set description start_time end_time');

    console.log(`Fetched ${exams.length} exams for student ${user.email}:`, exams);

    const formattedExams = exams.map(exam => {
      const now = new Date();
      const endTime = new Date(exam.end_time);
      const timeRemainingMs = endTime - now;
      const timeRemaining = timeRemainingMs > 0
        ? `${Math.ceil(timeRemainingMs / (1000 * 60 * 60))} hours`
        : 'Expired';
      const deadline = timeRemainingMs > 0
        ? `${Math.ceil(timeRemainingMs / (1000 * 60 * 24))} days left`
        : 'Expired';
      const progress = 0; // Placeholder: Calculate based on student submissions if implemented

      return {
        _id: exam._id,
        title: exam.title,
        instructor: 'Unknown', // Replace with teacher name if available
        progress,
        deadline,
        totalQuestions: exam.number_of_questions_per_set || 1,
        completedQuestions: 0, // Placeholder: Update if tracking completions
        timeRemaining,
        category: 'Unknown', // Add category field to Exam model if needed
      };
    });

    return res.status(200).json({ success: true, exams: formattedExams });
  } catch (error) {
    console.error('❌ Error fetching assigned exams:', error);
    return res.status(500).json({ success: false, error: `Failed to fetch exams: ${error.message}` });
  }
};
export const getCourses = async (req, res) => {
  console.log('Fetching courses...', { path: req.path, params: req.params });
  try {
    const courses = await Course.find({ deleted_at: null }).select('_id course_code name');
    if (!courses || courses.length === 0) {
      console.log('No courses found in database');
      return res.status(200).json({ success: true, courses: [] });
    }
    console.log('Courses fetched:', courses);
    res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error("❌ Error fetching courses:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createExam = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers or admins can create exams' });
    }

    const {
      title,
      description,
      class_id,
      question_bank_id,
      question_ids,
      number_of_sets,
      number_of_questions_per_set,
      duration_minutes,
      start_time,
      end_time,
      is_published,
      allow_review,
      shuffle_questions,
      shuffle_options,
      security_settings
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "Title is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(class_id)) {
      return res.status(400).json({ success: false, error: "Invalid class ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(question_bank_id)) {
      return res.status(400).json({ success: false, error: "Invalid question bank ID" });
    }
    if (!duration_minutes || duration_minutes < 5 || duration_minutes > 240) {
      return res.status(400).json({ success: false, error: "Duration must be between 5 and 240 minutes" });
    }
    if (start_time && isNaN(new Date(start_time).getTime())) {
      return res.status(400).json({ success: false, error: "Invalid start time" });
    }
    if (end_time && isNaN(new Date(end_time).getTime())) {
      return res.status(400).json({ success: false, error: "Invalid end time" });
    }
    if (!number_of_sets || number_of_sets < 1) {
      return res.status(400).json({ success: false, error: "Number of sets must be at least 1" });
    }
    if (!number_of_questions_per_set || number_of_questions_per_set < 1) {
      return res.status(400).json({ success: false, error: "Number of questions per set must be at least 1" });
    }
    if (question_ids && !Array.isArray(question_ids)) {
      return res.status(400).json({ success: false, error: "question_ids must be an array" });
    }
    if (question_ids) {
      for (const id of question_ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, error: `Invalid question ID: ${id}` });
        }
      }
    }

 const newExam = new Exam({
      title,
      description,
      class_id,
      teacher_id: user.id,
      question_bank_id,
      question_ids: question_ids || [],
      number_of_sets,
      number_of_questions_per_set,
      duration_minutes,
      start_time: start_time ? new Date(start_time) : undefined,
      end_time: end_time ? new Date(end_time) : undefined,
      is_published: is_published || false,
      allow_review: allow_review || false,
      shuffle_questions: shuffle_questions || false,
      shuffle_options: shuffle_options || false,
      security_settings: security_settings || {
        disableTabSwitching: true,
        disableRightClick: true,
        enableScreenSharing: false,
        enableProctoring: false,
        enableWebcam: false,
        restrictIP: false
      },
      updated_at: new Date()
    });

    const savedExam = await newExam.save();
    res.status(201).json({ success: true, exam: savedExam });
  } catch (error) {
    console.error("❌ Error creating exam:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find({ deleted_at: null }); // Added deleted_at filter
    res.status(200).json({ success: true, exams });
  } catch (error) {
    console.error("❌ Error fetching exams:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getExamById = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers or admins can view exam details' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const exam = await Exam.findOne({ _id: id, teacher_id: user.id, deleted_at: null }).select('-__v');
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }
    res.status(200).json({ success: true, exam });
  } catch (error) {
    console.error("❌ Error fetching exam:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
export const updateExam = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers or admins can update exams' });
    }
    const { title, duration_minutes, number_of_sets, number_of_questions_per_set, description } = req.body;
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, teacher_id: user.id, deleted_at: null },
      { title, duration_minutes, number_of_sets, number_of_questions_per_set, description, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({ success: false, error: "Exam not found" });
    }
    res.status(200).json({ success: true, exam });
  } catch (error) {
    console.error("❌ Error updating exam:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSecuritySettings = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers or admins can update security settings' });
    }
    const securitySettings = req.body;
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, teacher_id: user.id, deleted_at: null },
      { security_settings: securitySettings, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({ success: false, error: "Exam not found" });
    }
    res.status(200).json({ success: true, exam });
  } catch (error) {
    console.error("❌ Error updating security settings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const assignGroup = async (req, res) => {
  try {
    const { id } = req.params; // Exam ID
    const { groupId } = req.body; // Class ID
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    const exam = await Exam.findOne({ _id: id, deleted_at: null });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });
    const classDoc = await Class.findOne({ _id: groupId, deleted_at: null });
    if (!classDoc) return res.status(404).json({ success: false, error: 'Class not found' });
    exam.class_id = groupId;
    exam.is_published = true;
    await exam.save();
    console.log(`Exam ${id} assigned to class ${groupId}, is_published: ${exam.is_published}`);
    res.status(200).json({ success: true, message: 'Class assigned successfully', exam });
  } catch (error) {
    console.error("❌ Error assigning class:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const scheduleExam = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers or admins can schedule exams' });
    }
    const { startTime, endTime } = req.body;
    if (isNaN(new Date(startTime).getTime()) || isNaN(new Date(endTime).getTime())) {
      return res.status(400).json({ success: false, error: "Invalid start or end time" });
    }
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, teacher_id: user.id, deleted_at: null },
      { start_time: new Date(startTime), end_time: new Date(endTime), status: 'Scheduled', updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({ success: false, error: "Exam not found" });
    }
    res.status(200).json({ success: true, exam });
  } catch (error) {
    console.error("❌ Error scheduling exam:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getExamQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const exam = await Exam.findOne({ _id: id, deleted_at: null });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Verify user access
    if (user.role === 'student') {
      const classDoc = await Class.findOne({
        _id: exam.class_id,
        'students.email': user.email,
        deleted_at: null,
      });
      if (!classDoc) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Not enrolled in this exam' });
      }
      if (!exam.is_published) {
        return res.status(403).json({ success: false, error: 'Exam is not published' });
      }
      const now = new Date();
      if (exam.start_time && now < new Date(exam.start_time)) {
        return res.status(403).json({ success: false, error: 'Exam has not started yet' });
      }
      if (exam.end_time && now > new Date(exam.end_time)) {
        return res.status(403).json({ success: false, error: 'Exam has expired' });
      }
    } else if (user.role !== 'admin' && exam.teacher_id.toString() !== user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Not the exam owner' });
    }

    const questions = await Question.find({
      _id: { $in: exam.question_ids },
      question_bank_id: exam.question_bank_id,
      deleted_at: null,
    }).select('latex_code correct_option_latex incorrect_option_latex subject difficulty_rating');

    if (!questions.length) {
      return res.status(404).json({ success: false, error: 'No questions found for this exam' });
    }

    const formattedQuestions = questions.map(q => ({
      id: q._id.toString(),
      text: q.latex_code,
      options: [...q.incorrect_option_latex, q.correct_option_latex].sort(() => Math.random() - 0.5), // Shuffle options
      correctAnswer: q.correct_option_latex,
      subject: q.subject,
      difficulty_rating: q.difficulty_rating,
    }));

    res.status(200).json({ success: true, questions: formattedQuestions });
  } catch (error) {
    console.error('Error fetching exam questions:', error);
    res.status(500).json({ success: false, error: `Server error: ${error.message}` });
  }
};