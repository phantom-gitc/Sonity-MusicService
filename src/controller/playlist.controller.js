import mongoose from "mongoose";
import Playlist from "../models/playlist.model.js";
import Music from "../models/music.models.js";
import User from "../models/user.model.js";
import crypto from "crypto";
import { SavedPlaylist } from "../models/interaction.models.js";
import { uploadCoverImage, deleteFromCloudinary } from "../services/cloudinary.services.js";
import jwt from "jsonwebtoken";
import config from "../config/config.js";


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
    const coverImage = req.file;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Playlist name is required",
      });
    }

    let coverImageUrl = "";
    let cloudinaryCoverPublicId = null;

    if (coverImage) {
      const uploadResult = await uploadCoverImage(coverImage.buffer, coverImage.originalname);
      coverImageUrl = uploadResult.url;
      cloudinaryCoverPublicId = uploadResult.public_id;
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description?.trim() || "",
      isPublic: isPublic !== undefined ? (isPublic === "true" || isPublic === true) : true,
      userId: req.user.id,
      songs: [],
      coverImageUrl,
      cloudinaryCoverPublicId,
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
        path: "userId",
        select: "fullName email role",
      })
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
      if (!userId || playlist.userId?._id?.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "This playlist is private",
        });
      }
    }

    // Filter out null entries caused by populate match (unpublished songs)

    playlist.songs = playlist.songs.filter(Boolean);

    // Map creator field for frontend compatibility
    if (playlist.userId) {
      playlist.creator = {
        _id: playlist.userId._id,
        name: `${playlist.userId.fullName?.firstName || ""} ${playlist.userId.fullName?.lastName || ""}`.trim(),
        email: playlist.userId.email,
        role: playlist.userId.role,
      };
      // Keep userId as the string ID for other frontend references if needed
      playlist.userId = playlist.userId._id;
    }

    // Fetch followers/likes count from SavedPlaylist model
    const followersCount = await SavedPlaylist.countDocuments({ playlistId: playlist._id });
    playlist.followersCount = followersCount;

    // Check if current user has saved/liked the playlist
    const currentUserId = req.user?.id;
    playlist.isSaved = currentUserId ? !!(await SavedPlaylist.exists({ userId: currentUserId, playlistId: playlist._id })) : false;

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
    const coverImage = req.file;

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
    if (isPublic    !== undefined) playlist.isPublic    = (isPublic === "true" || isPublic === true);

    if (coverImage) {
      // Delete old cover image from Cloudinary
      if (playlist.cloudinaryCoverPublicId) {
        await deleteFromCloudinary(playlist.cloudinaryCoverPublicId, "image");
      }

      const uploadResult = await uploadCoverImage(coverImage.buffer, coverImage.originalname);
      playlist.coverImageUrl = uploadResult.url;
      playlist.cloudinaryCoverPublicId = uploadResult.public_id;
    }

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

    // Delete cover image from Cloudinary
    if (playlist.cloudinaryCoverPublicId) {
      await deleteFromCloudinary(playlist.cloudinaryCoverPublicId, "image");
    }

    // Delete SavedPlaylist entries referring to this playlist
    await SavedPlaylist.deleteMany({ playlistId });

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

    // Authorization — only owner or collaborators can add songs
    const isOwner = playlist.userId.toString() === req.user.id;
    const isCollaborator = playlist.collaborators?.some((cId) => cId.toString() === req.user.id);
    if (!isOwner && !isCollaborator) {
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

    // Authorization — only owner or collaborators can remove songs
    const isOwner = playlist.userId.toString() === req.user.id;
    const isCollaborator = playlist.collaborators?.some((cId) => cId.toString() === req.user.id);
    if (!isOwner && !isCollaborator) {
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

export async function toggleSavePlaylist(req, res) {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (!playlist.isPublic && playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Cannot save a private playlist" });
    }

    const existingSave = await SavedPlaylist.findOne({
      userId: req.user.id,
      playlistId,
    });

    if (existingSave) {
      await SavedPlaylist.findByIdAndDelete(existingSave._id);
      return res.status(200).json({
        success: true,
        saved: false,
        message: "Playlist removed from saved library",
      });
    } else {
      await SavedPlaylist.create({
        userId: req.user.id,
        playlistId,
      });
      return res.status(200).json({
        success: true,
        saved: true,
        message: "Playlist saved to library",
      });
    }
  } catch (error) {
    console.error("Toggle save playlist error:", error);
    return res.status(500).json({ success: false, message: "Failed to save playlist" });
  }
}

export async function getSavedPlaylists(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await SavedPlaylist.countDocuments({ userId: req.user.id });
    const savedEntries = await SavedPlaylist.find({ userId: req.user.id })
      .populate({
        path: "playlistId",
        select: "name description coverImageUrl userId isPublic",
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const playlists = savedEntries.map(entry => entry.playlistId).filter(Boolean);

    return res.status(200).json({
      success: true,
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
    console.error("Get saved playlists error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch saved playlists" });
  }
}

export async function playAllPlaylist(req, res) {
  try {
    const { playlistId } = req.params;
    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }

    const playlist = await Playlist.findById(playlistId).populate({
      path: "songs",
      match: { isPublished: true },
      select: "title artist musicUrl coverImageUrl duration",
    });

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (!playlist.isPublic) {
      const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(403).json({ success: false, message: "This playlist is private" });
      }
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (playlist.userId.toString() !== decoded.id) {
        return res.status(403).json({ success: false, message: "This playlist is private" });
      }
    }

    const tracks = playlist.songs.filter(Boolean);

    return res.status(200).json({
      success: true,
      data: {
        playlistId: playlist._id,
        name: playlist.name,
        tracks,
      },
    });
  } catch (error) {
    console.error("Play all error:", error);
    return res.status(500).json({ success: false, message: "Failed to play playlist tracks" });
  }
}

export async function shufflePlaylist(req, res) {
  try {
    const { playlistId } = req.params;
    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }

    const playlist = await Playlist.findById(playlistId).populate({
      path: "songs",
      match: { isPublished: true },
      select: "title artist musicUrl coverImageUrl duration",
    });

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    if (!playlist.isPublic) {
      const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(403).json({ success: false, message: "This playlist is private" });
      }
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (playlist.userId.toString() !== decoded.id) {
        return res.status(403).json({ success: false, message: "This playlist is private" });
      }
    }

    const tracks = playlist.songs.filter(Boolean);
    
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }

    return res.status(200).json({
      success: true,
      data: {
        playlistId: playlist._id,
        name: playlist.name,
        tracks,
      },
    });
  } catch (error) {
    console.error("Shuffle error:", error);
    return res.status(500).json({ success: false, message: "Failed to shuffle playlist tracks" });
  }
}

