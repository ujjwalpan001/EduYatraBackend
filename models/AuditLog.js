import mongoose from 'mongoose';

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
    type: String, // Changed to String to support ObjectId strings
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

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
