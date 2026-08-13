import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file
dotenvConfig();

// Configuration object to hold all the configuration variables

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT) || 3002,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  RABBITMQ_URI: process.env.RABBITMQ_URI || process.env.RABITMQ_URI,
  
  // Cloudinary configuration

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Service URLs
  
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "http://localhost:3000",
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3001",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
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
