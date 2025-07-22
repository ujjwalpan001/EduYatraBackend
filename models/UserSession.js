const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  user_sessions_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // references users collection
    required: true
  },
  session_token: {
    type: String,
    required: true,
    unique: true,
    maxlength: 255
  },
  expires_at: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserSession', userSessionSchema);
