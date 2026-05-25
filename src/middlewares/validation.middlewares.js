
import { MUSIC_GENRES } from "../utils/constants.js";

export function validateMusicUpload(req, res, next) {
  try {
    const { title, artist, genre } = req.body;
    const errors = [];

    // Validate title

    if (!title) {
      errors.push("Title is required");
    } else if (title.length < 3) {
      errors.push("Title must be at least 3 characters long");
    } else if (title.length > 200) {
      errors.push("Title cannot exceed 200 characters");
    }

    // Validate artist

    if (!artist) {
      errors.push("Artist name is required");
    } else if (artist.length < 3) {
      errors.push("Artist name must be at least 3 characters long");
    } else if (artist.length > 200) {
      errors.push("Artist name cannot exceed 200 characters");
    }

    // Validate genre

    if (!genre) {
      errors.push("Genre is required");
    } else if (!MUSIC_GENRES.includes(genre)) {
      errors.push(`Invalid genre. Allowed genres: ${MUSIC_GENRES.join(", ")}`);
    }

    // Validate release year if provided
    
    if (req.body.releaseYear) {
      const year = parseInt(req.body.releaseYear);
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 5) {
        errors.push(
          `Release year must be between 1900 and ${currentYear + 5}`
        );
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Validation error",
    });
  }
}

/**
 * Validate search query
 */
export function validateSearchQuery(req, res, next) {
  const { query } = req.query;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  if (query.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Search query cannot exceed 100 characters",
    });
  }

  next();
}

/**
 * Validate playlist creation / update body
 */

export function validatePlaylist(req, res, next) {
  try {
    const { name, description, isPublic } = req.body;
    const errors = [];

    // name is required only on create (POST); on update it's optional
    if (req.method === "POST" && (!name || name.trim().length === 0)) {
      errors.push("Playlist name is required");
    }

    if (name !== undefined) {
      if (name.trim().length < 1) {
        errors.push("Playlist name cannot be empty");
      } else if (name.trim().length > 100) {
        errors.push("Playlist name cannot exceed 100 characters");
      }
    }

    if (description !== undefined && description.length > 500) {
      errors.push("Description cannot exceed 500 characters");
    }

    if (isPublic !== undefined && typeof isPublic !== "boolean" && isPublic !== "true" && isPublic !== "false") {
      errors.push("isPublic must be a boolean value");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Validation error" });
  }
}

export default {
  validateMusicUpload,
  validateSearchQuery,
  validatePlaylist,
};
