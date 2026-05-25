import mongoose from "mongoose";
import Music from "../models/music.models.js";
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

    // Validate required fields

    if (!title || !artist || !genre) {
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
      artist,
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
