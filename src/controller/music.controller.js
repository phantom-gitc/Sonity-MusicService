import mongoose from "mongoose";
import Music from "../models/music.models.js";
import { Like, RecentlyPlayed, Queue } from "../models/interaction.models.js";
import {
  uploadMusicFile,
  uploadCoverImage,
  deleteFromCloudinary,
} from "../services/cloudinary.services.js";

/**
 * Upload new music track
 * Accepts music file and cover image
 */

export async function uploadMusic(req, res) {
  try {
    const { title, artist, genre, album, releaseYear, lyrics } = req.body;
    const { music, coverImage } = req.files || {};

    // Fallback artist to user's full name
    let artistName = artist;
    if (!artistName && req.user?.fullName) {
      artistName = `${req.user.fullName.firstName} ${req.user.fullName.lastName || ""}`.trim();
    }
    if (!artistName) {
      artistName = "Unknown Artist";
    }

    // Validate required fields

    if (!title || !artistName || !genre) {
      return res.status(400).json({
        success: false,
        message: "Title, artist, and genre are required",
      });
    }

    if (!music || !coverImage) {
      return res.status(400).json({
        success: false,
        message: "Both music file and cover image are required",
      });
    }

    // Upload music file to Cloudinary
    const musicUploadResult = await uploadMusicFile(
      music[0].buffer,
      music[0].originalname
    );

    // Upload cover image to Cloudinary
    
    const coverUploadResult = await uploadCoverImage(
      coverImage[0].buffer,
      coverImage[0].originalname
    );

    // Create music record in database
    
    const newMusic = await Music.create({
      title,
      artist: artistName,
      genre,
      album: album || "Unknown",
      releaseYear: releaseYear || new Date().getFullYear(),
      lyrics: lyrics || "",
      musicUrl: musicUploadResult.url,
      coverImageUrl: coverUploadResult.url,
      duration: musicUploadResult.duration,
      artistId: req.user?.id,
      isPublished: true,
      cloudinaryMusicPublicId: musicUploadResult.public_id,
      cloudinaryCoverPublicId: coverUploadResult.public_id,
    });

    return res.status(201).json({
      success: true,
      message: "Music uploaded successfully",
      data: newMusic,
    });
  } catch (error) {
    console.error("Upload music error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload music",
    });
  }
}

/**
 * Get all published music tracks with pagination
 */
export async function getAllMusic(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // cap at 50
    const skip  = (page - 1) * limit;

    const totalMusic = await Music.countDocuments({ isPublished: true });
    const musicTracks = await Music.find({ isPublished: true })
      .select("-lyrics")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Music fetched successfully",
      data: {
        tracks: musicTracks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMusic / limit),
          totalItems: totalMusic,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Get all music error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch music",
    });
  }
}

/**
 * Get single music track by ID
 */
export async function getMusicById(req, res) {
  try {
    const { musicId } = req.params;

    if (!musicId) {
      return res.status(400).json({
        success: false,
        message: "Music ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(musicId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid music ID",
      });
    }

    const musicTrack = await Music.findById(musicId).lean();

    if (!musicTrack) {
      return res.status(404).json({
        success: false,
        message: "Music track not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Music track fetched successfully",
      data: musicTrack,
    });
  } catch (error) {
    console.error("Get music error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch music",
    });
  }
}

/**
 * Search music by title, artist, or genre
 */
