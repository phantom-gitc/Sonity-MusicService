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

// FollowUser Schema
const followUserSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);
followUserSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followUserSchema.index({ followingId: 1 });

// PlayLog Schema
const playLogSchema = new mongoose.Schema(
  {
    musicId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Music",
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "User",
    },
    ip: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: "US",
    },
    device: {
      type: String,
      default: "Web",
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

playLogSchema.index({ artistId: 1, playedAt: -1 });
playLogSchema.index({ musicId: 1, playedAt: -1 });
playLogSchema.index({ artistId: 1, userId: 1, playedAt: -1 });

export const Like = mongoose.model("Like", likeSchema);
export const RecentlyPlayed = mongoose.model("RecentlyPlayed", recentlyPlayedSchema);
export const SavedPlaylist = mongoose.model("SavedPlaylist", savedPlaylistSchema);
export const FollowArtist = mongoose.model("FollowArtist", followArtistSchema);
export const FollowUser = mongoose.model("FollowUser", followUserSchema);
export const Queue = mongoose.model("Queue", queueSchema);
export const PlayLog = mongoose.model("PlayLog", playLogSchema);

export default {
  Like,
  RecentlyPlayed,
  SavedPlaylist,
  FollowArtist,
  FollowUser,
  Queue,
  PlayLog,
};

