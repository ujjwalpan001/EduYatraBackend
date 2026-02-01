// backend/models/Poster.js
import mongoose from 'mongoose';

const posterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  poster_type: {
    type: String,
    enum: ['announcement', 'notice', 'event', 'exam', 'holiday', 'important', 'general'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  image_url: {
    type: String
  },
  attachment_urls: [{
    type: String
  }],
  target_audience: {
    type: String,
    enum: ['all', 'students', 'teachers', 'admins', 'specific'],
    default: 'all'
  },
  target_classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  is_pinned: {
    type: Boolean,
    default: false
  },
  start_date: {
    type: Date
  },
  end_date: {
    type: Date
  },
  view_count: {
    type: Number,
    default: 0
  },
  likes_count: {
    type: Number,
    default: 0
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
posterSchema.index({ is_active: 1, priority: -1, created_at: -1 });
posterSchema.index({ poster_type: 1 });
posterSchema.index({ target_audience: 1 });
posterSchema.index({ is_pinned: -1, created_at: -1 });

const Poster = mongoose.model('Poster', posterSchema);
export default Poster;
