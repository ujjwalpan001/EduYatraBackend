import mongoose from 'mongoose';

const classStudentSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joined_at: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  versionKey: false
});

// Composite unique index to prevent duplicate entries
classStudentSchema.index({ class_id: 1, student_id: 1 }, { unique: true });

const ClassStudent = mongoose.model('ClassStudent', classStudentSchema);
export default ClassStudent;
