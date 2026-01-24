// backend/models/Subscription.js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  institute_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
  },
  plan_name: {
    type: String,
    required: true,
    enum: ['free', 'basic', 'premium', 'enterprise'],
  },
  plan_type: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'pending',
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
  payment_method: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet'],
  },
  transaction_id: {
    type: String,
  },
  auto_renew: {
    type: Boolean,
    default: false,
  },
  features: {
    max_students: Number,
    max_classes: Number,
    max_tests: Number,
    storage_gb: Number,
    support_level: String,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

subscriptionSchema.index({ user_id: 1, status: 1 });
subscriptionSchema.index({ end_date: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
