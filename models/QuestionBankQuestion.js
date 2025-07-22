const mongoose = require('mongoose');

const questionbankQuestionSchema = new mongoose.Schema({
  questionbank_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  added_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuestionbankQuestion', questionbankQuestionSchema);
