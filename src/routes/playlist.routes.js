import express from "express";
import * as playlistController from "../controller/playlist.controller.js";
import { verifyToken } from "../middlewares/auth.middlewares.js";
import { validatePlaylist } from "../middlewares/validation.middlewares.js";

const router = express.Router();


// GET  /api/playlist

router.get("/", playlistController.getPublicPlaylists);


// GET  /api/playlist/user/my-playlists


router.get("/user/my-playlists", verifyToken, playlistController.getMyPlaylists);

// POST /api/playlist

router.post("/", verifyToken, validatePlaylist, playlistController.createPlaylist);


// GET  /api/playlist/:playlistId


router.get("/:playlistId", (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (token) {
    return verifyToken(req, res, next);   
  }
  next();                                 
}, playlistController.getPlaylistById);

// PATCH /api/playlist/:playlistId/visibility

router.patch(
  "/:playlistId/visibility",
  verifyToken,
  playlistController.togglePlaylistVisibility
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
  validatePlaylist,
  playlistController.updatePlaylist
);

// DELETE /api/playlist/:playlistId

router.delete("/:playlistId", verifyToken, playlistController.deletePlaylist);

export default router;
