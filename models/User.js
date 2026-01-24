// backend/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // user_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   auto: true,
  //   index: true,
  // },
  username: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    maxlength: 254,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    maxlength: 255,
  },
  role: {
    type: String,
    required: true,
    maxlength: 50,
    enum: ['student', 'teacher', 'admin'],
  },
  email_verified: {
    type: Boolean,
    default: false,
  },
  last_login: {
    type: Date,
    default: null,
  },
  failed_login_attempts: {
    type: Number,
    default: 0,
  },
  account_locked_until: {
    type: Date,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
  // Extra fields for different roles
  grade: String,         // for students
  subject: String,       // for teachers
  school: String,        // for teachers
  adminCode: String,     // for admins
  institution: String    // for admins
});

// Automatically update the updated_at field before saving
userSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);
export default User;