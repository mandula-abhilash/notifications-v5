export const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/notification-system',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    sesFromEmail: process.env.SES_FROM_EMAIL
  }
};