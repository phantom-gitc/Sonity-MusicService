import mongoose from "mongoose";

// Like Schema
const likeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    musicId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Music",
    },
  },
  { timestamps: true }
);
// Ensure a user can only like a song once
likeSchema.index({ userId: 1, musicId: 1 }, { unique: true });

// RecentlyPlayed Schema
const recentlyPlayedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    musicId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Music",
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
recentlyPlayedSchema.index({ userId: 1, playedAt: -1 });
recentlyPlayedSchema.index({ userId: 1, musicId: 1 });

// SavedPlaylist Schema (user saves/follows another user's playlist)
const savedPlaylistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    playlistId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Playlist",
    },
  },
  { timestamps: true }
);
savedPlaylistSchema.index({ userId: 1, playlistId: 1 }, { unique: true });

// FollowArtist Schema lets listeners follow creators/artists without changing auth service.
const followArtistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);
followArtistSchema.index({ userId: 1, artistId: 1 }, { unique: true });
followArtistSchema.index({ artistId: 1, createdAt: -1 });

// Queue Schema
const queueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    tracks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Music",
      },
    ],
    currentTrackIndex: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
export const RecentlyPlayed = mongoose.model("RecentlyPlayed", recentlyPlayedSchema);
export const SavedPlaylist = mongoose.model("SavedPlaylist", savedPlaylistSchema);
export const FollowArtist = mongoose.model("FollowArtist", followArtistSchema);
export const Queue = mongoose.model("Queue", queueSchema);

export default {
  Like,
  RecentlyPlayed,
  SavedPlaylist,
  FollowArtist,
  Queue,
};
