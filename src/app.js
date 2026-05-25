import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import musicRoutes    from "./routes/music.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import albumRoutes    from "./routes/album.routes.js";

// Initialize Express app
const app = express();

// CORS — allow frontend to send cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(morgan("dev")); // Request logging
app.use(express.json({ limit: "50mb" })); // JSON body parser with larger limit
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser()); // Cookie parser

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Music Service is healthy",
    timestamp: new Date().toISOString(),
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