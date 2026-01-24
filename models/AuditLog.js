import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  audit_log_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  table_name: {
    type: String,
    required: false // Make optional for backward compatibility
  },
  record_id: {
    type: mongoose.Schema.Types.Mixed, // Support both Number and String/ObjectId
    required: false // Make optional for backward compatibility
  },
  action: {
    type: String,
    required: true
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
  // Additional fields for backward compatibility
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  entity_type: {
    type: String
  },
  entity_id: {
    type: mongoose.Schema.Types.Mixed
  },
  details: {
    type: String
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
}, { 
  collection: 'audit_log',
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
