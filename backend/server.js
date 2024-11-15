import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from './config/config.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import { setupRabbitMQ } from './config/rabbitmq.js';
import { initializeSocketHandlers } from './socket/socketHandlers.js';
import { startNotificationWorker } from './workers/notificationWorker.js';
import { startSubscriptionWorker } from './workers/subscriptionWorker.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    credentials: true
  }
});

// Redis setup for Socket.IO
const pubClient = new Redis(config.redisUrl);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Socket.IO handlers
initializeSocketHandlers(io);

// Error handling
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    await setupRabbitMQ();
    console.log('Connected to RabbitMQ');

    // Start workers
    await startNotificationWorker();
    await startSubscriptionWorker();

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();