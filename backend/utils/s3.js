const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

// Initialize S3 client
const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

/**
 * Upload buffer to S3 with UUID-based naming
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} mimetype - File MIME type
 * @param {string} folder - S3 folder path (e.g., 'products/images')
 * @param {string} originalName - Original filename for extension extraction
 * @returns {Promise<string>} - Public S3 URL
 */
async function uploadToS3(buffer, mimetype, folder, originalName, useExactName = false) {
  try {
    if (!env.aws.bucketName) {
      throw new Error('AWS S3 bucket not configured');
    }

    // Generate unique filename or use exact name
    const fileExtension = originalName.split('.').pop();
    const fileName = useExactName ? originalName : `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    const uploadParams = {
      Bucket: env.aws.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // Set appropriate permissions and caching
      // ACL: 'public-read', // Removed as modern buckets enforce 'Bucket Owner Enforced'
      CacheControl: 'max-age=31536000', // 1 year cache
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return public URL (adjust if using CloudFront)
    return `https://${env.aws.bucketName}.s3.${env.aws.region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

/**
 * Delete file from S3 by URL
 * @param {string} url - Public S3 URL
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteFromS3(url) {
  try {
    if (!url || !env.aws.bucketName) {
      return { success: false, error: 'Invalid URL or S3 not configured' };
    }

    // Extract key from URL
    const urlParts = url.split('/');
    const bucketAndRegion = urlParts[2]; // bucket-name.s3.region.amazonaws.com
    const bucketName = bucketAndRegion.split('.')[0];

    if (bucketName !== env.aws.bucketName) {
      return { success: false, error: 'URL bucket does not match configured bucket' };
    }

    // Extract key (everything after bucket domain)
    const key = urlParts.slice(3).join('/');

    const deleteParams = {
      Bucket: env.aws.bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Non-blocking delete from S3 (fire and forget)
 * @param {string} url - Public S3 URL
 */
function deleteFromS3Async(url) {
  // Fire and forget - don't await
  deleteFromS3(url).catch(error => {
    console.error('Async S3 delete failed:', error);
  });
}

/**
 * Generate signed URL for reading private file
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration in seconds (default 3600/1h)
 */
async function getSignedFileUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: env.aws.bucketName,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("S3 Signed URL error:", error);
    throw error;
  }
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  deleteFromS3Async,
  getSignedFileUrl,
  s3Client,
};