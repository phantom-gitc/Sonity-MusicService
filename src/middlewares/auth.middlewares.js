import jwt from "jsonwebtoken";
import config from "../config/config.js";

export async function verifyToken(req, res, next) {
  try {

    // Get token from cookies or Authorization header
    
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // Verify and decode the token
    
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Attach user info to request object
    req.user = {
      id: decoded.id,
      fullName: decoded.fullName,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Token verification failed",
    });
  }
}


 // Verify if user has admin role
 
export async function verifyAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Authorization failed",
    });
  }
}

 // Verify if user has artist role
 // Only artists can upload and create music tracks
 
export async function verifyArtist(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // Check if user is artist, creator, or admin (admin can do everything)
    if (req.user.role !== "creator" && req.user.role !== "artist" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Creator access required",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Authorization failed",
    });
  }
}

export default {
  verifyToken,
  verifyAdmin,
  verifyArtist,
};
