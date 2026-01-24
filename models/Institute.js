import mongoose from 'mongoose';

const instituteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 255,
    unique: true // Ensure unique institute names
  },
  location: {
    type: String,
    maxlength: 255
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

// Virtual for is_deleted
instituteSchema.virtual('is_deleted').get(function() {
  return !!this.deleted_at;
});

export default mongoose.models.Institute || mongoose.model('Institute', instituteSchema);