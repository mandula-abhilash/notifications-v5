import Redis from 'ioredis';
import { config } from './config.js';

export const redisClient = new Redis(config.redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Utility functions for managing socket connections
export const addUserSocket = async (userId, socketId) => {
  await redisClient.sadd(`user:sockets:${userId}`, socketId);
};

export const removeUserSocket = async (userId, socketId) => {
  await redisClient.srem(`user:sockets:${userId}`, socketId);
};

export const getUserSockets = async (userId) => {
  return await redisClient.smembers(`user:sockets:${userId}`);
};

export const clearUserSockets = async (userId) => {
  await redisClient.del(`user:sockets:${userId}`);
};