export async function searchMusic(req, res) {
  try {
    const { query } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // cap at 50
    const skip  = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchRegex = new RegExp(query, "i");
    const filter = {
      isPublished: true,
      $or: [
        { title: searchRegex },
        { artist: searchRegex },
        { genre: searchRegex },
        { album: searchRegex },
      ],
    };

    const total   = await Music.countDocuments(filter);
    const results = await Music.find(filter)
      .select("-lyrics")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Search results fetched",
      data: {
        query,
        results,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Search music error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
}

/**
 * Get music by genre
 */
export async function getMusicByGenre(req, res) {
  try {
    const { genre } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // cap at 50
    const skip  = (page - 1) * limit;

    if (!genre) {
      return res.status(400).json({
        success: false,
        message: "Genre is required",
      });
    }

    const genreFilter = { isPublished: true, genre: new RegExp(genre, "i") };

    const totalMusic = await Music.countDocuments(genreFilter);

    const musicTracks = await Music.find(genreFilter)
      .select("-lyrics")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: `${genre} music fetched successfully`,
      data: {
        tracks: musicTracks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMusic / limit),
          totalItems: totalMusic,
        },
      },
    });
  } catch (error) {
    console.error("Get music by genre error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch music by genre",
    });
  }
}

/**
 * Update music information
 */
export async function updateMusic(req, res) {
  try {
    const { musicId } = req.params;
    const { title, artist, genre, album, releaseYear, lyrics, isPublished } =
      req.body;

    if (!musicId) {
      return res.status(400).json({
        success: false,
        message: "Music ID is required",
      });
    }

    const musicTrack = await Music.findById(musicId);

    if (!musicTrack) {
      return res.status(404).json({
        success: false,
        message: "Music track not found",
      });
    }

    // Check authorization (only the artist can update)
    if (
      req.user.role !== "admin" &&
      musicTrack.artistId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this music",
      });
    }

    // Update fields
    if (title) musicTrack.title = title;
    if (artist) musicTrack.artist = artist;
    if (genre) musicTrack.genre = genre;
    if (album) musicTrack.album = album;
    if (releaseYear) musicTrack.releaseYear = releaseYear;
    if (lyrics) musicTrack.lyrics = lyrics;
    if (isPublished !== undefined) musicTrack.isPublished = isPublished;

    const updatedMusic = await musicTrack.save();

    return res.status(200).json({
      success: true,
      message: "Music updated successfully",
      data: updatedMusic,
    });
  } catch (error) {
    console.error("Update music error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update music",
    });
  }
}

/**
 * Delete music track
 */
export async function deleteMusic(req, res) {
  try {
    const { musicId } = req.params;

    if (!musicId) {
      return res.status(400).json({
        success: false,
        message: "Music ID is required",
      });
    }

    const musicTrack = await Music.findById(musicId);

    if (!musicTrack) {
      return res.status(404).json({
        success: false,
        message: "Music track not found",
      });
    }

    // Check authorization
    if (
      req.user.role !== "admin" &&
      musicTrack.artistId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this music",
      });
    }

    // Delete from Cloudinary
    if (musicTrack.cloudinaryMusicPublicId) {
      await deleteFromCloudinary(musicTrack.cloudinaryMusicPublicId, "video");
    }

    if (musicTrack.cloudinaryCoverPublicId) {
      await deleteFromCloudinary(musicTrack.cloudinaryCoverPublicId, "image");
    }

    // Delete from database
    await Music.findByIdAndDelete(musicId);

    return res.status(200).json({
      success: true,
      message: "Music deleted successfully",
    });
  } catch (error) {
    console.error("Delete music error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete music",
    });
  }
}

/**
 * Get music by artist
 */
export async function getMusicByArtist(req, res) {
  try {
    const { artistId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // cap at 50
    const skip  = (page - 1) * limit;

    if (!artistId) {
      return res.status(400).json({
        success: false,
        message: "Artist ID is required",
      });
    }

    const artistFilter = { artistId, isPublished: true };

    const totalMusic = await Music.countDocuments(artistFilter);

    const musicTracks = await Music.find(artistFilter)
      .select("-lyrics")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Artist music fetched successfully",
      data: {
        tracks: musicTracks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMusic / limit),
          totalItems: totalMusic,
        },
      },
    });
  } catch (error) {
    console.error("Get music by artist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artist music",
    });
  }
}

