const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  permissions_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100
  },
  description: {
    type: String // 'text' in SQL maps to String in MongoDB
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Permission', permissionSchema);
