// questionObjectives.js

const mongoose = require('mongoose');

const questionObjectiveSchema = new mongoose.Schema({
  question_id: {
    type: mongoose.Schema.Types.ObjectId,  // Reference to the question
    required: true,
    ref: 'Question'
  },
  objective: {
    type: String,
    required: true,
    maxlength: 255
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const QuestionObjective = mongoose.model('QuestionObjective', questionObjectiveSchema);

module.exports = QuestionObjective;
