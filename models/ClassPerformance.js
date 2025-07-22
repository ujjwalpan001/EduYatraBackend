const mongoose = require('mongoose');

const classPerformanceSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  total_questions_attempted: {
    type: Number,
    default: 0
  },
  correct_answers: {
    type: Number,
    default: 0
  },
  success_rate: {
    type: Number,
    default: 0.0
  },
  average_time_per_question: {
    type: Number,
    default: 0.0
  },
  topics_mastered: {
    type: Number,
    default: 0
  },
  last_activity: {
    type: Date,
    default: Date.now
  }
}, { collection: 'class_performance' });

module.exports = mongoose.model('ClassPerformance', classPerformanceSchema);
