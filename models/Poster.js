// backend/models/Poster.js
import mongoose from 'mongoose';

const posterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  image_url: {
    type: String,
  },
  poster_type: {
    type: String,
    enum: ['announcement', 'event', 'achievement', 'general'],
    default: 'general',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  start_date: {
    type: Date,
    default: Date.now,
  },
  end_date: {
    type: Date,
    default: null,
  },
  target_roles: [{
    type: String,
    enum: ['student', 'teacher', 'admin', 'all'],
  }],
  target_grades: [{
    type: String,
  }],
  target_institutes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
  }],
  view_count: {
    type: Number,
    default: 0,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

posterSchema.index({ is_active: 1, priority: 1, start_date: -1 });
posterSchema.index({ target_roles: 1, target_grades: 1 });

const Poster = mongoose.model('Poster', posterSchema);
export default Poster;
