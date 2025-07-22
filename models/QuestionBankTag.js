const mongoose = require('mongoose');

const questionbankTagSchema = new mongoose.Schema({
  questionbank_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Questionbank',
    required: true
  },
  tag: {
    type: String,
    required: true,
    maxlength: 100
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

module.exports = mongoose.model('QuestionbankTag', questionbankTagSchema);
