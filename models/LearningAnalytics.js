const mongoose = require('mongoose');

const learningAnalyticsSchema = new mongoose.Schema({
  analytics_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session_start: {
    type: Date,
    required: true
  },
  session_end: {
    type: Date
  },
  questions_attempted: {
    type: Number,
    default: 0
  },
  correct_answers: {
    type: Number,
    default: 0
  },
  time_spent_minutes: {
    type: Number,
    default: 0.0
  },
  topics_covered: {
    type: mongoose.Schema.Types.Mixed // JSON field, can be an object or array
  },
  difficulty_progression: {
    type: mongoose.Schema.Types.Mixed // JSON field
  },
  session_type: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'learning_analytics' });

module.exports = mongoose.model('LearningAnalytics', learningAnalyticsSchema);
