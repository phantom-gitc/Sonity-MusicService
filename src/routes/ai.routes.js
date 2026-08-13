import express from "express";
import { verifyToken } from "../middlewares/auth.middlewares.js";
import { generateAiPlaylist } from "../controller/ai.controller.js";

const router = express.Router();

/**
 * @route   POST /api/music/ai/generate-playlist
 * @desc    Generate an AI playlist based on user prompt using Gemini 3.6 Flash
 * @access  Private
 */
router.post("/generate-playlist", verifyToken, generateAiPlaylist);

export default router;
