import { consumeQueue } from '../config/rabbitmq.js';
import { redisClient } from '../config/redis.js';
import { io } from '../socket/socketHandlers.js';

const processNotification = async (data) => {
  try {
    if (data.type === 'new_notification') {
      const userId = data.notification.userId.toString();
      
      // Get all socket connections for the user from Redis
      const userSockets = await redisClient.smembers(`user:sockets:${userId}`);
      
      // Emit to all user's connected sockets
      userSockets.forEach(socketId => {
        io.to(socketId).emit('newNotification', data.notification);
      });
    }
  } catch (error) {
    console.error('Error processing notification:', error);
  }
};

export const startNotificationWorker = async () => {
  try {
    await consumeQueue('notifications', processNotification);
    console.log('Notification worker started');
  } catch (error) {
    console.error('Error starting notification worker:', error);
    throw error;
  }
};