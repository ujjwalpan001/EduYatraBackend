const mongoose = require('mongoose');

const questionOptionSchema = new mongoose.Schema({
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question', // assuming your main question model is named "Question"
    required: true
  },
  option_text: {
    type: String,
    required: true
  },
  is_correct: {
    type: Boolean,
    default: false
  },
  option_order: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes
questionOptionSchema.index({ question_id: 1 });
questionOptionSchema.index({ question_id: 1, option_order: 1 });

module.exports = mongoose.model('QuestionOption', questionOptionSchema);
