import mongoose from "mongoose";
import Playlist from "../models/playlist.model.js";
import Music from "../models/music.models.js";


function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * POST /api/playlist
 * Any authenticated user can create a playlist.
 */
export async function createPlaylist(req, res) {
  try {
    const { name, description, isPublic } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Playlist name is required",
      });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description?.trim() || "",
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      userId: req.user.id,
      songs: [],
    });

    return res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: playlist,
    });
  } catch (error) {
    console.error("Create playlist error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create playlist",
    });
  }
}


/**
 * GET /api/playlist/my-playlists
 * Returns all playlists (public + private) owned by the logged-in user.
 */


export async function getMyPlaylists(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const total = await Playlist.countDocuments({ userId: req.user.id });
    const playlists = await Playlist.find({ userId: req.user.id })
      .select("-songs")          // omit heavy songs array in list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Playlists fetched successfully",
      data: {
        playlists,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Get my playlists error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch playlists",
    });
  }
}


/**
 * GET /api/playlist
 * Returns paginated public playlists (no auth required).
 */


export async function getPublicPlaylists(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const total = await Playlist.countDocuments({ isPublic: true });
    const playlists = await Playlist.find({ isPublic: true })
      .select("-songs")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Public playlists fetched successfully",
      data: {
        playlists,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Get public playlists error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch playlists",
    });
  }
}


/**
 * GET /api/playlist/:playlistId
 * Public playlists are accessible by anyone.
 * Private playlists are only accessible by the owner.
 */


export async function getPlaylistById(req, res) {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID",
      });
    }

    const playlist = await Playlist.findById(playlistId)
      .populate({
        path: "songs",
        select: "title artist genre album coverImageUrl musicUrl duration playCount likeCount isPublished",
        match: { isPublished: true }, // only show published tracks inside playlist
      })
      .lean();

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    // Private playlist — only owner can view

    if (!playlist.isPublic) {
      const userId = req.user?.id;
      if (!userId || playlist.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "This playlist is private",
        });
      }
    }

    // Filter out null entries caused by populate match (unpublished songs)

    playlist.songs = playlist.songs.filter(Boolean);

    return res.status(200).json({
      success: true,
      message: "Playlist fetched successfully",
      data: playlist,
    });
  } catch (error) {
    console.error("Get playlist by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch playlist",
    });
  }
}


/**
 * PATCH /api/playlist/:playlistId
 * Only the owner can update name / description / visibility.
 */

export async function updatePlaylist(req, res) {
  try {
    const { playlistId } = req.params;
    const { name, description, isPublic } = req.body;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID",
      });
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    // Authorization check
    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this playlist",
      });
    }

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Playlist name cannot be empty",
        });
      }
      playlist.name = name.trim();
    }

    if (description !== undefined) playlist.description = description.trim();
    if (isPublic    !== undefined) playlist.isPublic    = Boolean(isPublic);

    const updated = await playlist.save();

    return res.status(200).json({
      success: true,
      message: "Playlist updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update playlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update playlist",
    });
  }
}


/**
 * DELETE /api/playlist/:playlistId
 * Only the owner (or admin) can delete.
 */

export async function deletePlaylist(req, res) {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID",
      });
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    // Authorization — owner or admin

    if (
      playlist.userId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this playlist",
      });
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    console.error("Delete playlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete playlist",
    });
  }
}


/**
 * POST /api/playlist/:playlistId/songs/:musicId
 * Owner can add a published music track to their playlist.
 */

export async function addSongToPlaylist(req, res) {
  try {
    const { playlistId, musicId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }
    if (!isValidObjectId(musicId)) {
      return res.status(400).json({ success: false, message: "Invalid music ID" });
    }

    const [playlist, music] = await Promise.all([
      Playlist.findById(playlistId),
      Music.findById(musicId),
    ]);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }
    if (!music) {
      return res.status(404).json({ success: false, message: "Music track not found" });
    }
    if (!music.isPublished) {
      return res.status(400).json({ success: false, message: "Cannot add an unpublished track" });
    }

    // Authorization — only owner can add songs
    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this playlist",
      });
    }

    // Prevent duplicates
    if (playlist.songs.some((id) => id.toString() === musicId)) {
      return res.status(409).json({
        success: false,
        message: "Song is already in this playlist",
      });
    }

    playlist.songs.push(musicId);
    await playlist.save();

    return res.status(200).json({
      success: true,
      message: "Song added to playlist",
      data: {
        playlistId,
        addedSong: {
          _id:    music._id,
          title:  music.title,
          artist: music.artist,
        },
        totalSongs: playlist.songs.length,
      },
    });
  } catch (error) {
    console.error("Add song to playlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add song to playlist",
    });
  }
}


/**
 * DELETE /api/playlist/:playlistId/songs/:musicId
 */


export async function removeSongFromPlaylist(req, res) {
  try {
    const { playlistId, musicId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }
    if (!isValidObjectId(musicId)) {
      return res.status(400).json({ success: false, message: "Invalid music ID" });
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    // Authorization
    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this playlist",
      });
    }

    const originalLength = playlist.songs.length;
    playlist.songs = playlist.songs.filter((id) => id.toString() !== musicId);

    if (playlist.songs.length === originalLength) {
      return res.status(404).json({
        success: false,
        message: "Song not found in this playlist",
      });
    }

    await playlist.save();

    return res.status(200).json({
      success: true,
      message: "Song removed from playlist",
      data: {
        playlistId,
        removedMusicId: musicId,
        totalSongs: playlist.songs.length,
      },
    });
  } catch (error) {
    console.error("Remove song from playlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove song from playlist",
    });
  }
}


/**
 * PATCH /api/playlist/:playlistId/visibility
 * Quickly flip public ↔ private without a full update payload.
 */

export async function togglePlaylistVisibility(req, res) {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to change visibility of this playlist",
      });
    }

    playlist.isPublic = !playlist.isPublic;
    await playlist.save();

    return res.status(200).json({
      success: true,
      message: `Playlist is now ${playlist.isPublic ? "public" : "private"}`,
      data: { isPublic: playlist.isPublic },
    });
  } catch (error) {
    console.error("Toggle playlist visibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle playlist visibility",
    });
  }
}

export default {
  createPlaylist,
  getMyPlaylists,
  getPublicPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  togglePlaylistVisibility,
};
