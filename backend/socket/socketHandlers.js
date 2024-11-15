import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import { publishToQueue } from "../config/rabbitmq.js";
import { redisClient } from "../config/redis.js";

const SOCKET_USER_PREFIX = "socket:user:";
const USER_SOCKETS_PREFIX = "user:sockets:";

let io;

export const initializeSocketHandlers = (socketIo) => {
  io = socketIo;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.id;

      await redisClient.sadd(
        `${USER_SOCKETS_PREFIX}${socket.userId}`,
        socket.id
      );
      await redisClient.set(`${SOCKET_USER_PREFIX}${socket.id}`, socket.userId);

      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.userId}`);

      await redisClient.srem(
        `${USER_SOCKETS_PREFIX}${socket.userId}`,
        socket.id
      );
      await redisClient.del(`${SOCKET_USER_PREFIX}${socket.id}`);

      const remainingSockets = await redisClient.smembers(
        `${USER_SOCKETS_PREFIX}${socket.userId}`
      );
      if (remainingSockets.length === 0) {
        await redisClient.del(`${USER_SOCKETS_PREFIX}${socket.userId}`);
      }
    });

    socket.on("logoutAll", async () => {
      const userSockets = await redisClient.smembers(
        `${USER_SOCKETS_PREFIX}${socket.userId}`
      );

      userSockets.forEach((socketId) => {
        io.to(socketId).emit("forceLogout");
      });

      await Promise.all([
        redisClient.del(`${USER_SOCKETS_PREFIX}${socket.userId}`),
        ...userSockets.map((socketId) =>
          redisClient.del(`${SOCKET_USER_PREFIX}${socketId}`)
        ),
      ]);

      userSockets.forEach((socketId) => {
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) {
          clientSocket.disconnect(true);
        }
      });
    });

    socket.on("generateReport", async (data) => {
      try {
        await publishToQueue("reports", {
          userId: socket.userId,
          ...data,
        });

        const userSockets = await redisClient.smembers(
          `${USER_SOCKETS_PREFIX}${socket.userId}`
        );
        userSockets.forEach((socketId) => {
          io.to(socketId).emit("reportQueued", {
            message: "Report generation has been queued",
          });
        });
      } catch (error) {
        socket.emit("error", {
          message: "Failed to queue report generation",
        });
      }
    });
  });

  return io;
};

export const emitToUser = async (userId, event, data) => {
  if (!io) {
    console.error("Socket.IO not initialized");
    return false;
  }

  const userSockets = await redisClient.smembers(
    `${USER_SOCKETS_PREFIX}${userId}`
  );
  if (userSockets.length > 0) {
    userSockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
    return true;
  }
  return false;
};
