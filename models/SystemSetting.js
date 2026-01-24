const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  setting_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  setting_key: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100
  },
  setting_value: {
    type: mongoose.Schema.Types.Mixed, // JSON type in SQL
    required: true
  },
  description: {
    type: String
  },
  is_public: {
    type: Boolean,
    default: false
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'system_settings' });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