export async function getArtistOwnMusic(req, res) {
  try {
    const artistId = req.user.id;
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // cap at 50
    const skip  = (page - 1) * limit;

    const totalMusic = await Music.countDocuments({
      artistId,
    });

    const musicTracks = await Music.find({ artistId })
      .select("-lyrics")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Artist music fetched successfully",
      data: {
        tracks: musicTracks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMusic / limit),
          totalItems: totalMusic,
        },
      },
    });
  } catch (error) {
    console.error("Get current artist music error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your music",
    });
  }
}

export default {
  uploadMusic,
  getAllMusic,
  getMusicById,
  searchMusic,
  getMusicByGenre,
  updateMusic,
  deleteMusic,
  getMusicByArtist,
  getArtistOwnMusic,
};

/**
 * POST /api/music/:musicId/play
 * Increment play count and track recently played history
 */
export async function trackPlay(req, res) {
  try {
    const { musicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(musicId)) {
      return res.status(400).json({ success: false, message: "Invalid music ID" });
    }

    const music = await Music.findByIdAndUpdate(
      musicId,
      { $inc: { playCount: 1 } },
      { new: true }
    );

    if (!music) {
      return res.status(404).json({ success: false, message: "Music track not found" });
    }

    // Track recently played if user is authenticated
    if (req.user?.id) {
      // Remove existing entry for this track to avoid duplicates, then re-insert
      await RecentlyPlayed.deleteMany({ userId: req.user.id, musicId });
      await RecentlyPlayed.create({
        userId: req.user.id,
        musicId,
        playedAt: new Date(),
      });

      // Keep only the last 50 recently played entries per user
      const count = await RecentlyPlayed.countDocuments({ userId: req.user.id });
      if (count > 50) {
        const oldest = await RecentlyPlayed.find({ userId: req.user.id })
          .sort({ playedAt: 1 })
          .limit(count - 50)
          .select("_id");
        await RecentlyPlayed.deleteMany({ _id: { $in: oldest.map(d => d._id) } });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Play tracked successfully",
      data: { playCount: music.playCount },
    });
  } catch (error) {
    console.error("Track play error:", error);
    return res.status(500).json({ success: false, message: "Failed to track play" });
  }
}

/**
 * POST /api/music/:musicId/like
 * Toggle like on a music track
 */
export async function toggleLike(req, res) {
  try {
    const { musicId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(musicId)) {
      return res.status(400).json({ success: false, message: "Invalid music ID" });
    }

    const music = await Music.findById(musicId);
    if (!music) {
      return res.status(404).json({ success: false, message: "Music track not found" });
    }

    const existingLike = await Like.findOne({ userId, musicId });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      await Music.findByIdAndUpdate(musicId, { $inc: { likeCount: -1 } });
      return res.status(200).json({
        success: true,
        liked: false,
        message: "Song unliked",
      });
    } else {
      await Like.create({ userId, musicId });
      await Music.findByIdAndUpdate(musicId, { $inc: { likeCount: 1 } });
      return res.status(200).json({
        success: true,
        liked: true,
        message: "Song liked",
      });
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle like" });
  }
}

/**
 * GET /api/music/library/liked
 * Get all liked songs for the authenticated user
 */
