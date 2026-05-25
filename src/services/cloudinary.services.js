import { v2 as cloudinary } from "cloudinary";
import config from "../config/config.js";

// Configure Cloudinary with credentials

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

/**
 * Upload music file to Cloudinary
 * 
 * @param {Buffer} fileBuffer 
 * @param {String} fileName 
 * @returns {Promise<Object>} 
 */
export async function uploadMusicFile(fileBuffer, fileName) {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "music-platform/songs",
          public_id: `song_${Date.now()}_${fileName.split(".")[0]}`,
          timeout: 60000,
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Music upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              duration: result.duration,
            });
          }
        },
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Cloudinary upload error: ${error.message}`);
  }
}

/**
 * Upload cover image to Cloudinary
 * 
 * @param {Buffer} fileBuffer 
 * @param {String} fileName 
 * @returns {Promise<Object>} 
 */
export async function uploadCoverImage(fileBuffer, fileName) {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "music-platform/covers",
          public_id: `cover_${Date.now()}_${fileName.split(".")[0]}`,
          transformation: [
            {
              width: 500,
              height: 500,
              crop: "fill",
              quality: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cover image upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        },
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Cloudinary image upload error: ${error.message}`);
  }
}

/**
 * Delete file from Cloudinary
 * 
 * @param {String} publicId 
 * @param {String} resourceType 
 * @returns {Promise<Object>} 
 */
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete error: ${error.message}`);
  }
}

/**
 * Get file info from Cloudinary
 * 
 * @param {String} publicId 
 * @returns {Promise<Object>} 
 */
export async function getFileInfo(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to fetch file info: ${error.message}`);
  }
}

export default {
  uploadMusicFile,
  uploadCoverImage,
  deleteFromCloudinary,
  getFileInfo,
};
