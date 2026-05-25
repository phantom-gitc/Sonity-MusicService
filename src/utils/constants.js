/**
 * Music Service Constants
 */

export const MUSIC_GENRES = [
  "Pop",
  "Rock",
  "Hip-Hop",
  "Jazz",
  "Classical",
  "Electronic",
  "Country",
  "R&B",
  "Soul",
  "Indie",
  "Metal",
  "Other",
];

export const ALLOWED_MUSIC_FORMATS = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
];

export const ALLOWED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/webp"];

export const FILE_SIZE_LIMITS = {
  MUSIC: 100 * 1024 * 1024, // 100MB
  IMAGE: 10 * 1024 * 1024, // 10MB
};

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 50,
};

export const CLOUDINARY_FOLDERS = {
  SONGS: "music-platform/songs",
  COVERS: "music-platform/covers",
};

export default {
  MUSIC_GENRES,
  ALLOWED_MUSIC_FORMATS,
  ALLOWED_IMAGE_FORMATS,
  FILE_SIZE_LIMITS,
  PAGINATION_DEFAULTS,
  CLOUDINARY_FOLDERS,
};
