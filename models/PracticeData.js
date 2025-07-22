const mongoose = require('mongoose');

const practiceDataSchema = new mongoose.Schema({
  practice_data_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(), // Creates a unique ID
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selected_answer: {
    type: String
  },
  is_correct: {
    type: Boolean
  },
  time_spent_seconds: {
    type: Number
  },
  practice_session_id: {
    type: String
  },
  attempted_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'practicedata' });

module.exports = mongoose.model('PracticeData', practiceDataSchema);