export async function getLikedSongs(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    const total = await Like.countDocuments({ userId: req.user.id });
    const likedEntries = await Like.find({ userId: req.user.id })
      .populate({
        path: "musicId",
        select: "title artist genre album coverImageUrl musicUrl duration playCount likeCount isPublished",
        match: { isPublished: true },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const tracks = likedEntries.map(e => e.musicId).filter(Boolean);

    return res.status(200).json({
      success: true,
      data: {
        tracks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Get liked songs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch liked songs" });
  }
}

/**
 * GET /api/music/history/recently-played
 * Get recently played tracks for the authenticated user
 */
export async function getRecentlyPlayed(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const history = await RecentlyPlayed.find({ userId: req.user.id })
      .populate({
        path: "musicId",
        select: "title artist genre album coverImageUrl musicUrl duration playCount",
        match: { isPublished: true },
      })
      .sort({ playedAt: -1 })
      .limit(limit)
      .lean();

    const tracks = history
      .filter(h => h.musicId)
      .map(h => ({ ...h.musicId, playedAt: h.playedAt }));

    return res.status(200).json({
      success: true,
      data: { tracks },
    });
  } catch (error) {
    console.error("Get recently played error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch recently played tracks" });
  }
}

/**
 * GET /api/music/recommendations
 * Personalized recommendations based on liked genres
 */
export async function getRecommendations(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // Get genres the user likes
    const likedTracks = await Like.find({ userId: req.user.id })
      .populate({ path: "musicId", select: "genre" })
      .limit(50)
      .lean();

    const likedGenres = [...new Set(
      likedTracks.map(l => l.musicId?.genre).filter(Boolean)
    )];

    let recommendedTracks;

    if (likedGenres.length > 0) {
      // Get recently liked track IDs to exclude them
      const likedMusicIds = likedTracks.map(l => l.musicId?._id).filter(Boolean);

      recommendedTracks = await Music.find({
        isPublished: true,
        genre: { $in: likedGenres },
        _id: { $nin: likedMusicIds },
      })
        .select("-lyrics")
        .sort({ playCount: -1, likeCount: -1 })
        .limit(limit)
        .lean();

      // If not enough tracks, pad with popular tracks
      if (recommendedTracks.length < limit) {
        const pad = await Music.find({
          isPublished: true,
          _id: { $nin: [...likedMusicIds, ...recommendedTracks.map(t => t._id)] },
        })
          .select("-lyrics")
          .sort({ playCount: -1 })
          .limit(limit - recommendedTracks.length)
          .lean();

        recommendedTracks = [...recommendedTracks, ...pad];
      }
    } else {
      // New user — return trending/popular tracks
      recommendedTracks = await Music.find({ isPublished: true })
        .select("-lyrics")
        .sort({ playCount: -1, likeCount: -1 })
        .limit(limit)
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: { tracks: recommendedTracks },
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch recommendations" });
  }
}

/**
 * GET /api/music/:musicId/related
 * Get related tracks (same genre, different artist)
 */
export async function getRelatedTracks(req, res) {
  try {
    const { musicId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    if (!mongoose.Types.ObjectId.isValid(musicId)) {
      return res.status(400).json({ success: false, message: "Invalid music ID" });
    }

    const music = await Music.findById(musicId);
    if (!music) {
      return res.status(404).json({ success: false, message: "Music track not found" });
    }

    const related = await Music.find({
      isPublished: true,
      genre: music.genre,
      _id: { $ne: musicId },
    })
      .select("-lyrics")
      .sort({ playCount: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: { tracks: related },
    });
  } catch (error) {
    console.error("Get related tracks error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch related tracks" });
  }
}

/**
 * GET /api/music/creator/stats
 * Get aggregate stats for the authenticated creator
 */
export async function getCreatorStats(req, res) {
  try {
    const artistId = req.user.id;

    const totalSongs = await Music.countDocuments({ artistId });

    const aggregation = await Music.aggregate([
      { $match: { artistId: new mongoose.Types.ObjectId(artistId) } },
      {
        $group: {
          _id: null,
          totalPlays: { $sum: "$playCount" },
          totalLikes: { $sum: "$likeCount" },
        },
      },
    ]);

    const { totalPlays = 0, totalLikes = 0 } = aggregation[0] || {};

    const topSongs = await Music.find({ artistId })
      .select("title genre album coverImageUrl playCount likeCount releaseYear")
      .sort({ playCount: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        totalSongs,
        totalPlays,
        totalLikes,
        topSongs,
      },
    });
  } catch (error) {
    console.error("Get creator stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch creator stats" });
  }
}

/**
 * GET /api/music/queue
 * Fetch the authenticated user's playback queue
 */
