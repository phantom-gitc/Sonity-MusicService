import Album from "../models/album.model.js";
import Music from "../models/music.models.js";
import { uploadCoverImage, deleteFromCloudinary } from "../services/cloudinary.services.js";
import mongoose from "mongoose";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function createAlbum(req, res) {
  try {
    const { title, genre, releaseYear, isPublished } = req.body;
    const coverImage = req.files?.coverImage?.[0] || req.file;

    if (!title || !genre) {
      return res.status(400).json({ success: false, message: "Title and genre are required" });
    }

    if (!coverImage) {
      return res.status(400).json({ success: false, message: "Album cover image is required" });
    }

    const coverUploadResult = await uploadCoverImage(
      coverImage.buffer,
      coverImage.originalname
    );

    const newAlbum = await Album.create({
      title,
      artist: req.user.fullName?.firstName ? `${req.user.fullName.firstName} ${req.user.fullName.lastName || ""}`.trim() : "Unknown Creator",
      artistId: req.user.id,
      genre,
      releaseYear: releaseYear || new Date().getFullYear(),
      coverImageUrl: coverUploadResult.url,
      cloudinaryCoverPublicId: coverUploadResult.public_id,
      songs: [],
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    });

    return res.status(201).json({
      success: true,
      message: "Album created successfully",
      data: newAlbum,
    });
  } catch (error) {
    console.error("Create album error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create album" });
  }
}

export async function getAlbums(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = { isPublished: true };
    if (req.query.artistId) {
      filter.artistId = req.query.artistId;
    }

    const total = await Album.countDocuments(filter);
    const albums = await Album.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        albums,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Get albums error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch albums" });
  }
}

export async function getAlbumById(req, res) {
  try {
    const { albumId } = req.params;
    if (!isValidObjectId(albumId)) {
      return res.status(400).json({ success: false, message: "Invalid album ID" });
    }

    const album = await Album.findById(albumId)
      .populate({
        path: "songs",
        match: { isPublished: true },
      })
      .lean();

    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    return res.status(200).json({
      success: true,
      data: album,
    });
  } catch (error) {
    console.error("Get album error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch album details" });
  }
}

export async function updateAlbum(req, res) {
  try {
    const { albumId } = req.params;
    const { title, genre, releaseYear, isPublished } = req.body;
    const coverImage = req.files?.coverImage?.[0] || req.file;

    if (!isValidObjectId(albumId)) {
      return res.status(400).json({ success: false, message: "Invalid album ID" });
    }

    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    if (album.artistId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to update this album" });
    }

    if (title) album.title = title;
    if (genre) album.genre = genre;
    if (releaseYear) album.releaseYear = releaseYear;
    if (isPublished !== undefined) album.isPublished = Boolean(isPublished);

    if (coverImage) {
      if (album.cloudinaryCoverPublicId) {
        await deleteFromCloudinary(album.cloudinaryCoverPublicId, "image");
      }

      const coverUploadResult = await uploadCoverImage(
        coverImage.buffer,
        coverImage.originalname
      );
      album.coverImageUrl = coverUploadResult.url;
      album.cloudinaryCoverPublicId = coverUploadResult.public_id;
    }

    const updatedAlbum = await album.save();

    return res.status(200).json({
      success: true,
      message: "Album updated successfully",
      data: updatedAlbum,
    });
  } catch (error) {
    console.error("Update album error:", error);
    return res.status(500).json({ success: false, message: "Failed to update album" });
  }
}

export async function deleteAlbum(req, res) {
  try {
    const { albumId } = req.params;
    if (!isValidObjectId(albumId)) {
      return res.status(400).json({ success: false, message: "Invalid album ID" });
    }

    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    if (album.artistId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this album" });
    }

    if (album.cloudinaryCoverPublicId) {
      await deleteFromCloudinary(album.cloudinaryCoverPublicId, "image");
    }

    await Album.findByIdAndDelete(albumId);

    return res.status(200).json({
      success: true,
      message: "Album deleted successfully",
    });
  } catch (error) {
    console.error("Delete album error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete album" });
  }
}

export async function addSongToAlbum(req, res) {
  try {
    const { albumId, musicId } = req.params;

    if (!isValidObjectId(albumId) || !isValidObjectId(musicId)) {
      return res.status(400).json({ success: false, message: "Invalid album or music ID" });
    }

    const [album, music] = await Promise.all([
      Album.findById(albumId),
      Music.findById(musicId),
    ]);

    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }
    if (!music) {
      return res.status(404).json({ success: false, message: "Music track not found" });
    }

    if (album.artistId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to modify this album" });
    }
    if (music.artistId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You can only add your own songs to this album" });
    }

    if (album.songs.some(id => id.toString() === musicId)) {
      return res.status(409).json({ success: false, message: "Song is already in this album" });
    }

    album.songs.push(musicId);
    await album.save();

    music.album = album.title;
    await music.save();

    return res.status(200).json({
      success: true,
      message: "Song added to album successfully",
      data: album,
    });
  } catch (error) {
    console.error("Add song to album error:", error);
    return res.status(500).json({ success: false, message: "Failed to add song to album" });
  }
}

export async function removeSongFromAlbum(req, res) {
  try {
    const { albumId, musicId } = req.params;

    if (!isValidObjectId(albumId) || !isValidObjectId(musicId)) {
      return res.status(400).json({ success: false, message: "Invalid album or music ID" });
    }

    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    if (album.artistId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to modify this album" });
    }

    const originalLength = album.songs.length;
    album.songs = album.songs.filter(id => id.toString() !== musicId);

    if (album.songs.length === originalLength) {
      return res.status(404).json({ success: false, message: "Song not found in this album" });
    }

    await album.save();

    const music = await Music.findById(musicId);
    if (music && music.album === album.title) {
      music.album = "Unknown";
      await music.save();
    }

    return res.status(200).json({
      success: true,
      message: "Song removed from album successfully",
      data: album,
    });
  } catch (error) {
    console.error("Remove song from album error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove song from album" });
  }
}

export default {
  createAlbum,
  getAlbums,
  getAlbumById,
  updateAlbum,
  deleteAlbum,
  addSongToAlbum,
  removeSongFromAlbum,
};
