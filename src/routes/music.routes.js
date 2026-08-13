import express from "express";
import multer from "multer";
import * as musicController from "../controller/music.controller.js";
import { verifyToken, verifyArtist } from "../middlewares/auth.middlewares.js";
import { validateMusicUpload, validateSearchQuery } from "../middlewares/validation.middlewares.js";
import { isValidMediaBuffer } from "../utils/file-validation.utils.js";

const router = express.Router();

function validateUploadedMediaContent(req, res, next) {
  const files = Object.values(req.files || {}).flat();
  const invalidFile = files.find((file) => !isValidMediaBuffer(file));

  if (invalidFile) {
    return res.status(400).json({
      success: false,
      message: `Invalid file content for ${invalidFile.fieldname}`,
    });
  }

  next();
}

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

// ─── Queue Routes (must come before /:musicId) 

router.get("/queue",                verifyToken, musicController.getQueue);
router.post("/queue",               verifyToken, musicController.setQueue);
router.post("/queue/add",           verifyToken, musicController.addToQueue);
router.post("/queue/next",          verifyToken, musicController.nextTrack);
router.post("/queue/prev",          verifyToken, musicController.prevTrack);

// ─── Library Routes (must come before /:musicId) ─────────────────────────────

router.get("/library/liked",            verifyToken, musicController.getLikedSongs);
router.get("/history/recently-played",  verifyToken, musicController.getRecentlyPlayed);
router.get("/recommendations",          verifyToken, musicController.getRecommendations);
router.get("/library/followed-artists", verifyToken, musicController.getFollowedArtists);
router.get("/library/followed-users", verifyToken, musicController.getFollowedUsers);

// ─── Creator Routes (must come before /:musicId) ─────────────────────────────

router.get("/creator/stats",        verifyToken, verifyArtist, musicController.getCreatorStats);
router.get("/creator/analytics",    verifyToken, verifyArtist, musicController.getCreatorAnalyticsV2);
router.get("/creator/followers",    verifyToken, verifyArtist, musicController.getArtistFollowers);
router.get("/artist-musics",        verifyToken, verifyArtist, musicController.getArtistOwnMusic);

// ─── Public Routes ───────────────────────────────────────────────────────────

// Helper: optionally verify token without blocking unauthenticated requests
function optionalAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (token) return verifyToken(req, res, next);
  next();
}

router.get("/",                     optionalAuth, musicController.getAllMusic);
router.get("/search",               validateSearchQuery, musicController.searchMusic);
router.get("/genre/:genre",         musicController.getMusicByGenre);
router.get("/artist/:artistId",     optionalAuth, musicController.getMusicByArtist);
router.get("/artist/:artistId/monthly-listeners", musicController.getArtistMonthlyListeners);
router.post("/artist/:artistId/follow", verifyToken, musicController.toggleFollowArtist);
router.post("/user/:userId/follow", verifyToken, musicController.toggleFollowUser);

router.get("/user/:userId/follow-stats", optionalAuth, musicController.getUserFollowStats);
router.get("/:musicId",             optionalAuth, musicController.getMusicById);
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
  validateUploadedMediaContent,
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
