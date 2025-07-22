const mongoose = require('mongoose');

const studentProgressSchema = new mongoose.Schema({
  progress_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  correct_count: {
    type: Number,
    default: 0
  },
  incorrect_count: {
    type: Number,
    default: 0
  },
  total_attempts: {
    type: Number,
    default: 0
  },
  last_attempted: {
    type: Date
  },
  average_time_spent: {
    type: Number
  },
  success_rate: {
    type: Number
  },
  mastery_level: {
    type: String
  },
  first_attempted: {
    type: Date
  },
  last_successful_attempt: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'student_progress' });

module.exports = mongoose.model('StudentProgress', studentProgressSchema);
