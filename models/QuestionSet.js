const mongoose = require('mongoose');

const questionSetSchema = new mongoose.Schema({
  exam_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',         // Reference to the exams collection
    required: true
  },
  set_number: {
    type: Number,
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',         // Reference to the users collection
    required: true
  },
  link: {
    type: String,
    unique: true,        // Unique link per question set
    required: true
  },
  is_completed: {
    type: Boolean,
    default: false
  },
  started_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuestionSet', questionSetSchema);
