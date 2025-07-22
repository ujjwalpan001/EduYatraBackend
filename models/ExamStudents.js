const mongoose = require('mongoose');

const examStudentSchema = new mongoose.Schema({
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },   // Reference to exams collection
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to users collection
  assigned_at: { type: Date, default: Date.now },  // Timestamp when assigned
  is_active: { type: Boolean, default: true }      // Whether this assignment is active
});

const ExamStudent = mongoose.model('ExamStudent', examStudentSchema);

module.exports = ExamStudent;
