// backend/models/AdminCode.js
import mongoose from 'mongoose';

const adminCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  used_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  used_at: {
    type: Date,
    default: null
  },
  expires_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const AdminCode = mongoose.model('AdminCode', adminCodeSchema);
export default AdminCode;
