// backend/models/Advertisement.js
import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  ad_type: {
    type: String,
    enum: ['banner', 'popup', 'sidebar', 'inline', 'video'],
    default: 'banner'
  },
  placement: {
    type: String,
    enum: ['home', 'dashboard', 'class', 'exam', 'global'],
    default: 'home'
  },
  image_url: {
    type: String,
    required: true
  },
  link_url: {
    type: String,
    trim: true
  },
  display_duration: {
    type: Number, // in seconds
    default: 5
  },
  display_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  target_audience: {
    type: String,
    enum: ['all', 'students', 'teachers', 'free_users', 'premium_users'],
    default: 'all'
  },
  start_date: {
    type: Date
  },
  end_date: {
    type: Date
  },
  click_count: {
    type: Number,
    default: 0
  },
  view_count: {
    type: Number,
    default: 0
  },
  budget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  sponsor_name: {
    type: String,
    trim: true
  },
  sponsor_email: {
    type: String,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
advertisementSchema.index({ is_active: 1, placement: 1, display_order: 1 });
advertisementSchema.index({ ad_type: 1 });
advertisementSchema.index({ target_audience: 1 });
advertisementSchema.index({ start_date: 1, end_date: 1 });

const Advertisement = mongoose.model('Advertisement', advertisementSchema);
export default Advertisement;
