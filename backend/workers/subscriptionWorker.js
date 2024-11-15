import { consumeQueue } from '../config/rabbitmq.js';
import Subscription from '../models/subscriptionModel.js';
import { createNotification } from '../routes/notificationRoutes.js';

const processSubscriptionUpdates = async () => {
  try {
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      tier: 'pro',
      expiryDate: { $lt: new Date() }
    });

    for (const subscription of expiredSubscriptions) {
      subscription.tier = 'basic';
      subscription.status = 'expired';
      await subscription.save();

      // Notify user about subscription expiry
      await createNotification(
        subscription.userId,
        'Subscription Expired',
        'Your Pro subscription has expired. You have been moved to the Basic plan.',
        'warning'
      );
    }
  } catch (error) {
    console.error('Error processing subscription updates:', error);
  }
};

export const startSubscriptionWorker = async () => {
  // Run subscription check every hour
  setInterval(processSubscriptionUpdates, 60 * 60 * 1000);
  console.log('Subscription worker started');
};