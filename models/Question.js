import mongoose from 'mongoose';

const { Schema } = mongoose;

const questionSchema = new mongoose.Schema({
  latex_code: { type: String, required: true },
  katex_code: { type: String, required: true },
  level: { type: String, maxlength: 50 },
  image: { type: String, maxlength: 500 },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  question_type: { type: String, maxlength: 50, required: true },
  correct_option_latex: { type: String, required: true },
  correct_option_katex: { type: String, required: true },
  incorrect_option_latex: [{ type: String, required: true }],
  incorrect_option_katex: [{ type: String, required: true }],
  topic: { type: String, maxlength: 100 },
  Sub_topic: { type: String, maxlength: 100 },
  bloom_level: { type: String, maxlength: 50 },
  solution_latex: { type: String },
  katex_solution: { type: String },
  subject: { type: String, maxlength: 100, required: true },
  question_stats: { type: mongoose.Schema.Types.Mixed, default: {} },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'public', maxlength: 20 },
  question_bank_id: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionBank", required: true },
  difficulty_rating: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date },
  deleted_at: { type: Date }
});

// Indexes for performance
questionSchema.index({ institute_id: 1, course_id: 1 });
questionSchema.index({ question_bank_id: 1 });

// Export the model, reusing existing model if already compiled
export default mongoose.models.Question || mongoose.model('Question', questionSchema);