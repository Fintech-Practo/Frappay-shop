const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Local file upload for development (fallback when S3 is not configured)
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} mimetype - File MIME type
 * @param {string} folder - Local folder path (e.g., 'products/images')
 * @param {string} originalName - Original filename for extension extraction
 * @returns {Promise<string>} - Local file URL
 */
async function uploadToLocal(buffer, mimetype, folder, originalName, useExactName = false) {
  try {
    console.log('📁 UploadToLocal called:', { mimetype, folder, originalName });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    const targetDir = path.join(uploadsDir, folder);

    console.log('📂 Directory paths:', { uploadsDir, targetDir });

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory:', uploadsDir);
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log('✅ Created target directory:', targetDir);
    }

    // Generate unique filename or use exact name
    const fileExtension = originalName.split('.').pop();
    const fileName = useExactName ? originalName : `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(targetDir, fileName);

    console.log('📝 File details:', { fileExtension, fileName, filePath });

    // Write file to disk
    fs.writeFileSync(filePath, buffer);
    console.log('💾 File written successfully:', filePath);

    // Return local URL (for development)
    const returnUrl = `/uploads/${folder}/${fileName}`;
    console.log('🔗 Return URL:', returnUrl);

    return returnUrl;
  } catch (error) {
    console.error('Local upload error:', error);
    throw new Error(`Failed to upload locally: ${error.message}`);
  }
}

/**
 * Smart upload function that tries S3 first, falls back to local storage
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} folder - Folder path
 * @param {string} originalName - Original filename
 * @returns {Promise<string>} - File URL
 */
async function uploadFile(buffer, mimetype, folder, originalName, useExactName = false) {
  const env = require('../config/env');

  console.log('🚀 Smart upload called:', { mimetype, folder, originalName });

  // Check S3 Configuration
  const isS3Configured = env.aws.bucketName && env.aws.accessKeyId && env.aws.secretAccessKey;

  console.log('🔧 S3 Config Status:', {
    configured: isS3Configured,
    bucket: env.aws.bucketName ? 'Set' : 'Missing',
    region: env.aws.region ? 'Set' : 'Missing',
    accessKey: env.aws.accessKeyId ? 'Set' : 'Missing',
    secret: env.aws.secretAccessKey ? 'Set' : 'Missing'
  });

  // 1. If S3 IS configured, we MUST use it. invalid credentials or network issues should be errors, not fallbacks.
  if (isS3Configured) {
    try {
      console.log('☁️ Attempting S3 upload...');
      const s3Utils = require('./s3');
      const result = await s3Utils.uploadToS3(buffer, mimetype, folder, originalName, useExactName);
      console.log('✅ S3 upload successful:', result);
      return result;
    } catch (error) {
      console.error('❌ S3 upload failed specific error:', error);
      // If we failed to upload to S3 but S3 was configured, this is a CRITICAL error.
      // Do NOT fall back to local storage, as that leads to inconsistent state.
      throw new Error(`S3 Upload Failed: ${error.message}`);
    }
  }

  // 2. Only use local storage if S3 is NOT configured at all.
  console.warn('⚠️ S3 not configured. Using local storage.');
  return await uploadToLocal(buffer, mimetype, folder, originalName, useExactName);
}

/**
 * Smart delete function that tries S3 first, falls back to local storage
 * @param {string} url - File URL to delete
 */
function deleteFromS3Async(url) {
  const env = require('../config/env');

  console.log('🗑️ Smart delete called:', url);

  // Try S3 first if configured
  if (env.aws.bucketName && env.aws.accessKeyId && env.aws.secretAccessKey) {
    try {
      console.log('☁️ Attempting S3 delete...');
      const s3Utils = require('./s3');
      s3Utils.deleteFromS3Async(url);
      console.log('✅ S3 delete initiated');
      return;
    } catch (error) {
      console.warn('⚠️ S3 delete failed, trying local delete:', error.message);
    }
  }

  // Fallback to local storage delete
  console.log('🏠 Using local storage delete...');
  try {
    const fs = require('fs');
    const path = require('path');

    // Extract file path from URL
    if (url && url.startsWith('/uploads/')) {
      const relativePath = url.substring(1); // Remove leading '/'
      const fullPath = path.join(__dirname, '../', relativePath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('💾 Local file deleted:', fullPath);
      } else {
        console.log('📁 Local file not found:', fullPath);
      }
    }
  } catch (error) {
    console.error('❌ Local delete error:', error);
  }
}

module.exports = {
  uploadToLocal,
  uploadFile,
  deleteFromS3Async,
};