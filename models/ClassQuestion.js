const mongoose = require('mongoose');

const classQuestionSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
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

const ClassQuestion = mongoose.model('ClassQuestion', classQuestionSchema);

module.exports = ClassQuestion;
