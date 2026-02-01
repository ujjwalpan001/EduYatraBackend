// backend/models/Slider.js
import mongoose from 'mongoose';

const sliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image_url: {
    type: String,
    required: true
  },
  link_url: {
    type: String,
    trim: true
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
    enum: ['all', 'students', 'teachers', 'admins'],
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

// Index for efficient querying
sliderSchema.index({ is_active: 1, display_order: 1 });
sliderSchema.index({ target_audience: 1 });

const Slider = mongoose.model('Slider', sliderSchema);
export default Slider;
