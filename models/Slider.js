// backend/models/Slider.js
import mongoose from 'mongoose';

const sliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  image_url: {
    type: String,
    required: true,
  },
  link_url: {
    type: String,
  },
  display_order: {
    type: Number,
    default: 0,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  start_date: {
    type: Date,
    default: null,
  },
  end_date: {
    type: Date,
    default: null,
  },
  target_audience: {
    type: String,
    enum: ['all', 'student', 'teacher', 'admin'],
    default: 'all',
  },
  click_count: {
    type: Number,
    default: 0,
  },
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

sliderSchema.index({ is_active: 1, display_order: 1 });
sliderSchema.index({ start_date: 1, end_date: 1 });

const Slider = mongoose.model('Slider', sliderSchema);
export default Slider;
