const cloudinary = require("cloudinary").v2;
const env = require("../config/env");
const { Readable } = require("stream");

// Configure Cloudinary
if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

// Upload image or PDF buffer to Cloudinary
async function uploadImage(buffer, folder = "books-and-copies", resourceType = "image") {
  try {
    if (!env.cloudinary.cloudName || !env.cloudinary.apiKey) {
      console.warn("Cloudinary not configured. Returning local mock URL.");
      if (resourceType === "raw") {
        return "https://placehold.co/400?text=No+PDF+Configured";
      }
      return "https://placehold.co/400?text=No+Image+Configured";
    }

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: folder,
        resource_type: resourceType, // "image" or "raw" for PDFs
      };

      // Only add image-specific options for images
      if (resourceType === "image") {
        uploadOptions.format = "auto";
        uploadOptions.fetch_format = "auto";
        uploadOptions.quality = "auto";
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

// Delete image from Cloudinary
async function deleteImage(imageUrl) {
  try {
    if (!imageUrl || !env.cloudinary.cloudName) {
      return { success: false, message: "Cloudinary not configured or invalid URL" };
    }

    // Extract public_id from URL
    const urlParts = imageUrl.split("/");
    const publicId = urlParts.slice(-2).join("/").replace(/\.[^/.]+$/, "");

    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === "ok" };
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadImage,
  deleteImage,
};

