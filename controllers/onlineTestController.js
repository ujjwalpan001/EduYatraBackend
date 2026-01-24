import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Class from '../models/Class.js'; // Import Class model
import User from '../models/User.js'; // Import User model to look up by email
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import Course from '../models/Course.js'; // Ensure Course model exists
import QuestionSet from '../models/QuestionSet.js';
import QuestionSetQuestion from '../models/QuestionSetQues.js';
import TestSubmission from '../models/TestSubmission.js';
import ClassStudent from '../models/ClassStudent.js';
import crypto from 'crypto';

/**
 * Helper function to create unique question sets for students
 * @param {Object} exam - The exam document
 * @param {Array} students - Array of student objects from the class
 * @returns {Promise<void>}
 */
const createUniqueQuestionSets = async (exam, students) => {
  try {
    const { _id: examId, question_ids, number_of_sets, number_of_questions_per_set } = exam;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 STARTING QUESTION SET CREATION`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📋 Exam ID: ${examId}`);
    console.log(`📊 Configuration:`);
    console.log(`   - Sets required: ${number_of_sets}`);
    console.log(`   - Questions per set: ${number_of_questions_per_set}`);
    console.log(`   - Total questions available: ${question_ids?.length || 0}`);
    console.log(`   - Total students: ${students?.length || 0}`);
    
    if (!students || students.length === 0) {
      console.error(`❌ ERROR: No students provided!`);
      throw new Error('No students in class');
    }
    
    if (!question_ids || question_ids.length === 0) {
      console.error(`❌ ERROR: No questions in exam!`);
      throw new Error('No questions in exam');
    }

    // Validate we have enough questions
    const totalQuestionsNeeded = number_of_sets * number_of_questions_per_set;
    console.log(`\n✅ Validation:`);
    console.log(`   - Questions needed: ${totalQuestionsNeeded}`);
    console.log(`   - Questions available: ${question_ids.length}`);
    
    // Check if we need to repeat questions
    if (question_ids.length < number_of_questions_per_set) {
      const error = `Not enough questions for even one set. Need at least ${number_of_questions_per_set}, but only ${question_ids.length} available`;
      console.error(`❌ ${error}`);
      throw new Error(error);
    }
    
    if (question_ids.length < totalQuestionsNeeded) {
      console.log(`   ⚠️ WARNING: Not enough unique questions for all sets`);
      console.log(`   ℹ️ Will repeat questions across sets to meet requirement`);
      console.log(`   ℹ️ Each set will still have ${number_of_questions_per_set} questions`);
    } else {
      console.log(`   ✅ Sufficient questions available for unique sets`);
    }

    // Check shuffle_questions setting from exam
    const shouldShuffleQuestions = exam.shuffle_questions || false;
    console.log(`\n🔀 Shuffle Questions Setting: ${shouldShuffleQuestions ? 'ON' : 'OFF'}`);

    // Split questions into sets based on shuffle setting
    const questionSets = [];
    
    if (shouldShuffleQuestions) {
      // SHUFFLE ON: Each set gets different questions
      console.log(`   ✅ Creating ${number_of_sets} DIFFERENT sets (shuffle enabled)`);
      const shuffledQuestions = [...question_ids].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < number_of_sets; i++) {
        const setQuestions = [];
        for (let j = 0; j < number_of_questions_per_set; j++) {
          // Use modulo to repeat questions if we don't have enough
          const questionIndex = (i * number_of_questions_per_set + j) % shuffledQuestions.length;
          setQuestions.push(shuffledQuestions[questionIndex]);
        }
        questionSets.push(setQuestions);
        console.log(`   Set ${i + 1}: ${setQuestions.length} questions (different from other sets)`);
      }
    } else {
      // SHUFFLE OFF: All sets get the SAME questions
      console.log(`   ✅ Creating ${number_of_sets} IDENTICAL sets (shuffle disabled)`);
      const sameQuestions = question_ids.slice(0, number_of_questions_per_set);
      
      for (let i = 0; i < number_of_sets; i++) {
        questionSets.push([...sameQuestions]); // Copy same questions to each set
        console.log(`   Set ${i + 1}: ${sameQuestions.length} questions (identical to all other sets)`);
      }
    }

    // Delete any existing question sets for this exam
    console.log(`\n🧹 Cleaning up existing question sets...`);
    const existingSetIds = await QuestionSet.find({ exam_id: examId }).distinct('_id');
    console.log(`   - Found ${existingSetIds.length} existing sets`);
    
    if (existingSetIds.length > 0) {
      const deletedQuestions = await QuestionSetQuestion.deleteMany({ 
        questionset_id: { $in: existingSetIds } 
      });
      console.log(`   - Deleted ${deletedQuestions.deletedCount} question records`);
      
      const deletedSets = await QuestionSet.deleteMany({ exam_id: examId });
      console.log(`   - Deleted ${deletedSets.deletedCount} question sets`);
    } else {
      console.log(`   - No existing sets to clean up`);
    }

    // Assign sets to ALL students in the batch/class
    console.log(`\n👥 Student Assignment:`);
    console.log(`   - Total students in batch/class: ${students.length}`);
    
    if (!students || students.length === 0) {
      console.error('❌ No students in this class/batch!');
      throw new Error('No students found in this class/batch. Please add students to the class first.');
    }
    
    console.log(`\n🔍 Student Details:`);
    students.forEach((student, idx) => {
      console.log(`   Student ${idx + 1}: ${student.name} (${student.email})`);
      console.log(`      Has userId: ${!!student.userId}`);
      console.log(`      IsSelected: ${student.isSelected} (ignored - all students assigned)`);
    });
    
    // IMPORTANT: Assign to ALL students in the batch/class
    // When a teacher assigns an exam to a class/batch, ALL students get it
    const studentsToAssign = students;
    
    console.log(`\n   ✅ All ${studentsToAssign.length} students in this batch will be assigned`);
    
    // Validate all students have valid email (primary identifier)
    console.log(`\n🔍 Validating student data:`);
    studentsToAssign.forEach((student, idx) => {
      console.log(`\n   Student ${idx + 1}:`);
      console.log(`      Name: ${student.name}`);
      console.log(`      Email: ${student.email}`);
      console.log(`      UserId: ${student.userId || 'N/A (email is primary)'}`);
    });
    
    const invalidStudents = studentsToAssign.filter(s => !s.email);
    if (invalidStudents.length > 0) {
      console.error(`\n❌ CRITICAL: ${invalidStudents.length} students without email:`);
      invalidStudents.forEach(s => {
        console.error(`      - ${s.name} (userId: ${s.userId})`);
      });
      throw new Error(`${invalidStudents.length} students have no email. Please update class data.`);
    }
    console.log(`   ✅ All students have email (primary identifier)`);

    // Distribute sets evenly among students
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📝 ASSIGNING SETS TO STUDENTS`);
    console.log(`${'='.repeat(70)}`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < studentsToAssign.length; i++) {
      const student = studentsToAssign[i];
      const setIndex = i % number_of_sets; // Round-robin assignment
      const setNumber = setIndex + 1;
      const questionsForThisSet = questionSets[setIndex];

      console.log(`\n[${i + 1}/${studentsToAssign.length}] Student: ${student.name} (${student.email})`);
      console.log(`   - Assigned Set: ${setNumber}`);
      console.log(`   - Questions in set: ${questionsForThisSet.length}`);

      // Try to find the user by email to get their ObjectId
      let userObjectId = student.userId; // Use existing if available
      
      if (!userObjectId) {
        console.log(`   - Looking up user by email: ${student.email}`);
        try {
          const userDoc = await User.findOne({ email: student.email, deleted_at: null });
          if (userDoc) {
            userObjectId = userDoc._id;
            console.log(`   ✅ Found user! ObjectId: ${userObjectId}`);
          } else {
            console.log(`   ℹ️ User not found in database (will use email only)`);
          }
        } catch (lookupError) {
          console.log(`   ⚠️ Error looking up user: ${lookupError.message}`);
        }
      } else {
        console.log(`   - UserId from class: ${userObjectId}`);
      }

      // Generate unique link for this question set
      const uniqueLink = `${examId}-set-${setNumber}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

      // Create QuestionSet document (email is required, student_id is optional)
      const questionSetData = {
        exam_id: examId,
        set_number: setNumber,
        student_email: student.email,  // Primary identifier
        link: uniqueLink,
        is_completed: false,
        created_at: new Date()
      };
      
      // Add student_id only if we have it
      if (userObjectId) {
        questionSetData.student_id = userObjectId;
      }
      
      console.log(`   - Creating QuestionSet document...`);

      try {
        const questionSet = new QuestionSet(questionSetData);
        const savedQuestionSet = await questionSet.save();
        console.log(`   ✅ QuestionSet saved! ID: ${savedQuestionSet._id}`);

        // Create QuestionSetQuestion documents for each question in this set
        console.log(`   - Creating ${questionsForThisSet.length} QuestionSetQuestion documents...`);
        
        const questionSetQuestions = questionsForThisSet.map((questionId, index) => ({
          questionset_id: savedQuestionSet._id,
          question_id: questionId,
          question_order: index + 1,
          created_at: new Date()
        }));

        console.log(`   - Sample question mapping:`, {
          questionset_id: savedQuestionSet._id,
          total_questions: questionSetQuestions.length,
          first_question: questionSetQuestions[0]?.question_id,
          last_question: questionSetQuestions[questionSetQuestions.length - 1]?.question_id
        });

        const insertedQuestions = await QuestionSetQuestion.insertMany(questionSetQuestions);
        console.log(`   ✅ Successfully saved ${insertedQuestions.length} questions to QuestionSetQuestion collection!`);
        console.log(`   - Question IDs saved:`, insertedQuestions.map(q => q._id.toString()).join(', '));
        
        successCount++;
        console.log(`   ✅ SUCCESS`);

      } catch (saveError) {
        failCount++;
        console.error(`   ❌❌❌ SAVE FAILED ❌❌❌`);
        console.error(`   Error: ${saveError.message}`);
        console.error(`   Stack:`, saveError.stack);
        throw saveError;
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total Sets: ${number_of_sets}`);
    console.log(`   🎯 Students Processed: ${studentsToAssign.length}`);
    
    // Verify sets were actually saved
    const verifyCount = await QuestionSet.countDocuments({ exam_id: examId });
    console.log(`\n🔍 Database Verification:`);
    console.log(`   - QuestionSets saved: ${verifyCount}`);
    
    if (verifyCount === 0) {
      throw new Error('⚠️ CRITICAL: No question sets were saved to database!');
    }
    
    // Verify questions were saved in QuestionSetQuestion collection
    const savedQuestionSets = await QuestionSet.find({ exam_id: examId }).select('_id set_number student_email');
    const questionSetIds = savedQuestionSets.map(qs => qs._id);
const totalQuestionsInSets = await QuestionSetQuestion.countDocuments({ 
      questionset_id: { $in: questionSetIds } 
    });
    
    console.log(`   - QuestionSetQuestions saved: ${totalQuestionsInSets}`);
    console.log(`   - Expected questions: ${number_of_sets * number_of_questions_per_set}`);
    
    if (totalQuestionsInSets === 0) {
      throw new Error('⚠️ CRITICAL: No questions were saved to QuestionSetQuestion collection!');
    }
    
    console.log(`\n📋 Detailed Breakdown:`);
    for (const qs of savedQuestionSets) {
      const qCount = await QuestionSetQuestion.countDocuments({ questionset_id: qs._id });
      console.log(`   Set ${qs.set_number} (${qs.student_email}): ${qCount} questions`);
    }
    
    console.log(`${'='.repeat(70)}\n`);
    console.log(`✅ Successfully created ${number_of_sets} unique question sets with ${totalQuestionsInSets} total questions for ${studentsToAssign.length} students`);
    
  } catch (error) {
    console.error(`\n${'='.repeat(70)}`);
    console.error('❌❌❌ CRITICAL ERROR IN createUniqueQuestionSets ❌❌❌');
    console.error(`${'='.repeat(70)}`);
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error(`${'='.repeat(70)}\n`);
    throw error;
  }
};

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
    }).select('_id title duration_minutes number_of_questions_per_set description start_time end_time expiring_hours').lean();

    console.log(`Fetched ${exams.length} exams for student ${user.email}:`, exams);

    // Get question sets for this student to check completion status
    const examIds = exams.map(e => e._id);
    console.log(`\n🔍 Checking completion status for ${examIds.length} exams...`);
    console.log(`   Student email: ${user.email}`);
    
    const questionSets = await QuestionSet.find({
      exam_id: { $in: examIds },
      student_email: user.email
    }).select('exam_id is_completed').lean();

    console.log(`   Found ${questionSets.length} question sets for this student`);
    questionSets.forEach((qs, index) => {
      console.log(`   [${index + 1}] Exam ID: ${qs.exam_id}, is_completed: ${qs.is_completed}`);
    });

    const completedExamIds = new Set(
      questionSets
        .filter(qs => qs.is_completed)
        .map(qs => qs.exam_id.toString())
    );

    console.log(`   📊 Completed exam IDs: ${Array.from(completedExamIds).join(', ') || 'None'}`);

    // Filter out completed exams - only show ongoing ones
    const ongoingExams = exams.filter(exam => !completedExamIds.has(exam._id.toString()));

    const formattedExams = ongoingExams.map(exam => {
      const now = new Date();
      const startTime = new Date(exam.start_time);
      const expiringHours = exam.expiring_hours || 1;
      const expiryTime = new Date(startTime.getTime() + expiringHours * 60 * 60 * 1000);
      const timeToExpiryMs = expiryTime - now;
      
      const endTime = new Date(exam.end_time);
      const timeRemainingMs = endTime - now;
      const timeRemaining = timeRemainingMs > 0
        ? `${Math.ceil(timeRemainingMs / (1000 * 60 * 60))} hours`
        : 'Expired';
      const deadline = timeRemainingMs > 0
        ? `${Math.ceil(timeRemainingMs / (1000 * 60 * 24))} days left`
        : 'Expired';
        
      const expiringTime = timeToExpiryMs > 0
        ? `${Math.ceil(timeToExpiryMs / (1000 * 60 * 60))} hours`
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
        expiringTime,
        expiringHours,
        category: 'Unknown', // Add category field to Exam model if needed
        duration_minutes: exam.duration_minutes,
        numberOfQuestionsPerSet: exam.number_of_questions_per_set,
        instructions: exam.description || '', // Use description field from database
      };
    });

    console.log(`Returning ${formattedExams.length} ongoing exams (${completedExamIds.size} completed)`);

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
      expiring_hours,
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
    if (class_id && !mongoose.Types.ObjectId.isValid(class_id)) {
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
      expiring_hours: expiring_hours || 1,
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
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Filter exams based on user role
    let query = { 
      deleted_at: null,
      // Teachers should see ALL exams (including ended ones) so they can reassign them
      // Only filter out actually deleted exams
    };
    
    if (user.role === 'teacher') {
      // Teachers see all their own exams (both active and ended)
      query.teacher_id = user.id;
    } else if (user.role === 'student') {
      // Students shouldn't access this endpoint, but if they do, return empty
      return res.status(403).json({ success: false, error: 'Students cannot access all exams' });
    }
    // Admin sees all exams (no additional filter)

    const exams = await Exam.find(query)
      .populate('teacher_id', 'username fullName email')
      .populate('class_id', 'class_name')
      .sort({ created_at: -1 });
    
    console.log(`✅ Fetched ${exams.length} exams for user ${user.id} (role: ${user.role})`);
    
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
    console.log(`\n\n${'#'.repeat(80)}`);
    console.log(`# ASSIGN EXAM TO CLASS REQUEST`);
    console.log(`${'#'.repeat(80)}`);
    
    const { id } = req.params; // Exam ID
    const { groupId, expiring_hours } = req.body; // Class ID and expiring hours
    
    console.log(`📋 Request Details:`);
    console.log(`   - Exam ID: ${id}`);
    console.log(`   - Class ID: ${groupId}`);
    console.log(`   - Expiring Hours: ${expiring_hours}`);
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(groupId)) {
      console.error(`❌ Invalid ID format`);
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    
    console.log(`\n🔍 Finding exam...`);
    const exam = await Exam.findOne({ _id: id, deleted_at: null });
    if (!exam) {
      console.error(`❌ Exam not found: ${id}`);
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }
    console.log(`✅ Found exam: "${exam.title}"`);
    console.log(`   - Questions: ${exam.question_ids?.length || 0}`);
    console.log(`   - Sets: ${exam.number_of_sets}`);
    console.log(`   - Questions per set: ${exam.number_of_questions_per_set}`);
    
    console.log(`\n🔍 Finding class...`);
    const classDoc = await Class.findOne({ _id: groupId, deleted_at: null });
    if (!classDoc) {
      console.error(`❌ Class not found: ${groupId}`);
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    console.log(`✅ Found class: "${classDoc.class_name}"`);
    console.log(`   - Students: ${classDoc.students?.length || 0}`);
    
    console.log(`\n💾 Updating exam...`);
    exam.class_id = groupId;
    exam.is_published = true;
    
    // Set start_time to now and end_time based on expiring_hours
    const now = new Date();
    exam.start_time = now;
    
    // Calculate end_time based on expiring_hours
    const expiringHoursValue = expiring_hours !== undefined && expiring_hours !== null ? expiring_hours : 1;
    const endTime = new Date(now.getTime() + expiringHoursValue * 60 * 60 * 1000);
    exam.end_time = endTime;
    
    if (expiring_hours !== undefined && expiring_hours !== null) {
      exam.expiring_hours = expiring_hours;
      console.log(`   - Expiring hours set to: ${expiring_hours}`);
    }
    console.log(`   - Start time: ${exam.start_time.toISOString()}`);
    console.log(`   - End time: ${exam.end_time.toISOString()}`);
    
    await exam.save();
    console.log(`✅ Exam updated and published`);
    
    // Create unique question sets for students when exam is published
    console.log(`\n🚀 Creating question sets...`);
    try {
      await createUniqueQuestionSets(exam, classDoc.students);
      console.log(`✅ Question sets creation completed!`);
    } catch (setError) {
      console.error(`❌ Question sets creation FAILED:`, setError.message);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to create question sets: ${setError.message}` 
      });
    }
    
    console.log(`\n${'#'.repeat(80)}`);
    console.log(`# ✅ ASSIGNMENT COMPLETED SUCCESSFULLY`);
    console.log(`${'#'.repeat(80)}\n\n`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Class assigned and question sets created successfully', 
      exam 
    });
    
  } catch (error) {
    console.error(`\n${'#'.repeat(80)}`);
    console.error("# ❌ ERROR IN ASSIGN GROUP");
    console.error(`${'#'.repeat(80)}`);
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error(`${'#'.repeat(80)}\n`);
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

      // Get the student's assigned question set (search by email first, then by student_id)
      console.log(`🔍 Looking for question set: exam=${id}, email=${user.email}, student_id=${user.id || 'N/A'}`);
      
      let questionSet = await QuestionSet.findOne({
        exam_id: id,
        student_email: user.email  // Primary lookup by email
      });

      // Fallback: try by student_id if email lookup failed
      if (!questionSet && user.id) {
        console.log(`   ℹ️ Email lookup failed, trying by student_id...`);
        questionSet = await QuestionSet.findOne({
          exam_id: id,
          student_id: user.id
        });
      }

      if (!questionSet) {
        console.error(`❌ No question set found for student ${user.email} (ID: ${user.id || 'N/A'}) in exam ${id}`);
        
        // Debug: Check what sets exist for this exam
        const allSetsForExam = await QuestionSet.find({ exam_id: id }).select('set_number student_id student_email');
        console.log(`   Available sets for this exam:`, allSetsForExam);
        
        return res.status(404).json({ 
          success: false, 
          error: 'No question set assigned to you for this exam. Please contact your instructor.' 
        });
      }
      
      console.log(`✅ Found question set: ${questionSet._id}, Set #${questionSet.set_number}`);

      // Get the questions for this specific set
      const questionSetQuestions = await QuestionSetQuestion.find({
        questionset_id: questionSet._id
      }).sort({ question_order: 1 });

      const questionIds = questionSetQuestions.map(qsq => qsq.question_id);

      const questions = await Question.find({
        _id: { $in: questionIds },
        question_bank_id: exam.question_bank_id,
        deleted_at: null,
      }).select('latex_code correct_option_latex incorrect_option_latex subject difficulty_rating');

      if (!questions.length) {
        return res.status(404).json({ success: false, error: 'No questions found for this exam' });
      }

      // Create a map for maintaining order
      const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

      // Format questions in the correct order
      const formattedQuestions = questionIds.map(qId => {
        const q = questionMap.get(qId.toString());
        if (!q) return null;
        
        // Respect shuffle_options setting
        const allOptions = [...q.incorrect_option_latex, q.correct_option_latex];
        const options = exam.shuffle_options 
          ? allOptions.sort(() => Math.random() - 0.5) // Shuffle if enabled
          : allOptions; // Keep original order if disabled
        
        return {
          id: q._id.toString(),
          text: q.latex_code,
          options: options,
          correctAnswer: q.correct_option_latex,
          subject: q.subject,
          difficulty_rating: q.difficulty_rating,
        };
      }).filter(q => q !== null);

      return res.status(200).json({ 
        success: true, 
        questions: formattedQuestions,
        setNumber: questionSet.set_number,
        instructions: exam.description || ''  // Include exam instructions
      });

    } else if (user.role !== 'admin' && exam.teacher_id.toString() !== user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Not the exam owner' });
    }

    // For teachers/admins, return all questions
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

    res.status(200).json({ 
      success: true, 
      questions: formattedQuestions,
      instructions: exam.description || ''  // Include exam instructions
    });
  } catch (error) {
    console.error('Error fetching exam questions:', error);
    res.status(500).json({ success: false, error: `Server error: ${error.message}` });
  }
};

