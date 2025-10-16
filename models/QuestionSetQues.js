import mongoose from 'mongoose';

const questionSetQuestionSchema = new mongoose.Schema({
  questionset_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionSet',   // Reference to the QuestionSet collection
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',      // Reference to the Question collection
    required: true
  },
  question_order: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Composite primary key equivalent can be enforced using unique compound index:
questionSetQuestionSchema.index({ questionset_id: 1, question_id: 1 }, { unique: true });

// Explicitly set collection name to match MongoDB collection: 'questionsetsquestion'
export default mongoose.models.QuestionSetQuestion || mongoose.model('QuestionSetQuestion', questionSetQuestionSchema, 'questionsetsquestion');
