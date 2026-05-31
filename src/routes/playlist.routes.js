import express from "express";
import multer from "multer";
import * as playlistController from "../controller/playlist.controller.js";
import { verifyToken } from "../middlewares/auth.middlewares.js";
import { validatePlaylist } from "../middlewares/validation.middlewares.js";
import { isValidMediaBuffer } from "../utils/file-validation.utils.js";

const router = express.Router();

function validateCoverContent(req, res, next) {
  if (req.file && !isValidMediaBuffer(req.file)) {
    return res.status(400).json({ success: false, message: "Invalid playlist cover content" });
  }
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type for coverImage. Allowed types: JPEG, PNG, WebP"));
    }
  },
});


// GET  /api/playlist
router.get("/", playlistController.getPublicPlaylists);

// GET /api/playlist/library/saved
router.get("/library/saved", verifyToken, playlistController.getSavedPlaylists);

// GET  /api/playlist/user/my-playlists
router.get("/user/my-playlists", verifyToken, playlistController.getMyPlaylists);

// POST /api/playlist
router.post("/", verifyToken, upload.single("coverImage"), validateCoverContent, validatePlaylist, playlistController.createPlaylist);


// GET  /api/playlist/:playlistId
router.get("/:playlistId", (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (token) {
    return verifyToken(req, res, next);   
  }
  next();                                 
}, playlistController.getPlaylistById);

// GET /api/playlist/:playlistId/play-all
router.get("/:playlistId/play-all", playlistController.playAllPlaylist);

// GET /api/playlist/:playlistId/shuffle
router.get("/:playlistId/shuffle", playlistController.shufflePlaylist);

// PATCH /api/playlist/:playlistId/visibility
router.patch(
  "/:playlistId/visibility",
  verifyToken,
  playlistController.togglePlaylistVisibility
);

// POST /api/playlist/:playlistId/save
router.post(
  "/:playlistId/save",
  verifyToken,
  playlistController.toggleSavePlaylist
);

// POST  /api/playlist/:playlistId/songs/:musicId
router.post(
  "/:playlistId/songs/:musicId",
  verifyToken,
  playlistController.addSongToPlaylist
);

// DELETE /api/playlist/:playlistId/songs/:musicId
router.delete(
  "/:playlistId/songs/:musicId",
  verifyToken,
  playlistController.removeSongFromPlaylist
);

// PATCH /api/playlist/:playlistId
router.patch(
  "/:playlistId",
  verifyToken,
  upload.single("coverImage"),
  validateCoverContent,
  validatePlaylist,
  playlistController.updatePlaylist
);

// DELETE /api/playlist/:playlistId
router.delete("/:playlistId", verifyToken, playlistController.deletePlaylist);

export default router;