export async function addCollaborator(req, res) {
  try {
    const { playlistId } = req.params;
    const { collaboratorId } = req.body;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }
    if (!collaboratorId || !isValidObjectId(collaboratorId)) {
      return res.status(400).json({ success: false, message: "Invalid collaborator ID" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    // Only the owner can add collaborators
    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the owner can add collaborators",
      });
    }

    if (playlist.userId.toString() === collaboratorId) {
      return res.status(400).json({
        success: false,
        message: "Owner cannot be added as a collaborator",
      });
    }

    // Check if collaborator exists in Users collection
    const collaboratorExists = await User.exists({ _id: collaboratorId });
    if (!collaboratorExists) {
      return res.status(404).json({ success: false, message: "Collaborator user not found" });
    }

    // Prevent duplicates
    if (playlist.collaborators.some((cId) => cId.toString() === collaboratorId)) {
      return res.status(409).json({
        success: false,
        message: "User is already a collaborator",
      });
    }

    playlist.collaborators.push(collaboratorId);
    await playlist.save();

    return res.status(200).json({
      success: true,
      message: "Collaborator added successfully",
      data: {
        playlistId,
        collaborators: playlist.collaborators,
      },
    });
  } catch (error) {
    console.error("Add collaborator error:", error);
    return res.status(500).json({ success: false, message: "Failed to add collaborator" });
  }
}

