const mongoose = require('mongoose');

const questionVersionSchema = new mongoose.Schema({
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Question'
  },
  version_number: {
    type: Number,
    required: true
  },
  latex_code: {
    type: String,
    required: true
  },
  changes_made: {
    type: String,
    default: ''
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming there’s a 'User' model
    required: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const QuestionVersion = mongoose.model('QuestionVersion', questionVersionSchema);

module.exports = QuestionVersion;
