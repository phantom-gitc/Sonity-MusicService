import mongoose from "mongoose";
import { MUSIC_GENRES } from "../utils/constants.js";

const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Album title is required"],
      trim: true,
      minlength: [3, "Album title must be at least 3 characters"],
    },
    artist: {
      type: String,
      required: [true, "Artist name is required"],
      trim: true,
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverImageUrl: {
      type: String,
      required: [true, "Cover image URL is required"],
    },
    cloudinaryCoverPublicId: {
      type: String,
      default: null,
    },
    genre: {
      type: String,
      required: [true, "Genre is required"],
      trim: true,
      enum: MUSIC_GENRES,
    },
    releaseYear: {
      type: Number,
      default: new Date().getFullYear(),
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Music",
      },
    ],
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
albumSchema.index({ title: "text", artist: "text", genre: 1 });
albumSchema.index({ artistId: 1 });
albumSchema.index({ artistId: 1, createdAt: -1 });
albumSchema.index({ isPublished: 1, createdAt: -1 });

export default mongoose.model("Album", albumSchema);
