// backend/models/AdminCode.js
import mongoose from 'mongoose';

const adminCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  institute: {
    type: String,
    required: true,
    trim: true,
  },
  isSuperAdminCode: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  maxUses: {
    type: Number,
    default: null, // null means unlimited
  },
  expiresAt: {
    type: Date,
    default: null, // null means never expires
  },
}, {
  timestamps: true,
});

// Index for faster lookups
adminCodeSchema.index({ code: 1, isActive: 1 });

const AdminCode = mongoose.model('AdminCode', adminCodeSchema);

export default AdminCode;