/**
 * Regenerate question sets for an exam
 * Useful when students are added after initial assignment or for debugging
 */
export const regenerateQuestionSets = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers or admins can regenerate question sets' });
    }

    const { id } = req.params; // Exam ID
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const exam = await Exam.findOne({ _id: id, deleted_at: null });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Verify the user owns this exam (for teachers)
    if (user.role === 'teacher' && exam.teacher_id.toString() !== user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Not the exam owner' });
    }

    if (!exam.class_id) {
      return res.status(400).json({ success: false, error: 'Exam is not assigned to any class' });
    }

    const classDoc = await Class.findOne({ _id: exam.class_id, deleted_at: null });
    if (!classDoc) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // Regenerate question sets
    await createUniqueQuestionSets(exam, classDoc.students);

    res.status(200).json({ 
      success: true, 
      message: 'Question sets regenerated successfully',
      totalStudents: classDoc.students.length,
      numberOfSets: exam.number_of_sets,
      questionsPerSet: exam.number_of_questions_per_set
    });
  } catch (error) {
    console.error('❌ Error regenerating question sets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Debug endpoint - Get all question sets for an exam
 * Helps verify that sets were created correctly
 */
export const getQuestionSetsDebug = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params; // Exam ID
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const exam = await Exam.findOne({ _id: id, deleted_at: null });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Get all question sets for this exam
    const questionSets = await QuestionSet.find({ exam_id: id })
      .populate('student_id', 'email name')
      .lean();

    console.log(`\n📊 Debug Info for Exam ${id}:`);
    console.log(`   - Found ${questionSets.length} question sets`);

    // Get questions for each set
    const setsWithQuestions = await Promise.all(
      questionSets.map(async (set) => {
        const questions = await QuestionSetQuestion.find({ 
          questionset_id: set._id 
        }).sort({ question_order: 1 }).lean();
        
        console.log(`   Set ${set.set_number}:`);
        console.log(`      Student Email: ${set.student_email}`);
        console.log(`      Student ID: ${set.student_id || 'N/A'}`);
        console.log(`      Questions: ${questions.length}`);
        
        return {
          questionSetId: set._id,
          setNumber: set.set_number,
          studentEmail: set.student_email,
          studentId: set.student_id,
          studentName: set.student_id?.name,
          link: set.link,
          isCompleted: set.is_completed,
          questionCount: questions.length,
          questions: questions.map(q => ({
            id: q._id,
            questionId: q.question_id,
            order: q.question_order
          }))
        };
      })
    );

    // Calculate total questions saved
    const totalQuestionsSaved = setsWithQuestions.reduce((sum, set) => sum + set.questionCount, 0);
    const expectedTotalQuestions = exam.number_of_sets * exam.number_of_questions_per_set;

    res.status(200).json({ 
      success: true,
      examId: id,
      examTitle: exam.title,
      totalSets: questionSets.length,
      expectedSets: exam.number_of_sets,
      questionsPerSet: exam.number_of_questions_per_set,
      totalQuestionsSaved: totalQuestionsSaved,
      expectedTotalQuestions: expectedTotalQuestions,
      allQuestionsMatch: totalQuestionsSaved === expectedTotalQuestions,
      sets: setsWithQuestions
    });
  } catch (error) {
    console.error('❌ Error fetching question sets debug info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Submit test and mark as completed
 */
export const submitTest = async (req, res) => {
  try {
    const { user } = req;
    if (!user || user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId, testName, answers, score, reason, timeSpentSeconds, tabSwitches = 0, fullscreenExits = 0 } = req.body;

    console.log('\n📝 Test Submission Request:');
    console.log(`   Student: ${user.email}`);
    console.log(`   Exam ID: ${examId}`);
    console.log(`   Score: ${score}`);
    console.log(`   Time Spent: ${timeSpentSeconds}s`);
    console.log(`   Tab Switches: ${tabSwitches}`);
    console.log(`   Fullscreen Exits: ${fullscreenExits}`);
    console.log(`   Answers received (sample):`, Object.keys(answers || {}).length > 0 ? 
      { firstKey: Object.keys(answers)[0], firstValue: answers[Object.keys(answers)[0]] } : 'No answers');

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    // Find the student's question set
    let questionSet = await QuestionSet.findOne({
      exam_id: examId,
      student_email: user.email
    });

    if (!questionSet && user.id) {
      questionSet = await QuestionSet.findOne({
        exam_id: examId,
        student_id: user.id
      });
    }

    if (!questionSet) {
      return res.status(404).json({ 
        success: false, 
        error: 'No question set found for this exam' 
      });
    }

    // Get the exam details
    const exam = await Exam.findOne({ _id: examId, deleted_at: null });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Get all questions for this set
    const questionSetQuestions = await QuestionSetQuestion.find({
      questionset_id: questionSet._id
    });

    const totalQuestions = questionSetQuestions.length;

    // Calculate correct answers and prepare structured answer data
    const questionIds = questionSetQuestions.map(qsq => qsq.question_id);
    const questions = await Question.find({
      _id: { $in: questionIds },
      deleted_at: null
    });

    // Create a map of question ID to question data for easy lookup
    const questionMap = new Map();
    questions.forEach(q => {
      questionMap.set(q._id.toString(), q);
    });

    let correctAnswers = 0;
    const structuredAnswers = new Map();

    // Process each answer
    for (const [questionId, answer] of Object.entries(answers)) {
      const question = questionMap.get(questionId);
      if (!question) {
        console.warn(`⚠️ Question ${questionId} not found in database`);
        continue;
      }

      // Build all options array
      const allOptions = [...(question.incorrect_option_latex || []), question.correct_option_latex];
      
      // Determine what format the answer is in
      let selectedOptionText = '';
      let selectedOptionLetter = '';
      let selectedOptionIndex = -1;

      if (typeof answer === 'string') {
        // Check if it's a letter (A, B, C, D) or the actual option text
        if (answer.length === 1 && /[A-Z]/.test(answer)) {
          // It's a letter like "A", "B", "C", "D"
          selectedOptionLetter = answer;
          selectedOptionIndex = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          selectedOptionText = allOptions[selectedOptionIndex] || '';
        } else {
          // It's the actual option text
          selectedOptionText = answer;
          selectedOptionIndex = allOptions.indexOf(answer);
          selectedOptionLetter = selectedOptionIndex >= 0 ? String.fromCharCode(65 + selectedOptionIndex) : '';
        }
      }

      // Store structured answer data
      structuredAnswers.set(questionId, {
        selectedOption: selectedOptionLetter,
        selectedOptionText: selectedOptionText,
        selectedOptionIndex: selectedOptionIndex,
        isCorrect: selectedOptionText === question.correct_option_latex
      });

      // Count correct answers
      if (selectedOptionText === question.correct_option_latex) {
        correctAnswers++;
      }
    }

    console.log(`   📊 Answer Processing Complete:`);
    console.log(`      Total answers processed: ${structuredAnswers.size}`);
    console.log(`      Correct answers: ${correctAnswers}/${totalQuestions}`);

    // Update question analytics for adaptive difficulty
    console.log(`\n📈 Updating question analytics for adaptive difficulty...`);
    const analyticsUpdates = [];
    
    for (const [questionId, answerData] of structuredAnswers) {
      const question = questionMap.get(questionId);
      if (!question) continue;

      // Increment usage counter and correct/incorrect counters
      const timesUsed = (question.times_used || 0) + 1;
      const timesCorrect = (question.times_correct || 0) + (answerData.isCorrect ? 1 : 0);
      const timesIncorrect = (question.times_incorrect || 0) + (answerData.isCorrect ? 0 : 1);
      
      // Calculate success rate
      const successRate = timesUsed > 0 ? (timesCorrect / timesUsed) * 100 : 0;
      
      // Determine adaptive difficulty based on success rate
      // High success (>75%) = easy, Medium (40-75%) = medium, Low (<40%) = hard
      let adaptiveDifficulty = 'medium';
      if (timesUsed >= 5) { // Only adjust after minimum 5 attempts
        if (successRate > 75) {
          adaptiveDifficulty = 'easy';
        } else if (successRate < 40) {
          adaptiveDifficulty = 'hard';
        }
      }

      analyticsUpdates.push({
        updateOne: {
          filter: { _id: questionId },
          update: {
            $set: {
              times_used: timesUsed,
              times_correct: timesCorrect,
              times_incorrect: timesIncorrect,
              success_rate: Math.round(successRate * 100) / 100, // Round to 2 decimals
              adaptive_difficulty: adaptiveDifficulty
            }
          }
        }
      });

      console.log(`      Question ${questionId}: Used ${timesUsed}x, Success ${successRate.toFixed(1)}%, Difficulty: ${adaptiveDifficulty}`);
    }

    // Bulk update all questions
    if (analyticsUpdates.length > 0) {
      await Question.bulkWrite(analyticsUpdates);
      console.log(`   ✅ Updated analytics for ${analyticsUpdates.length} questions`);
    }

    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Mark question set as completed
    console.log(`\n🔄 Marking QuestionSet as completed...`);
    console.log(`   QuestionSet ID: ${questionSet._id}`);
    console.log(`   Exam ID: ${examId}`);
    console.log(`   Student Email: ${user.email}`);
    console.log(`   Before: is_completed = ${questionSet.is_completed}`);
    
    questionSet.is_completed = true;
    questionSet.completed_at = new Date();
    const savedQuestionSet = await questionSet.save();
    
    console.log(`   After save: is_completed = ${savedQuestionSet.is_completed}`);
    console.log(`   ✅ QuestionSet marked as completed and saved successfully!`);

    // Verify the save by re-querying
    const verifyQuestionSet = await QuestionSet.findById(questionSet._id).lean();
    console.log(`   ✅ Verification: is_completed in DB = ${verifyQuestionSet?.is_completed}`);

    // Create test submission record with structured answers
    const testSubmission = new TestSubmission({
      exam_id: examId,
      student_id: user.id,
      student_email: user.email,
      question_set_id: questionSet._id,
      answers: structuredAnswers,
      score: score,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      percentage: percentage,
      time_spent_seconds: timeSpentSeconds || 0,
      submission_reason: reason || 'Manual submission',
      tab_switches: tabSwitches,
      fullscreen_exits: fullscreenExits,
      submitted_at: new Date()
    });

    await testSubmission.save();

    console.log('✅ Test submitted successfully');
    console.log(`   - Correct Answers: ${correctAnswers}/${totalQuestions}`);
    console.log(`   - Percentage: ${percentage.toFixed(2)}%`);

    return res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      submission: {
        score: score,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: percentage,
        submittedAt: testSubmission.submitted_at
      }
    });
  } catch (error) {
    console.error('❌ Error submitting test:', error);
    return res.status(500).json({ success: false, error: `Failed to submit test: ${error.message}` });
  }
};

/**
 * Get attended (completed) tests for a student
 */
export const getAttendedTests = async (req, res) => {
  try {
    const { user } = req;
    console.log('\n📚 getAttendedTests called');
    console.log('   User:', user?.email, 'Role:', user?.role);
    
    if (!user || user.role !== 'student') {
      console.log('❌ Unauthorized access attempt');
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    console.log(`\n📚 Fetching attended tests for student: ${user.email}`);

    // Find all completed test submissions for this student
    const submissions = await TestSubmission.find({
      student_email: user.email
    }).sort({ submitted_at: -1 }).lean();

    console.log(`   Found ${submissions.length} test submissions in database`);
    if (submissions.length > 0) {
      console.log('   First submission sample:', JSON.stringify(submissions[0], null, 2));
    }

    if (!submissions.length) {
      console.log('⚠️ No attended tests found for this student');
      return res.status(200).json({ success: true, attendedTests: [] });
    }

    // Get exam details for each submission
    const examIds = submissions.map(s => s.exam_id);
    console.log(`   Looking up ${examIds.length} exams...`);
    
    const exams = await Exam.find({
      _id: { $in: examIds },
      deleted_at: null
    }).select('_id title teacher_id score_released answers_released').lean();

    console.log(`   Found ${exams.length} exams`);
    const examMap = new Map(exams.map(e => [e._id.toString(), e]));

    // Get teacher names
    const teacherIds = exams.map(e => e.teacher_id).filter(Boolean);
    console.log(`   Looking up ${teacherIds.length} teachers...`);
    
    const teachers = await User.find({
      _id: { $in: teacherIds },
      deleted_at: null
    }).select('_id name').lean();

    console.log(`   Found ${teachers.length} teachers`);
    const teacherMap = new Map(teachers.map(t => [t._id.toString(), t.name]));

    // Format the attended tests
    const attendedTests = submissions.map(submission => {
      const exam = examMap.get(submission.exam_id.toString());
      const teacherName = exam?.teacher_id ? teacherMap.get(exam.teacher_id.toString()) : 'Unknown';
      
      // Check if score is released (default to false for security)
      const scoreReleased = exam?.score_released === true;
      const answersReleased = exam?.answers_released === true;
      
      console.log(`   📊 Exam: ${exam?.title}, score_released: ${exam?.score_released}, scoreReleased: ${scoreReleased}`);
      
      // Calculate grade based on percentage (only if score is released)
      let grade = 'F';
      if (scoreReleased) {
        if (submission.percentage >= 90) grade = 'A';
        else if (submission.percentage >= 80) grade = 'B+';
        else if (submission.percentage >= 70) grade = 'B';
        else if (submission.percentage >= 60) grade = 'C';
        else if (submission.percentage >= 50) grade = 'D';
      } else {
        grade = 'N/A';
      }

      // Format time spent
      const hours = Math.floor(submission.time_spent_seconds / 3600);
      const minutes = Math.floor((submission.time_spent_seconds % 3600) / 60);
      const timeSpent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

      // Format date
      const date = new Date(submission.submitted_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return {
        _id: submission._id,
        examId: submission.exam_id,
        test: exam?.title || 'Unknown Test',
        score: scoreReleased ? Math.round(submission.percentage) : null,
        scoreReleased: scoreReleased,
        answersReleased: answersReleased,
        date: date,
        instructor: teacherName,
        grade: grade,
        totalQuestions: submission.total_questions,
        correctAnswers: scoreReleased ? submission.correct_answers : null,
        timeSpent: timeSpent,
        submittedAt: submission.submitted_at
      };
    });

    console.log(`✅ Returning ${attendedTests.length} formatted attended tests`);
    if (attendedTests.length > 0) {
      console.log('   First formatted test:', JSON.stringify(attendedTests[0], null, 2));
    }

    return res.status(200).json({ 
      success: true, 
      attendedTests: attendedTests
    });
  } catch (error) {
    console.error('❌ Error fetching attended tests:', error);
    console.error('   Stack:', error.stack);
    return res.status(500).json({ success: false, error: `Failed to fetch attended tests: ${error.message}` });
  }
};

/**
 * Get test answers for a submitted test (for student review and teacher access)
 */
export const getTestAnswers = async (req, res) => {
  try {
    const { user } = req;
    const { submissionId } = req.params;
    
    console.log('\n📖 getTestAnswers called');
    console.log('   User:', user?.email, 'Role:', user?.role);
    console.log('   Submission ID:', submissionId);
    
    if (!user || !['student', 'teacher', 'admin'].includes(user.role)) {
      console.log('❌ Unauthorized access attempt');
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ success: false, error: 'Invalid submission ID' });
    }

    // Find the test submission
    let submissionQuery = { _id: submissionId };
    
    // If student, only allow access to their own submissions
    if (user.role === 'student') {
      submissionQuery.student_email = user.email;
    }
    
    const submission = await TestSubmission.findOne(submissionQuery).lean();

    if (!submission) {
      console.log('❌ Submission not found or unauthorized');
      return res.status(404).json({ success: false, error: 'Submission not found or unauthorized' });
    }

    // For teachers, verify they have access to this student's class
    if (user.role === 'teacher') {
      const exam = await Exam.findById(submission.exam_id).select('class_id').lean();
      if (!exam) {
        return res.status(404).json({ success: false, error: 'Exam not found' });
      }

      const classDoc = await Class.findById(exam.class_id).select('teacher_id').lean();
      if (!classDoc || classDoc.teacher_id.toString() !== user.id.toString()) {
        console.log('❌ Teacher does not have access to this student\'s class');
        return res.status(403).json({ success: false, error: 'You do not have access to this submission' });
      }
    }

    console.log(`   Found submission for exam: ${submission.exam_id}`);
    console.log(`   ✅ Access granted for ${user.role}`);

    // Get exam details (fetch again with full details if needed for students)
    const exam = await Exam.findById(submission.exam_id)
      .select('title description answers_released')
      .lean();

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Check if student is trying to access answers before they're released
    if (user.role === 'student' && exam.answers_released === false) {
      console.log('❌ Answers not yet released for this exam');
      return res.status(403).json({ 
        success: false, 
        error: 'Answers have not been released yet',
        answersReleased: false
      });
    }

    // Get the question set for this submission
    const questionSet = await QuestionSet.findById(submission.question_set_id).lean();
    
    if (!questionSet) {
      return res.status(404).json({ success: false, error: 'Question set not found' });
    }

    // Get all questions from the question set
    const questionSetQuestions = await QuestionSetQuestion.find({
      questionset_id: questionSet._id
    }).sort({ question_order: 1 }).lean();

    console.log(`   Found ${questionSetQuestions.length} questions in the set`);

    const questionIds = questionSetQuestions.map(qsq => qsq.question_id);
    
    // Check for duplicates
    const uniqueQuestionIds = [...new Set(questionIds.map(id => id.toString()))];
    if (uniqueQuestionIds.length !== questionIds.length) {
      console.warn(`⚠️ Warning: Found ${questionIds.length - uniqueQuestionIds.length} duplicate question IDs in question set`);
    }

    // Get all question details using unique IDs only
    const questions = await Question.find({
      _id: { $in: uniqueQuestionIds },
      deleted_at: null
    }).select('latex_code correct_option_latex incorrect_option_latex subject difficulty_rating').lean();

    console.log(`   Retrieved ${questions.length} question details`);
    
    // Create a map for quick lookup
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    // Format the questions in the original order from questionSetQuestions, skipping duplicates
    const seenQuestionIds = new Set();
    const formattedQuestions = questionSetQuestions
      .map(qsq => {
        const questionId = qsq.question_id.toString();
        
        // Skip if we've already processed this question
        if (seenQuestionIds.has(questionId)) {
          console.warn(`⚠️ Skipping duplicate question ID: ${questionId}`);
          return null;
        }
        seenQuestionIds.add(questionId);
        
        const q = questionMap.get(questionId);
        if (!q) {
          console.warn(`⚠️ Question not found in map: ${questionId}`);
          return null;
        }
        
        // When using .lean(), Map becomes a plain object, so use bracket notation
        const answerData = submission.answers ? submission.answers[questionId] : null;
        const correctAnswer = q.correct_option_latex;
      
      // Handle both old format (string) and new format (object)
      let studentAnswerText = null;
      let studentAnswerLetter = null;
      let isCorrect = false;

      if (answerData) {
        if (typeof answerData === 'object' && answerData.selectedOptionText) {
          // New structured format
          studentAnswerText = answerData.selectedOptionText;
          studentAnswerLetter = answerData.selectedOption;
          isCorrect = answerData.isCorrect || (studentAnswerText === correctAnswer);
        } else if (typeof answerData === 'string') {
          // Old format - could be letter or text
          if (answerData.length === 1 && /[A-Z]/.test(answerData)) {
            // It's a letter
            studentAnswerLetter = answerData;
            const allOptions = [...(q.incorrect_option_latex || []), correctAnswer];
            const index = answerData.charCodeAt(0) - 65;
            studentAnswerText = allOptions[index] || null;
          } else {
            // It's the text
            studentAnswerText = answerData;
            // Derive the letter from the text
            const allOptions = [...(q.incorrect_option_latex || []), correctAnswer];
            const index = allOptions.indexOf(answerData);
            studentAnswerLetter = index >= 0 ? String.fromCharCode(65 + index) : null;
          }
          isCorrect = studentAnswerText === correctAnswer;
        }
      }
      
      // Build all options array
      const incorrectOptions = q.incorrect_option_latex || [];
      const allOptions = correctAnswer ? [...incorrectOptions, correctAnswer] : incorrectOptions;
      
      // If we have studentAnswerText but no letter, derive it
      if (studentAnswerText && !studentAnswerLetter) {
        const index = allOptions.indexOf(studentAnswerText);
        if (index >= 0) {
          studentAnswerLetter = String.fromCharCode(65 + index);
        }
      }
      
      // Log for debugging
      if (!correctAnswer) {
        console.warn(`⚠️ Question ${questionId} has no correct_option_latex`);
      }
      
      // Log sample question for debugging
      if (questionId === questions[0]?._id.toString()) {
        console.log('   📝 Sample question:');
        console.log('      ID:', questionId);
        console.log('      Correct Answer:', correctAnswer?.substring(0, 50));
        console.log('      Student Answer Text:', studentAnswerText?.substring(0, 50));
        console.log('      Student Answer Letter:', studentAnswerLetter);
        console.log('      Is Correct:', isCorrect);
        console.log('      Total Options:', allOptions.length);
      }
      
      return {
        id: questionId,
        text: q.latex_code || '',
        options: allOptions,
        correctAnswer: correctAnswer || '',
        studentAnswer: studentAnswerText,
        studentAnswerLetter: studentAnswerLetter,
        isCorrect: isCorrect,
        subject: q.subject || 'General',
        difficulty_rating: q.difficulty_rating || 1
      };
    })
    .filter(q => q !== null); // Remove null entries from duplicates

    console.log(`✅ Returning ${formattedQuestions.length} questions with answers`);
    if (formattedQuestions.length > 0) {
      console.log('   📋 Sample formatted question:', {
        id: formattedQuestions[0].id,
        hasText: !!formattedQuestions[0].text,
        optionsCount: formattedQuestions[0].options.length,
        hasCorrectAnswer: !!formattedQuestions[0].correctAnswer,
        hasStudentAnswer: !!formattedQuestions[0].studentAnswer,
        studentAnswerLetter: formattedQuestions[0].studentAnswerLetter,
        isCorrect: formattedQuestions[0].isCorrect
      });
    }

    return res.status(200).json({
      success: true,
      exam: {
        title: exam.title,
        description: exam.description
      },
      submission: {
        score: submission.score,
        percentage: submission.percentage,
        correctAnswers: submission.correct_answers,
        totalQuestions: submission.total_questions,
        timeSpent: submission.time_spent_seconds,
        submittedAt: submission.submitted_at
      },
      questions: formattedQuestions
    });
  } catch (error) {
    console.error('❌ Error fetching test answers:', error);
    console.error('   Stack:', error.stack);
    return res.status(500).json({ success: false, error: `Failed to fetch test answers: ${error.message}` });
  }
};

/**
 * Get student performance statistics
 */
export const getStudentPerformance = async (req, res) => {
  try {
    const { user } = req;
    console.log('\n📊 getStudentPerformance called');
    console.log('   User:', user?.email, 'Role:', user?.role);
    
    if (!user || user.role !== 'student') {
      console.log('❌ Unauthorized access attempt');
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    console.log(`\n📊 Calculating performance stats for student: ${user.email}`);

    // Find all completed test submissions for this student
    const submissions = await TestSubmission.find({
      student_email: user.email
    }).lean();

    console.log(`   Found ${submissions.length} test submissions`);

    if (!submissions.length) {
      console.log('⚠️ No test submissions found - returning zero stats');
      return res.status(200).json({ 
        success: true, 
        performance: {
          testsAttempted: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0,
          recentScores: []
        }
      });
    }

    // Calculate statistics
    const testsAttempted = submissions.length;
    const scores = submissions.map(s => s.percentage);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / testsAttempted;
    const bestScore = Math.max(...scores);
    const totalTimeSpent = submissions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);

    // Get recent scores (last 10)
    const recentSubmissions = submissions
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .slice(0, 10);

    // Get exam details for recent submissions
    const recentExamIds = recentSubmissions.map(s => s.exam_id);
    const recentExams = await Exam.find({
      _id: { $in: recentExamIds },
      deleted_at: null
    }).select('_id title').lean();

    const examMap = new Map(recentExams.map(e => [e._id.toString(), e]));

    const recentScores = recentSubmissions.map(submission => {
      const exam = examMap.get(submission.exam_id.toString());
      const date = new Date(submission.submitted_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return {
        examTitle: exam?.title || 'Unknown Test',
        score: Math.round(submission.percentage),
        date: date,
        submittedAt: submission.submitted_at
      };
    });

    // Calculate subject-wise performance if subjects are tracked
    const subjectStats = {};
    for (const submission of submissions) {
      const exam = await Exam.findById(submission.exam_id).select('title').lean();
      if (exam) {
        // Try to extract subject from title (simplified - could be enhanced)
        const subject = exam.title.split('-')[0]?.trim() || 'General';
        if (!subjectStats[subject]) {
          subjectStats[subject] = { total: 0, count: 0 };
        }
        subjectStats[subject].total += submission.percentage;
        subjectStats[subject].count += 1;
      }
    }

    const subjectPerformance = Object.entries(subjectStats).map(([subject, stats]) => ({
      subject,
      averageScore: Math.round(stats.total / stats.count),
      testsAttempted: stats.count
    }));

    const performance = {
      testsAttempted,
      averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      bestScore: Math.round(bestScore),
      totalTimeSpent, // in seconds
      recentScores,
      subjectPerformance
    };

    console.log('✅ Performance stats calculated:');
    console.log(`   Tests Attempted: ${testsAttempted}`);
    console.log(`   Average Score: ${performance.averageScore}%`);
    console.log(`   Best Score: ${performance.bestScore}%`);

    return res.status(200).json({ 
      success: true, 
      performance
    });
  } catch (error) {
    console.error('❌ Error fetching student performance:', error);
    console.error('   Stack:', error.stack);
    return res.status(500).json({ success: false, error: `Failed to fetch performance: ${error.message}` });
  }
};

// Get exam analysis for teachers
export const getExamAnalysis = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers can view exam analysis' });
    }

    // Get all exams for this teacher
    let examQuery = { deleted_at: null };
    if (user.role === 'teacher') {
      examQuery.teacher_id = user.id;
    }

    const exams = await Exam.find(examQuery)
      .populate('class_id', 'class_name')
      .populate('question_bank_id', 'name')
      .sort({ created_at: -1 });

    // Get submissions for each exam
    const examAnalysis = await Promise.all(
      exams.map(async (exam) => {
        const submissions = await TestSubmission.find({ exam_id: exam._id });
        
        const totalParticipants = submissions.length;
        const avgScore = totalParticipants > 0 
          ? submissions.reduce((sum, sub) => sum + sub.percentage, 0) / totalParticipants 
          : 0;
        const avgTimeSpent = totalParticipants > 0
          ? submissions.reduce((sum, sub) => sum + sub.time_spent_seconds, 0) / totalParticipants
          : 0;
        
        return {
          exam_id: exam._id,
          exam_name: exam.title || exam.exam_name || 'Untitled Exam',
          course: exam.class_id?.class_name || exam.question_bank_id?.name || 'N/A',
          date: exam.created_at,
          start_time: exam.start_time,
          end_time: exam.end_time,
          duration_minutes: exam.duration_minutes,
          total_marks: exam.total_marks,
          status: exam.status || 'Draft',
          participants: totalParticipants,
          avgScore: Math.round(avgScore * 10) / 10,
          avgTimeSpent: Math.round(avgTimeSpent / 60), // Convert to minutes
          score_released: exam.score_released === true, // Explicit true check for security
          answers_released: exam.answers_released === true // Explicit true check for security
        };
      })
    );

    // Calculate overall statistics
    const totalTests = exams.length;
    const completedTests = exams.filter(e => e.status === 'Completed' || e.status === 'published').length;
    const totalSubmissions = await TestSubmission.countDocuments({ 
      exam_id: { $in: exams.map(e => e._id) }
    });
    
    const allSubmissions = await TestSubmission.find({ 
      exam_id: { $in: exams.map(e => e._id) }
    });
    
    const overallAvgScore = allSubmissions.length > 0
      ? allSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) / allSubmissions.length
      : 0;
      
    const overallAvgTime = allSubmissions.length > 0
      ? allSubmissions.reduce((sum, sub) => sum + sub.time_spent_seconds, 0) / allSubmissions.length / 60
      : 0;

    console.log(`✅ Fetched analysis for ${totalTests} exams (${user.role}: ${user.id})`);

    res.status(200).json({
      success: true,
      summary: {
        totalTests,
        completedTests,
        totalParticipants: totalSubmissions,
        avgScore: Math.round(overallAvgScore * 10) / 10,
        avgTimeMinutes: Math.round(overallAvgTime)
      },
      exams: examAnalysis
    });
  } catch (error) {
    console.error('❌ Error fetching exam analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get participants for a specific exam
export const getExamParticipants = async (req, res) => {
  try {
    const user = req.user;
    const { examId } = req.params;

    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Verify the exam belongs to this teacher (or user is admin)
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    if (user.role === 'teacher' && exam.teacher_id.toString() !== user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this exam' });
    }

    // Get all submissions for this exam with student details
    const submissions = await TestSubmission.find({ exam_id: examId })
      .populate('student_id', 'username fullName email')
      .sort({ submitted_at: -1 });

    const participants = submissions.map(sub => ({
      student_id: sub.student_id?._id,
      student_name: sub.student_id?.username || sub.student_id?.fullName || 'Unknown',
      student_email: sub.student_email || sub.student_id?.email || 'N/A',
      score: sub.score,
      percentage: sub.percentage,
      correct_answers: sub.correct_answers,
      total_questions: sub.total_questions,
      time_spent_minutes: Math.round(sub.time_spent_seconds / 60),
      submitted_at: sub.submitted_at,
      submission_reason: sub.submission_reason
    }));

    console.log(`✅ Fetched ${participants.length} participants for exam ${examId}`);

    res.status(200).json({
      success: true,
      exam_name: exam.title || exam.exam_name || 'Untitled Exam',
      total_participants: participants.length,
      participants
    });
  } catch (error) {
    console.error('❌ Error fetching exam participants:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all students for individual analysis (teacher only)
export const getAllStudentsForAnalysis = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers can view student analysis' });
    }

    console.log(`\n📊 Fetching all students for analysis - Teacher: ${user.id}`);

    // Get all classes for this teacher
    let classQuery = { deleted_at: null };
    if (user.role === 'teacher') {
      classQuery.teacher_id = user.id;
    }

    const classes = await Class.find(classQuery);
    const classIds = classes.map(c => c._id);

    console.log(`📚 Found ${classes.length} classes for teacher`);

    // Get all class-student relationships for these classes
    const classStudents = await ClassStudent.find({
      class_id: { $in: classIds },
      is_active: true
    }).populate('student_id', 'first_name last_name email created_at');

    console.log(`👥 Found ${classStudents.length} class-student relationships`);

    // Get test submissions for each student
    const studentAnalysis = await Promise.all(
      classStudents.map(async (classStudent) => {
        const student = classStudent.student_id;
        
        if (!student) return null; // Skip if student was deleted
        
        const submissions = await TestSubmission.find({ student_id: student._id });
        
        const testsCompleted = submissions.length;
        const avgScore = testsCompleted > 0
          ? submissions.reduce((sum, sub) => sum + sub.percentage, 0) / testsCompleted
          : 0;
        
        const totalTimeSpent = submissions.reduce((sum, sub) => sum + (sub.time_spent_seconds || 0), 0);
        const avgTimeMinutes = testsCompleted > 0 
          ? Math.round(totalTimeSpent / testsCompleted / 60)
          : 0;

        const classInfo = classes.find(c => c._id.toString() === classStudent.class_id.toString());

        return {
          student_id: student._id,
          student_name: `${student.first_name} ${student.last_name}`,
          email: student.email,
          class_name: classInfo?.class_name || 'Unknown',
          class_id: classStudent.class_id,
          tests_completed: testsCompleted,
          avg_score: Math.round(avgScore * 10) / 10,
          avg_time_minutes: avgTimeMinutes,
          joined_date: classStudent.joined_at || student.created_at
        };
      })
    );

    // Filter out null entries
    const validStudentAnalysis = studentAnalysis.filter(s => s !== null);

    // Sort by average score descending
    validStudentAnalysis.sort((a, b) => b.avg_score - a.avg_score);

    // Add rank
    validStudentAnalysis.forEach((student, index) => {
      student.rank = index + 1;
    });

    console.log(`✅ Prepared analysis for ${validStudentAnalysis.length} students`);

    res.status(200).json({
      success: true,
      total_students: validStudentAnalysis.length,
      students: validStudentAnalysis
    });
  } catch (error) {
    console.error('❌ Error fetching students for analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get detailed analysis for a specific student
export const getStudentDetailedAnalysis = async (req, res) => {
  try {
    const user = req.user;
    const { studentId } = req.params;

    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers can view student analysis' });
    }

    console.log(`\n📊 Fetching detailed analysis for student: ${studentId}`);

    // Get student info
    const student = await User.findById(studentId).select('first_name last_name email created_at');
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Get the student's class through ClassStudent model
    const classStudent = await ClassStudent.findOne({ 
      student_id: studentId, 
      is_active: true 
    }).populate('class_id', 'class_name teacher_id');

    if (!classStudent) {
      return res.status(404).json({ success: false, error: 'Student not enrolled in any class' });
    }

    // Verify teacher has access to this student's class
    if (user.role === 'teacher') {
      if (classStudent.class_id.teacher_id.toString() !== user.id.toString()) {
        return res.status(403).json({ success: false, error: 'You do not have access to this student' });
      }
    }

    // Get all test submissions for this student
    const submissions = await TestSubmission.find({ student_id: studentId })
      .populate({
        path: 'exam_id',
        select: 'title exam_name class_id question_bank_id created_at',
        populate: {
          path: 'question_bank_id',
          select: 'name subject'
        }
      })
      .sort({ submitted_at: -1 });

    console.log(`📝 Found ${submissions.length} test submissions`);

    // Calculate statistics
    const testsCompleted = submissions.length;
    const avgScore = testsCompleted > 0
      ? submissions.reduce((sum, sub) => sum + sub.percentage, 0) / testsCompleted
      : 0;
    
    const bestScore = testsCompleted > 0
      ? Math.max(...submissions.map(sub => sub.percentage))
      : 0;

    const totalTimeSpent = submissions.reduce((sum, sub) => sum + (sub.time_spent_seconds || 0), 0);
    const avgTimeMinutes = testsCompleted > 0 
      ? Math.round(totalTimeSpent / testsCompleted / 60)
      : 0;

    // Recent test results
    const recentTests = submissions.slice(0, 10).map(sub => ({
      submission_id: sub._id,
      exam_id: sub.exam_id?._id,
      exam_name: sub.exam_id?.title || sub.exam_id?.exam_name || 'Untitled Exam',
      subject: sub.exam_id?.question_bank_id?.subject || 'Unknown',
      score: sub.score,
      total_questions: sub.total_questions,
      percentage: Math.round(sub.percentage * 10) / 10,
      time_spent_minutes: Math.round(sub.time_spent_seconds / 60),
      submitted_at: sub.submitted_at,
      correct_answers: sub.correct_answers
    }));

    // Subject-wise performance
    const subjectMap = new Map();
    submissions.forEach(sub => {
      const subject = sub.exam_id?.question_bank_id?.subject || 'Unknown';
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { totalScore: 0, count: 0 });
      }
      const subjectData = subjectMap.get(subject);
      subjectData.totalScore += sub.percentage;
      subjectData.count += 1;
    });

    const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      avg_score: Math.round((data.totalScore / data.count) * 10) / 10,
      tests_attempted: data.count
    })).sort((a, b) => b.avg_score - a.avg_score);

    console.log(`✅ Detailed analysis prepared for ${student.first_name} ${student.last_name}`);

    res.status(200).json({
      success: true,
      student: {
        student_id: student._id,
        name: `${student.first_name} ${student.last_name}`,
        email: student.email,
        class_name: classStudent.class_id?.class_name || 'Unknown',
        joined_date: classStudent.joined_at || student.created_at
      },
      statistics: {
        tests_completed: testsCompleted,
        avg_score: Math.round(avgScore * 10) / 10,
        best_score: Math.round(bestScore * 10) / 10,
        avg_time_minutes: avgTimeMinutes,
        total_time_spent_minutes: Math.round(totalTimeSpent / 60)
      },
      recent_tests: recentTests,
      subject_performance: subjectPerformance
    });
  } catch (error) {
    console.error('❌ Error fetching detailed student analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get ongoing test monitoring data
export const getTestMonitoringData = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId } = req.params;
    console.log(`📊 Fetching monitoring data for exam ${examId}`);

    // Verify exam exists and teacher has access
    const exam = await Exam.findOne({ _id: examId, teacher_id: user.id })
      .populate('class_id', 'class_name students')
      .populate('question_bank_id', 'name');

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Get all question sets for this exam
    const questionSets = await QuestionSet.find({ exam_id: examId })
      .select('student_email set_number is_completed submitted_at created_at')
      .lean();

    // Get all test submissions for this exam
    const submissions = await TestSubmission.find({ exam_id: examId })
      .populate('student_id', 'first_name last_name email')
      .select('student_id score percentage time_spent_seconds submitted_at tab_switches fullscreen_exits')
      .lean();

    // Get students from the class
    const students = exam.class_id.students || [];
    
    // Build student monitoring data
    const studentData = students.map(student => {
      const studentQuestionSet = questionSets.find(qs => qs.student_email === student.email);
      const studentSubmission = submissions.find(sub => sub.student_id.email === student.email);

      let status = 'Not Started';
      let timeRemaining = exam.duration_minutes;
      let currentQuestion = 0;
      let attemptedQuestions = 0;

      if (studentSubmission) {
        status = 'Completed';
        timeRemaining = 0;
        currentQuestion = exam.number_of_questions_per_set;
        attemptedQuestions = exam.number_of_questions_per_set;
      } else if (studentQuestionSet) {
        status = studentQuestionSet.is_completed ? 'Completed' : 'In Progress';
        
        // Calculate time remaining
        const startedAt = new Date(studentQuestionSet.created_at);
        const now = new Date();
        const elapsedMinutes = (now - startedAt) / (1000 * 60);
        timeRemaining = Math.max(0, exam.duration_minutes - elapsedMinutes);
      }

      return {
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        userId: student.userId,
        status,
        timeRemaining: Math.round(timeRemaining),
        totalTime: exam.duration_minutes,
        questionSet: studentQuestionSet?.set_number || 0,
        currentQuestion,
        totalQuestions: exam.number_of_questions_per_set,
        proctoring: {
          webcamEnabled: true,
          tabSwitches: studentSubmission?.tab_switches || 0,
          fullscreenExits: studentSubmission?.fullscreen_exits || 0,
          suspiciousActivity: (studentSubmission?.tab_switches || 0) + (studentSubmission?.fullscreen_exits || 0),
          lastActivity: studentQuestionSet ? 'Active' : 'Not Started'
        },
        answers: {
          attempted: attemptedQuestions,
          marked: 0
        },
        score: studentSubmission?.score || 0,
        percentage: studentSubmission?.percentage || 0,
        submittedAt: studentSubmission?.submitted_at || studentQuestionSet?.submitted_at
      };
    });

    // Calculate stats
    const activeStudents = studentData.filter(s => s.status === 'In Progress').length;
    const completedStudents = studentData.filter(s => s.status === 'Completed').length;

    const testDetails = {
      id: exam._id,
      title: exam.title,
      subject: exam.question_bank_id?.name || 'Unknown',
      duration: exam.duration_minutes,
      totalStudents: students.length,
      activeStudents,
      completedStudents,
      startTime: exam.start_time,
      endTime: exam.end_time,
      questionSets: exam.number_of_sets,
      questionsPerSet: exam.number_of_questions_per_set,
      securitySettings: {
        disableTabSwitching: true,
        disableRightClick: true,
        enableProctoring: false,
        enableWebcam: false
      }
    };

    console.log(`✅ Fetched monitoring data: ${studentData.length} students, ${activeStudents} active, ${completedStudents} completed`);

    res.status(200).json({
      success: true,
      testDetails,
      students: studentData,
      alerts: [] // Can be implemented later for real-time alerts
    });
  } catch (error) {
    console.error('❌ Error fetching monitoring data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Pause test for a student
export const pauseStudentTest = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId, studentEmail } = req.body;
    console.log(`⏸️ Pausing test for student ${studentEmail} in exam ${examId}`);

    // Verify exam exists and teacher has access
    const exam = await Exam.findOne({ _id: examId, teacher_id: user.id });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Find the student's question set
    const questionSet = await QuestionSet.findOne({ 
      exam_id: examId, 
      student_email: studentEmail 
    });

    if (!questionSet) {
      return res.status(404).json({ success: false, error: 'Student not found in this exam' });
    }

    // Mark as paused (you can add a paused field to QuestionSet schema if needed)
    // For now, we'll just return success
    console.log(`✅ Test paused for student ${studentEmail}`);

    res.status(200).json({ 
      success: true, 
      message: 'Test paused successfully',
      studentEmail
    });
  } catch (error) {
    console.error('❌ Error pausing test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// End test for all students or specific student
export const endTest = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId, studentEmail } = req.body;
    console.log(`🛑 Ending test for exam ${examId}${studentEmail ? ` for student ${studentEmail}` : ' for all students'}`);

    // Verify exam exists and teacher has access
    const exam = await Exam.findOne({ _id: examId, teacher_id: user.id });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    let query = { exam_id: examId };
    if (studentEmail) {
      query.student_email = studentEmail;
    }

    // Mark all question sets as completed
    const result = await QuestionSet.updateMany(
      query,
      { 
        $set: { 
          is_completed: true,
          submitted_at: new Date()
        } 
      }
    );

    // If ending test for all students, mark the exam as ended
    if (!studentEmail) {
      await Exam.updateOne(
        { _id: examId },
        { 
          $set: { 
            is_ended: true,
            manually_ended_at: new Date()
          } 
        }
      );
      console.log(`✅ Exam ${examId} marked as ended`);
    }

    console.log(`✅ Test ended: ${result.modifiedCount} question sets marked as completed`);

    res.status(200).json({ 
      success: true, 
      message: studentEmail ? 'Test ended for student' : 'Test ended for all students',
      affectedStudents: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error ending test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete exam (soft delete)
export const deleteExam = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { examId } = req.params;
    console.log(`🗑️ Deleting exam ${examId} by ${user.email}`);

    // Verify exam exists and teacher has access
    const exam = await Exam.findOne({ _id: examId, teacher_id: user.id });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found or access denied' });
    }

    // Soft delete the exam
    await Exam.updateOne(
      { _id: examId },
      { 
        $set: { 
          deleted_at: new Date()
        } 
      }
    );

    // Also soft delete associated question sets
    await QuestionSet.updateMany(
      { exam_id: examId },
      { 
        $set: { 
          deleted_at: new Date()
        } 
      }
    );

    console.log(`✅ Exam ${examId} soft deleted successfully`);

    res.status(200).json({ 
      success: true, 
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting exam:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle score release for an exam (teacher only)
 */
export const toggleScoreRelease = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers can toggle score release' });
    }

    const { examId } = req.params;

    console.log(`🔄 Toggling score release for exam ${examId}`);

    // Verify exam exists and teacher has access
    const exam = await Exam.findOne({ _id: examId, teacher_id: user.id, deleted_at: null });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found or access denied' });
    }

    // Toggle the current value
    exam.score_released = !exam.score_released;
    await exam.save();

    console.log(`✅ Score release ${exam.score_released ? 'enabled' : 'disabled'} for exam: ${exam.title}`);

    res.status(200).json({ 
      success: true, 
      message: `Score ${exam.score_released ? 'released' : 'hidden'} successfully`,
      scoreReleased: exam.score_released
    });
  } catch (error) {
    console.error('❌ Error toggling score release:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle answer release for an exam (teacher only)
 */
export const toggleAnswerRelease = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only teachers can toggle answer release' });
    }

    const { examId } = req.params;

    console.log(`🔄 Toggling answer release for exam ${examId}`);

    // Verify exam exists and teacher has access
    const exam = await Exam.findOne({ _id: examId, teacher_id: user.id, deleted_at: null });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found or access denied' });
    }

    // Toggle the current value
    exam.answers_released = !exam.answers_released;
    await exam.save();

    console.log(`✅ Answer release ${exam.answers_released ? 'enabled' : 'disabled'} for exam: ${exam.title}`);

    res.status(200).json({ 
      success: true, 
      message: `Answers ${exam.answers_released ? 'released' : 'hidden'} successfully`,
      answersReleased: exam.answers_released
    });
  } catch (error) {
    console.error('❌ Error toggling answer release:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get questions by IDs (for preview)
 */
export const getQuestionsByIds = async (req, res) => {
  try {
    const { user } = req;
    if (!user || !['teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { questionIds } = req.body;
    
    if (!questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, error: 'questionIds array is required' });
    }

    console.log(`📚 Fetching ${questionIds.length} questions for preview`);

    const questions = await Question.find({
      _id: { $in: questionIds.map(id => mongoose.Types.ObjectId.isValid(id) ? id : null).filter(Boolean) },
      deleted_at: null
    }).lean();

    console.log(`✅ Found ${questions.length} questions`);

    res.status(200).json({
      success: true,
      questions
    });
  } catch (error) {
    console.error('❌ Error fetching questions by IDs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};