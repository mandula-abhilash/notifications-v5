import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { publishToQueue } from '../config/rabbitmq.js';
import { redisClient } from '../config/redis.js';

const SOCKET_USER_PREFIX = 'socket:user:';
const USER_SOCKETS_PREFIX = 'user:sockets:';

export const initializeSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.id;
      
      // Store socket connection in Redis
      await redisClient.sadd(`${USER_SOCKETS_PREFIX}${socket.userId}`, socket.id);
      await redisClient.set(`${SOCKET_USER_PREFIX}${socket.id}`, socket.userId);
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Remove this socket from Redis
      await redisClient.srem(`${USER_SOCKETS_PREFIX}${socket.userId}`, socket.id);
      await redisClient.del(`${SOCKET_USER_PREFIX}${socket.id}`);

      // Check if this was the last socket for this user
      const remainingSockets = await redisClient.smembers(`${USER_SOCKETS_PREFIX}${socket.userId}`);
      if (remainingSockets.length === 0) {
        // If no sockets left, remove the user's socket set entirely
        await redisClient.del(`${USER_SOCKETS_PREFIX}${socket.userId}`);
        console.log(`Removed all Redis entries for user: ${socket.userId}`);
      }
    });

    // Handle logout from all devices
    socket.on('logoutAll', async () => {
      const userSockets = await redisClient.smembers(`${USER_SOCKETS_PREFIX}${socket.userId}`);
      
      // Emit logout event to all user's sockets
      userSockets.forEach(socketId => {
        io.to(socketId).emit('forceLogout');
      });

      // Clean up all Redis entries for this user
      await Promise.all([
        // Remove the user's socket set
        redisClient.del(`${USER_SOCKETS_PREFIX}${socket.userId}`),
        // Remove all individual socket mappings
        ...userSockets.map(socketId => redisClient.del(`${SOCKET_USER_PREFIX}${socketId}`))
      ]);

      // Disconnect all sockets
      userSockets.forEach(socketId => {
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) {
          clientSocket.disconnect(true);
        }
      });

      console.log(`Force logged out and cleaned up all sessions for user: ${socket.userId}`);
    });

    // Handle report generation request
    socket.on('generateReport', async (data) => {
      try {
        await publishToQueue('reports', {
          userId: socket.userId,
          ...data
        });
        
        // Get all socket IDs for this user
        const userSockets = await redisClient.smembers(`${USER_SOCKETS_PREFIX}${socket.userId}`);
        
        // Notify all user's connected devices
        userSockets.forEach(socketId => {
          io.to(socketId).emit('reportQueued', {
            message: 'Report generation has been queued'
          });
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to queue report generation'
        });
      }
    });
  });

  return io;
};

// Utility function to emit to all user's connected sockets
export const emitToUser = async (userId, event, data) => {
  const userSockets = await redisClient.smembers(`${USER_SOCKETS_PREFIX}${userId}`);
  if (userSockets.length > 0) {
    userSockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
    return true;
  }
  return false; // Return false if no active sockets found
};