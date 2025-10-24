import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false  // Made optional - can be assigned later via assignGroup
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question_bank_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true
  },
  question_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  number_of_sets: {
    type: Number,
    default: 1,
    min: 1
  },
  number_of_questions_per_set: {
    type: Number,
    default: 1,
    min: 1
  },
  duration_minutes: {
    type: Number,
    required: true
  },
  start_time: {
    type: Date,
    required: false  // Optional - set when exam is assigned to group
  },
  end_time: {
    type: Date,
    required: false  // Optional - set when exam is assigned to group
  },
  expiring_hours: {
    type: Number,
    default: 1,
    min: 0
  },
  is_published: {
    type: Boolean,
    default: false
  },
  is_ended: {
    type: Boolean,
    default: false
  },
  manually_ended_at: {
    type: Date,
    default: null
  },
  allow_review: {
    type: Boolean,
    default: false
  },
  shuffle_questions: {
    type: Boolean,
    default: false
  },
  shuffle_options: {
    type: Boolean,
    default: false
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
}, {
  strictPopulate: false
});

export default mongoose.models.Exam || mongoose.model('Exam', examSchema);