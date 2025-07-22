const mongoose = require('mongoose');

const questionStatSchema = new mongoose.Schema({
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
    unique: true // Since it's one record per question
  },
  total_attempts: {
    type: Number,
    default: 0
  },
  successful_attempts: {
    type: Number,
    default: 0
  },
  average_success_rate: {
    type: Number,
    default: 0.0
  },
  average_time_spent: {
    type: Number,
    default: 0.0
  },
  difficulty_score: {
    type: Number,
    default: 0.0
  }
}, { collection: 'question_stats' });

module.exports = mongoose.model('QuestionStat', questionStatSchema);