export async function removeCollaborator(req, res) {
  try {
    const { playlistId, userId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }
    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    // Only the owner can remove collaborators
    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the owner can remove collaborators",
      });
    }

    const originalLength = playlist.collaborators.length;
    playlist.collaborators = playlist.collaborators.filter((cId) => cId.toString() !== userId);

    if (playlist.collaborators.length === originalLength) {
      return res.status(404).json({
        success: false,
        message: "User is not a collaborator on this playlist",
      });
    }

    await playlist.save();

    return res.status(200).json({
      success: true,
      message: "Collaborator removed successfully",
      data: {
        playlistId,
        collaborators: playlist.collaborators,
      },
    });
  } catch (error) {
    console.error("Remove collaborator error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove collaborator" });
  }
}

export async function generateShareLink(req, res) {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    // Only owner can generate/get the share link
    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to get the share link for this playlist",
      });
    }

    // Generate token if it doesn't exist
    if (!playlist.shareToken) {
      playlist.shareToken = crypto.randomBytes(16).toString("hex");
      await playlist.save();
    }

    // Return the token and absolute/relative url
    return res.status(200).json({
      success: true,
      data: {
        shareToken: playlist.shareToken,
        shareUrl: `${config.FRONTEND_URL || "http://localhost:5173"}/playlist/share/${playlist.shareToken}`,
      },
    });
  } catch (error) {
    console.error("Generate share link error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate share link" });
  }
}

export async function getPlaylistByShareToken(req, res) {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      return res.status(400).json({ success: false, message: "Share token is required" });
    }

    const playlist = await Playlist.findOne({ shareToken })
      .populate({
        path: "userId",
        select: "fullName email role",
      })
      .populate({
        path: "songs",
        select: "title artist genre album coverImageUrl musicUrl duration playCount likeCount isPublished",
        match: { isPublished: true },
      })
      .lean();

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Shared playlist not found" });
    }

    playlist.songs = playlist.songs.filter(Boolean);

    if (playlist.userId) {
      playlist.creator = {
        _id: playlist.userId._id,
        name: `${playlist.userId.fullName?.firstName || ""} ${playlist.userId.fullName?.lastName || ""}`.trim(),
        email: playlist.userId.email,
        role: playlist.userId.role,
      };
      playlist.userId = playlist.userId._id;
    }

    const followersCount = await SavedPlaylist.countDocuments({ playlistId: playlist._id });
    playlist.followersCount = followersCount;

    return res.status(200).json({
      success: true,
      message: "Shared playlist fetched successfully",
      data: playlist,
    });
  } catch (error) {
    console.error("Get playlist by share token error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch shared playlist" });
  }
}

export async function getPlaylistFollowers(req, res) {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ success: false, message: "Invalid playlist ID" });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    // Only allow viewing followers for public playlists, or private owned by caller
    if (!playlist.isPublic && playlist.userId.toString() !== req.user?.id) {
      return res.status(403).json({ success: false, message: "This playlist is private" });
    }

    const saves = await SavedPlaylist.find({ playlistId })
      .populate({
        path: "userId",
        select: "fullName email role profileImage",
      })
      .lean();

    const followers = saves.map((s) => s.userId).filter(Boolean);

    return res.status(200).json({
      success: true,
      data: { followers },
    });
  } catch (error) {
    console.error("Get playlist followers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch playlist followers" });
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
  toggleSavePlaylist,
  getSavedPlaylists,
  playAllPlaylist,
  shufflePlaylist,
  addCollaborator,
  removeCollaborator,
  generateShareLink,
  getPlaylistByShareToken,
  getPlaylistFollowers,
};
