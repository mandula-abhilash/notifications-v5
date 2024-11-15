import dotenv from "dotenv";
dotenv.config();

export const config = {
  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/notification-system",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  },
  rabbitmqUrl: process.env.RABBITMQ_URL || "amqp://localhost",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "us-east-1",
    sesFromEmail: process.env.SES_FROM_EMAIL,
  },
};
