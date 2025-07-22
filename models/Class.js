const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  class_name: {
    type: String,
    required: true,
    maxlength: 255,
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  invitation_code: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
  },
  institute_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  max_students: {
    type: Number,
    default: null,
  },
  students: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    userId: { type: String, required: true },
    isSelected: { type: Boolean, default: false },
  }],
  is_active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  versionKey: false,
});

// Update updated_at before saving
classSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Class', classSchema);