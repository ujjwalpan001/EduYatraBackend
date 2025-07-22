const mongoose = require('mongoose');

const studentAnswerSchema = new mongoose.Schema({
  student_answer_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,  // Automatically generated unique ID
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',     // refers to users collection
    required: true
  },
  question_set_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionSet',  // refers to questionsets collection
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',   // refers to questions collection
    required: true
  },
  selected_answer: {
    type: String
  },
  is_correct: {
    type: Boolean,
    default: false
  },
  time_spent_seconds: {
    type: Number
  },
  attempt_number: {
    type: Number,
    default: 1
  },
  submitted_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StudentAnswer', studentAnswerSchema);
