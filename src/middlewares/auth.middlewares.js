import jwt from "jsonwebtoken";
import config from "../config/config.js";
import User from "../models/user.model.js";

// Verify JWT from cookie or Authorization header.
// On success, attaches req.user = { id, fullName, role }.
export async function verifyToken(req, res, next) {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);

    req.user = {
      id: decoded.id,
      fullName: decoded.fullName,
      role: decoded.role,
    };

    // Keep local user record in sync, but only when it doesn't exist yet.
    // Running an upsert on every request is a hidden performance drain,
    // so we skip the write if the user already exists.
    if (decoded.id) {
      const exists = await User.exists({ _id: decoded.id });
      if (!exists) {
        await User.create({
          _id: decoded.id,
          email: `${decoded.id}@sonity.local`,
          fullName: decoded.fullName || { firstName: "User", lastName: "" },
          role: decoded.role || "listener",
        }).catch((err) => {
          // Ignore duplicate-key errors — another request may have created it first
          if (err.code !== 11000) console.error("User sync error:", err.message);
        });
      }
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token has expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    return res.status(500).json({ success: false, message: "Token verification failed" });
  }
}

// Blocks non-admin users.
export async function verifyAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    next();
  } catch {
    return res.status(403).json({ success: false, message: "Authorization failed" });
  }
}

// Blocks users who are not artists, creators, or admins.
// Artists and creators are treated as the same role across the system.
export async function verifyArtist(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const allowed = ["creator", "artist", "admin"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Creator access required" });
    }

    next();
  } catch {
    return res.status(403).json({ success: false, message: "Authorization failed" });
  }
}

export default { verifyToken, verifyAdmin, verifyArtist };
