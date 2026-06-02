import { subscribeToQueue } from "./rabbit.js";
import User from "../models/user.model.js";

function startListener() {
  // Sync user data on creation
  subscribeToQueue("user_created", async (msg) => {
    try {
      const { id, email, fullName, role } = msg;
      if (!id) return;
      
      const user = await User.findOneAndUpdate(
        { _id: id },
        { email, fullName, role },
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
      const { id, email, fullName, role } = msg;
      if (!id) return;
      
      const user = await User.findOneAndUpdate(
        { _id: id },
        { email, fullName, role },
        { upsert: true, new: true }
      );
      
      console.log(`✅ [Replication] User logged_in/synced: ${user.email} (${user._id})`);
    } catch (error) {
      console.error("❌ [Replication] Error syncing logged in user:", error.message);
    }
  });
}

export default startListener;
