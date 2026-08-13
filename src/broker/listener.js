import { subscribeToQueue } from "./rabbit.js";
import User from "../models/user.model.js";

function startListener() {
  // Sync user data on creation
  subscribeToQueue("user_created", async (msg) => {
    try {
      const { id, email, fullName, role, profileImage } = msg;
      if (!id) return;
      
      const updateData = { email, fullName, role };
      if (profileImage !== undefined) updateData.profileImage = profileImage;

      const user = await User.findOneAndUpdate(
        { _id: id },
        updateData,
        { upsert: true, new: true }
      );
      
      console.log(`✅ [Replication] User created/synced: ${user.email} (${user._id})`);
    } catch (error) {
      console.error("❌ [Replication] Error syncing created user:", error.message);
    }
  });

  // Sync user data on login
  subscribeToQueue("user_logged_in", async (msg) => {
    try {
      const { id, email, fullName, role, profileImage } = msg;
      if (!id) return;
      
      const updateData = { email, fullName, role };
      if (profileImage !== undefined) updateData.profileImage = profileImage;

      const user = await User.findOneAndUpdate(
        { _id: id },
        updateData,
        { upsert: true, new: true }
      );
      
      console.log(`✅ [Replication] User logged_in/synced: ${user.email} (${user._id})`);
    } catch (error) {
      console.error("❌ [Replication] Error syncing logged in user:", error.message);
    }
  });
  // Sync user data on profile update
  subscribeToQueue("user_updated", async (msg) => {
    try {
      const { id, email, fullName, role, profileImage } = msg;
      if (!id) return;
      
      const updateData = { email, fullName, role };
      if (profileImage !== undefined) updateData.profileImage = profileImage;

      const user = await User.findOneAndUpdate(
        { _id: id },
        updateData,
        { upsert: true, new: true }
      );

      // If artist name updated, sync to all tracks owned by this artistId
      if (fullName) {
        const newArtistName = `${fullName.firstName || ''} ${fullName.lastName || ''}`.trim();
        if (newArtistName) {
          const Music = (await import("../models/music.models.js")).default;
          await Music.updateMany({ artistId: id }, { artist: newArtistName });
        }
      }
      
      console.log(`✅ [Replication] User profile updated/synced: ${user.email} (${user._id})`);
    } catch (error) {
      console.error("❌ [Replication] Error syncing updated user:", error.message);
    }
  });
}

export default startListener;

