import express from "express";
import multer from "multer";
import * as musicController from "../controller/music.controller.js";
import { verifyToken, verifyArtist } from "../middlewares/auth.middlewares.js";
import { validateMusicUpload, validateSearchQuery } from "../middlewares/validation.middlewares.js";

const router = express.Router();

// Configure multer for in-memory storage

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for music
  },
  fileFilter: (req, file, cb) => {
    const allowedMusicMimes = [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/flac",
      "audio/mp4",
    ];
    const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];

    if (
      file.fieldname === "music" &&
      allowedMusicMimes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else if (
      file.fieldname === "coverImage" &&
      allowedImageMimes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type for ${file.fieldname}. Allowed types: ${file.fieldname === "music" ? "MP3, WAV, OGG, FLAC, M4A" : "JPEG, PNG, WebP"}`
        )
      );
    }
  },
});

// ─── Queue Routes (must come before /:musicId) ──────────────────────────────

router.get("/queue",                verifyToken, musicController.getQueue);
router.post("/queue",               verifyToken, musicController.setQueue);
router.post("/queue/add",           verifyToken, musicController.addToQueue);
router.post("/queue/next",          verifyToken, musicController.nextTrack);
router.post("/queue/prev",          verifyToken, musicController.prevTrack);

// ─── Library Routes (must come before /:musicId) ─────────────────────────────

router.get("/library/liked",            verifyToken, musicController.getLikedSongs);
router.get("/history/recently-played",  verifyToken, musicController.getRecentlyPlayed);
router.get("/recommendations",          verifyToken, musicController.getRecommendations);

// ─── Creator Routes (must come before /:musicId) ─────────────────────────────

router.get("/creator/stats",        verifyToken, verifyArtist, musicController.getCreatorStats);
router.get("/artist-musics",        verifyToken, verifyArtist, musicController.getArtistOwnMusic);

// ─── Public Routes ───────────────────────────────────────────────────────────

router.get("/",                     musicController.getAllMusic);
router.get("/search",               validateSearchQuery, musicController.searchMusic);
router.get("/genre/:genre",         musicController.getMusicByGenre);
router.get("/artist/:artistId",     musicController.getMusicByArtist);
router.get("/:musicId",             musicController.getMusicById);
router.get("/:musicId/related",     musicController.getRelatedTracks);

// ─── Protected Routes — Auth Required ────────────────────────────────────────

// Play tracking (optionally authenticated — increments count + saves history if logged in)
router.post(
  "/:musicId/play",
  (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (token) return verifyToken(req, res, next);
    next();
  },
  musicController.trackPlay
);

// Like / unlike
router.post("/:musicId/like",       verifyToken, musicController.toggleLike);

// Upload — creator only
router.post(
  "/upload",
  verifyToken,
  verifyArtist,
  upload.fields([
    { name: "music",       maxCount: 1 },
    { name: "coverImage",  maxCount: 1 },
  ]),
  validateMusicUpload,
  musicController.uploadMusic
);

// Update / delete — creator only
router.patch("/:musicId",   verifyToken, verifyArtist, musicController.updateMusic);
router.delete("/:musicId",  verifyToken, verifyArtist, musicController.deleteMusic);

// ─── Multer error handler ─────────────────────────────────────────────────────

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "FILE_TOO_LARGE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds limit (100MB)",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
});

export default router;
