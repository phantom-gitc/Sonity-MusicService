import app from './src/app.js';
import connectDB from './src/db/db.js';
import config from './src/config/config.js';

async function startServer() {
  await connectDB();



// Start the server

  app.listen(config.PORT, () => {
    console.log(`Music Service Running on Port ${config.PORT} 🎵`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start Music service:', error);
  process.exit(1);
});