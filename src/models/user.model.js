import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
      },
    },
    role: {
      type: String,
      enum: ["listener", "creator", "user", "artist", "admin"],
      default: "listener",
    },
  },
  { timestamps: true, collection: "users" }
);

export default mongoose.model("User", userSchema);
