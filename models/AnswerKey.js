const mongoose = require('mongoose');

const answerKeySchema = new mongoose.Schema({
  answer_key_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
  },
  question_set_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionSet',  // Refers to questionsets collection
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',     // Refers to questions collection
    required: true
  },
  correct_answer: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AnswerKey', answerKeySchema);
