import app from './src/app.js';
import connectDB from './src/db/db.js';
import config from './src/config/config.js';
import mongoose from 'mongoose';

let server;

async function startServer() {
  await connectDB();



// Start the server

  server = app.listen(config.PORT, () => {
    console.log(`Music Service Running on Port ${config.PORT} 🎵`);
  });
}

// Gracefully closes HTTP and database connections during deploy restarts.
async function shutdown(signal) {
  console.log(`${signal} received. Shutting down Music service...`);
  if (server) server.close();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((error) => {
  console.error('Failed to start Music service:', error);
  process.exit(1);
});
