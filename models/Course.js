import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String
  },
  course_code: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  },
  deleted_at: {
    type: Date
  }
});

export default mongoose.models.Course || mongoose.model('Course', courseSchema);