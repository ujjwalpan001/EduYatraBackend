const mongoose = require('mongoose');

const questionAnalyticsSchema = new mongoose.Schema({
  question_analytics_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
    unique: true // As per SQL index: (question_id) [unique]
  },
  total_attempts: {
    type: Number,
    default: 0
  },
  correct_attempts: {
    type: Number,
    default: 0
  },
  average_time_seconds: {
    type: Number,
    default: 0.0
  },
  difficulty_rating: {
    type: Number,
    default: 0.0
  },
  success_rate: {
    type: Number,
    default: 0.0
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, { collection: 'question_analytics' });

module.exports = mongoose.model('QuestionAnalytics', questionAnalyticsSchema);
