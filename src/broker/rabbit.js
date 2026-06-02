import amqp from 'amqplib';
import config from '../config/config.js';

let channel, connection;

export async function connectRabbitMQ() {
  try {
    const rabbitUri = config.RABBITMQ_URI || config.RABITMQ_URI;
    if (!rabbitUri) {
      console.warn("⚠️ RabbitMQ URI not configured. Running in offline mode without message broker.");
      return;
    }
    const rabbitHost = rabbitUri.split('@')[1] || rabbitUri;
    console.log(`Connecting to RabbitMQ at: ${rabbitHost.split('/')[0]}`);
    
    connection = await amqp.connect(rabbitUri);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ 🐰');
  } catch (error) {
    console.warn(`⚠️ Failed to connect to RabbitMQ: ${error.message}. Running in offline mode without message broker.`);
    connection = null;
    channel = null;
  }
}

export async function closeRabbitMQ() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

export async function subscribeToQueue(queueName, callback) {
  if (!channel) {
    console.warn(`⚠️ [Offline Mode] RabbitMQ not connected. Skipping subscription to queue "${queueName}".`);
    return;
  }
  try {
    await channel.assertQueue(queueName, { durable: true });
    channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          await callback(JSON.parse(msg.content.toString()));
          channel.ack(msg);
        } catch (err) {
          console.error(`Error in message processor for queue ${queueName}:`, err.message);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (err) {
    console.error(`❌ Failed to subscribe to queue ${queueName}:`, err.message);
  }
}
