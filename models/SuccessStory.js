// backend/models/SuccessStory.js
import mongoose from 'mongoose';

const successStorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image_url: {
    type: String,
    required: true
  },
  display_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['student', 'teacher', 'institution', 'achievement', 'general'],
    default: 'general'
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
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'success_stories'
});

const SuccessStory = mongoose.model('SuccessStory', successStorySchema);
export default SuccessStory;
