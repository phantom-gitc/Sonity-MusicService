import express from "express";
import multer from "multer";
import * as albumController from "../controller/album.controller.js";
import { verifyToken, verifyArtist } from "../middlewares/auth.middlewares.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for cover images
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

// Public routes
router.get("/", albumController.getAlbums);
router.get("/:albumId", albumController.getAlbumById);

// Protected routes (Creators only)
router.post(
  "/",
  verifyToken,
  verifyArtist,
  upload.single("coverImage"),
  albumController.createAlbum
);

router.patch(
  "/:albumId",
  verifyToken,
  verifyArtist,
  upload.single("coverImage"),
  albumController.updateAlbum
);

router.delete("/:albumId", verifyToken, verifyArtist, albumController.deleteAlbum);

router.post("/:albumId/songs/:musicId", verifyToken, verifyArtist, albumController.addSongToAlbum);
router.delete("/:albumId/songs/:musicId", verifyToken, verifyArtist, albumController.removeSongFromAlbum);

export default router;
