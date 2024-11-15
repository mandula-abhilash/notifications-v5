import amqp from 'amqplib';
import { config } from './config.js';

let channel, connection;

export const setupRabbitMQ = async () => {
  try {
    connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();

    // Declare queues
    await channel.assertQueue('notifications', { durable: true });
    await channel.assertQueue('reports', { durable: true });

    return channel;
  } catch (error) {
    console.error('RabbitMQ setup error:', error);
    throw error;
  }
};

export const publishToQueue = async (queueName, data) => {
  try {
    await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
      persistent: true
    });
  } catch (error) {
    console.error('Error publishing to queue:', error);
    throw error;
  }
};

export const consumeQueue = async (queueName, callback) => {
  try {
    await channel.consume(queueName, (data) => {
      callback(JSON.parse(data.content));
      channel.ack(data);
    });
  } catch (error) {
    console.error('Error consuming queue:', error);
    throw error;
  }
};

export const closeConnection = async () => {
  try {
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
    throw error;
  }
};