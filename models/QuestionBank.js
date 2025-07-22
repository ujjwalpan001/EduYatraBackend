import mongoose from 'mongoose';

// Define the schema
const questionBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true // Ensure question bank names are unique
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'shared'],
    default: 'private'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  },
  deleted_at: {
    type: Date,
    default: null
  }
});

// Export the model, reusing existing model if already compiled
export default mongoose.models.QuestionBank || mongoose.model('QuestionBank', questionBankSchema);