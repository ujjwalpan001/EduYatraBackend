const mongoose = require('mongoose');

const userPermissionSchema = new mongoose.Schema({
  user_permissions_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // references users._id
    required: true
  },
  permission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission', // references permissions._id
    required: true
  },
  granted_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Compound unique index for (user_id, permission_id) — similar to primary key
userPermissionSchema.index({ user_id: 1, permission_id: 1 }, { unique: true });

module.exports = mongoose.model('UserPermission', userPermissionSchema);
