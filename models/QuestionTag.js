const mongoose = require('mongoose');

const questionTagSchema = new mongoose.Schema({
  question_id: {
    type: mongoose.Schema.Types.ObjectId, // Reference to Question document ID
    required: true,
    ref: 'Question'
  },
  tag: {
    type: String,
    required: true,
    maxlength: 100,
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});


const QuestionTag = mongoose.model('QuestionTag', questionTagSchema);

module.exports = QuestionTag;