export async function getQueue(req, res) {
  try {
    const queue = await Queue.findOne({ userId: req.user.id })
      .populate({
        path: "tracks",
        select: "title artist coverImageUrl musicUrl duration",
        match: { isPublished: true },
      })
      .lean();

    if (!queue) {
      return res.status(200).json({
        success: true,
        data: { tracks: [], currentTrackIndex: 0 },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        tracks: queue.tracks.filter(Boolean),
        currentTrackIndex: queue.currentTrackIndex,
      },
    });
  } catch (error) {
    console.error("Get queue error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch queue" });
  }
}

/**
 * POST /api/music/queue
 * Set a new queue (replace existing)
 */
export async function setQueue(req, res) {
  try {
    const { tracks, currentTrackIndex = 0 } = req.body;

    if (!Array.isArray(tracks)) {
      return res.status(400).json({ success: false, message: "tracks must be an array of music IDs" });
    }

    const validIds = tracks.filter(id => mongoose.Types.ObjectId.isValid(id));

    await Queue.findOneAndUpdate(
      { userId: req.user.id },
      { tracks: validIds, currentTrackIndex },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Queue updated successfully",
      data: { tracks: validIds, currentTrackIndex },
    });
  } catch (error) {
    console.error("Set queue error:", error);
    return res.status(500).json({ success: false, message: "Failed to set queue" });
  }
}

/**
 * POST /api/music/queue/add
 * Add a track to the end of the queue
 */
export async function addToQueue(req, res) {
  try {
    const { musicId } = req.body;

    if (!musicId || !mongoose.Types.ObjectId.isValid(musicId)) {
      return res.status(400).json({ success: false, message: "Valid music ID is required" });
    }

    const music = await Music.findById(musicId);
    if (!music || !music.isPublished) {
      return res.status(404).json({ success: false, message: "Music track not found or unpublished" });
    }

    const queue = await Queue.findOneAndUpdate(
      { userId: req.user.id },
      { $push: { tracks: musicId } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Track added to queue",
      data: { totalTracks: queue.tracks.length },
    });
  } catch (error) {
    console.error("Add to queue error:", error);
    return res.status(500).json({ success: false, message: "Failed to add to queue" });
  }
}

/**
 * POST /api/music/queue/next
 * Move to the next track in the queue
 */
export async function nextTrack(req, res) {
  try {
    const queue = await Queue.findOne({ userId: req.user.id });

    if (!queue || queue.tracks.length === 0) {
      return res.status(404).json({ success: false, message: "Queue is empty" });
    }

    const nextIndex = (queue.currentTrackIndex + 1) % queue.tracks.length;
    queue.currentTrackIndex = nextIndex;
    await queue.save();

    return res.status(200).json({
      success: true,
      data: {
        currentTrackIndex: nextIndex,
        currentTrackId: queue.tracks[nextIndex],
      },
    });
  } catch (error) {
    console.error("Next track error:", error);
    return res.status(500).json({ success: false, message: "Failed to move to next track" });
  }
}

/**
 * POST /api/music/queue/prev
 * Move to the previous track in the queue
 */
export async function prevTrack(req, res) {
  try {
    const queue = await Queue.findOne({ userId: req.user.id });

    if (!queue || queue.tracks.length === 0) {
      return res.status(404).json({ success: false, message: "Queue is empty" });
    }

    const prevIndex =
      queue.currentTrackIndex === 0
        ? queue.tracks.length - 1
        : queue.currentTrackIndex - 1;

    queue.currentTrackIndex = prevIndex;
    await queue.save();

    return res.status(200).json({
      success: true,
      data: {
        currentTrackIndex: prevIndex,
        currentTrackId: queue.tracks[prevIndex],
      },
    });
  } catch (error) {
    console.error("Prev track error:", error);
    return res.status(500).json({ success: false, message: "Failed to move to previous track" });
  }
}
