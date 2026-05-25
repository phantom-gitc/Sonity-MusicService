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

// Public Routes - No authentication required


router.get("/", musicController.getAllMusic);
router.get("/search", validateSearchQuery, musicController.searchMusic);
router.get("/genre/:genre", musicController.getMusicByGenre);
router.get("/artist/:artistId", musicController.getMusicByArtist);
router.get("/artist-musics", verifyToken, verifyArtist, musicController.getArtistOwnMusic);
router.get("/:musicId", musicController.getMusicById);

// Protected Routes - Authentication required


router.post("/upload",verifyToken,verifyArtist,upload.fields([
    { name: "music", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),validateMusicUpload,musicController.uploadMusic
);

// Only artist or admin who uploaded can update/delete

router.patch("/:musicId", verifyToken, verifyArtist, musicController.updateMusic);
router.delete("/:musicId", verifyToken, verifyArtist, musicController.deleteMusic);

// Error handling middleware for multer

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
