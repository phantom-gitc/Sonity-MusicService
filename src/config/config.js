import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file
dotenvConfig();

// Configuration object to hold all the configuration variables

const config = {
  PORT: parseInt(process.env.PORT) || 3002,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Cloudinary configuration

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Service URLs
  
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "http://localhost:3000",
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3001",
};

// Validate required environment variables

const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: Missing environment variable: ${envVar}`);
  }
});

export default config;
