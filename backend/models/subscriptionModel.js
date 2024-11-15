import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  tier: {
    type: String,
    enum: ['basic', 'pro'],
    default: 'basic'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  cancelledAt: {
    type: Date
  }
});

subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Subscription', subscriptionSchema);