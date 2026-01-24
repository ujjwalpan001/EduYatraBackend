const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    maxlength: 50
  },
  is_read: {
    type: Boolean,
    default: false
  },
  related_entity_type: {
    type: String,
    maxlength: 50
  },
  related_entity_id: {
    type: mongoose.Schema.Types.Mixed // Can be integer or ObjectId
  },
  expires_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'notifications' });

module.exports = mongoose.model('Notification', notificationSchema);
