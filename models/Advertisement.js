// backend/models/Advertisement.js
import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true,
  },
  content: {
    type: String,
  },
  image_url: {
    type: String,
    required: true,
  },
  link_url: {
    type: String,
  },
  ad_type: {
    type: String,
    enum: ['banner', 'popup', 'inline', 'video'],
    default: 'banner',
  },
  placement: {
    type: String,
    enum: ['homepage', 'dashboard', 'test_page', 'results_page', 'sidebar', 'footer'],
    default: 'homepage',
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
  click_count: {
    type: Number,
    default: 0,
  },
  impression_count: {
    type: Number,
    default: 0,
  },
  budget: {
    type: Number,
    default: 0,
  },
  cost_per_click: {
    type: Number,
    default: 0,
  },
  target_audience: {
    type: String,
    enum: ['all', 'student', 'teacher'],
    default: 'all',
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

advertisementSchema.index({ is_active: 1, placement: 1 });
advertisementSchema.index({ start_date: 1, end_date: 1 });

const Advertisement = mongoose.model('Advertisement', advertisementSchema);
export default Advertisement;
