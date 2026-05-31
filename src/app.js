import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import musicRoutes    from "./routes/music.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import albumRoutes    from "./routes/album.routes.js";
import mongoose from "mongoose";
import config from "./config/config.js";
import { createRateLimiter, securityHeaders } from "./middlewares/security.middlewares.js";

// Initialize Express app
const app = express();

// CORS — allow frontend to send cookies
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));

app.use(securityHeaders);
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(morgan("dev")); // Request logging
app.use(express.json({ limit: "2mb" })); // JSON body parser; file uploads still use multipart routes
app.use(express.urlencoded({ limit: "2mb", extended: true }));
app.use(cookieParser()); // Cookie parser

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Music Service is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  res.status(isDbReady ? 200 : 503).json({
    success: isDbReady,
    service: "music",
    database: isDbReady ? "connected" : "disconnected",
  });
});

// API Routes
app.use("/api/music",    musicRoutes);
app.use("/api/playlist", playlistRoutes);
app.use("/api/album",    albumRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  const status = error.status || 500;
  const message = error.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error : {},
  });
});

export default app;
