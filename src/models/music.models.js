import mongoose from "mongoose";
import { MUSIC_GENRES } from "../utils/constants.js";

const musicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },

    artist: {
      type: String,
      required: [true, "Artist name is required"],
      trim: true,
      minlength: [3, "Artist name must be at least 3 characters"],
    },

    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    musicUrl: {
      type: String,
      required: [true, "Music URL is required"],
    },

    coverImageUrl: {
      type: String,
      required: [true, "Cover image URL is required"],
    },

    genre: {
      type: String,
      required: [true, "Genre is required"],
      trim: true,
      enum: MUSIC_GENRES,
    },

    duration: {
      type: Number,
      default: 0,
    },

    album: {
      type: String,
      trim: true,
      default: "Unknown",
    },

    releaseYear: {
      type: Number,
      default: new Date().getFullYear(),
    },

    lyrics: {
      type: String,
      default: "",
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    // Cloudinary public IDs for deletion
    cloudinaryMusicPublicId: {
      type: String,
      default: null,
    },

    cloudinaryCoverPublicId: {
      type: String,
      default: null,
    },

    // Additional metadata
    playCount: {
      type: Number,
      default: 0,
    },

    likeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster searches
musicSchema.index({ title: "text", artist: "text", genre: 1 });
musicSchema.index({ isPublished: 1, createdAt: -1 });
musicSchema.index({ artistId: 1 });
musicSchema.index({ isPublished: 1, genre: 1, playCount: -1 });
musicSchema.index({ artistId: 1, createdAt: -1 });
musicSchema.index({ isPublished: 1, playCount: -1, likeCount: -1 });

export default mongoose.model("Music", musicSchema);
