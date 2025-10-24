import mongoose from 'mongoose';

const testSubmissionSchema = new mongoose.Schema({
  exam_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student_email: {
    type: String,
    required: true
  },
  question_set_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionSet',
    required: true
  },
  answers: {
    type: Map,
    of: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  total_questions: {
    type: Number,
    required: true
  },
  correct_answers: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  time_spent_seconds: {
    type: Number,
    required: true
  },
  submission_reason: {
    type: String,
    default: 'Manual submission'
  },
  tab_switches: {
    type: Number,
    default: 0
  },
  fullscreen_exits: {
    type: Number,
    default: 0
  },
  submitted_at: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
testSubmissionSchema.index({ student_id: 1, exam_id: 1 });
testSubmissionSchema.index({ student_email: 1 });

export default mongoose.model('TestSubmission', testSubmissionSchema, 'testsubmissions');
