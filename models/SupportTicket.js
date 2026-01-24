// backend/models/SupportTicket.js
import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  ticket_number: {
    type: String,
    required: true,
    unique: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'feature_request', 'bug_report', 'general'],
    default: 'general',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  responses: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    message: String,
    created_at: {
      type: Date,
      default: Date.now,
    },
  }],
  attachments: [{
    filename: String,
    url: String,
  }],
  resolved_at: {
    type: Date,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

supportTicketSchema.index({ user_id: 1, status: 1 });
supportTicketSchema.index({ ticket_number: 1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
