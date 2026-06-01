import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    // playlist name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // optional description
    description: {
      type: String,
      default: "",
    },

    // cover image
    
    coverImageUrl: {
      type: String,
      default: "",
    },

    cloudinaryCoverPublicId: {
      type: String,
      default: null,
    },

    // owner/user who created playlist
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // songs inside playlist
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Music",
      },
    ],

    // public or private

    isPublic: {
      type: Boolean,
      default: true,
    },

    // collaborators allowed to add/remove songs
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // share token for obfuscated sharing
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries

playlistSchema.index({ userId: 1, createdAt: -1 });  
playlistSchema.index({ isPublic: 1, createdAt: -1 }); 
playlistSchema.index({ name: "text" });               
playlistSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

export default mongoose.model("Playlist", playlistSchema);