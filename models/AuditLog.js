const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  audit_log_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  table_name: {
    type: String,
    required: true
  },
  record_id: {
    type: Number, // Can also be ObjectId if your record IDs are ObjectId
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'READ'] // Optional: limit actions
  },
  old_values: {
    type: mongoose.Schema.Types.Mixed // JSON object
  },
  new_values: {
    type: mongoose.Schema.Types.Mixed // JSON object
  },
  changed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
  changed_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'audit_log' });

module.exports = mongoose.model('AuditLog', auditLogSchema);
