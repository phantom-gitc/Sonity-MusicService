import musicModel from "../models/music.models.js";
import playlistModel from "../models/playlist.model.js";
import { analyzePlaylistPrompt } from "../services/ai.service.js";

/**
 * Generates an AI playlist based on prompt using Gemini
 * POST /api/music/ai/generate-playlist
 */
export const generateAiPlaylist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, limit = 15, isPublic = false } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "A text prompt is required to generate an AI playlist."
      });
    }

    // Fetch candidate catalog songs (limit to published songs)
    const catalog = await musicModel.find({ isPublished: { $ne: false } })
      .select("_id title artist genre mood tags playCount")
      .limit(100)
      .lean();

    if (!catalog || catalog.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No songs available in the database catalog to generate a playlist."
      });
    }

    // Call Gemini AI service
    const aiResult = await analyzePlaylistPrompt(prompt, catalog);

    let songIds = [];

    if (aiResult.matchedSongIds && Array.isArray(aiResult.matchedSongIds) && aiResult.matchedSongIds.length > 0) {
      // Validate returned IDs exist in catalog
      const existingIds = new Set(catalog.map(s => s._id.toString()));
      songIds = aiResult.matchedSongIds.filter(id => existingIds.has(id));
    }

    // Fallback: search by keywords or genres if AI returned few or invalid IDs
    if (songIds.length < 3) {
      const regexQueries = [];
      if (aiResult.recommendedGenres?.length) {
        regexQueries.push({ genre: { $in: aiResult.recommendedGenres.map(g => new RegExp(g, "i")) } });
      }
      if (aiResult.searchKeywords?.length) {
        aiResult.searchKeywords.forEach(kw => {
          regexQueries.push({ title: { $regex: kw, $options: "i" } });
          regexQueries.push({ tags: { $regex: kw, $options: "i" } });
        });
      }

      if (regexQueries.length > 0) {
        const fallbackSongs = await musicModel.find({
          $or: regexQueries,
          isPublished: { $ne: false }
        })
        .limit(limit)
        .select("_id")
        .lean();

        const fallbackIds = fallbackSongs.map(s => s._id.toString());
        songIds = Array.from(new Set([...songIds, ...fallbackIds]));
      }
    }

    // Ultimate fallback if still no matches: top played songs
    if (songIds.length === 0) {
      const topSongs = catalog
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, Math.min(limit, catalog.length));
      songIds = topSongs.map(s => s._id.toString());
    }

    // Truncate to requested limit
    songIds = songIds.slice(0, limit);

    // Create the playlist in DB
    const newPlaylist = await playlistModel.create({
      name: aiResult.title || `AI: ${prompt.slice(0, 30)}`,
      description: aiResult.description || `AI Generated Playlist based on prompt: "${prompt}"`,
      userId: userId,
      songs: songIds,
      isPublic: Boolean(isPublic)
    });

    // Populate created playlist details
    const populatedPlaylist = await playlistModel.findById(newPlaylist._id)
      .populate({
        path: "songs",
        select: "title artist audioUrl coverImage duration genre playCount"
      })
      .lean();

    return res.status(201).json({
      success: true,
      message: "AI Playlist generated successfully",
      data: {
        playlist: populatedPlaylist,
        aiAnalysis: {
          prompt,
          recommendedGenres: aiResult.recommendedGenres || [],
          searchKeywords: aiResult.searchKeywords || []
        }
      }
    });

  } catch (error) {
    console.error("Error generating AI playlist:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate AI playlist"
    });
  }
};
