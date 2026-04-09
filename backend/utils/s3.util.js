const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Public upload (PDFs, labels) — existing behaviour
async function uploadToS3(buffer, fileName) {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentType: "application/pdf"
    });
    await s3.send(command);
    return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
}

// Private upload — for KYC docs (no public URL)
async function uploadPrivateToS3(buffer, key, mimetype = "application/octet-stream") {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype
        // No ACL — bucket policy controls access (private by default)
    });
    await s3.send(command);
    return key; // Return the S3 key (NOT a public URL)
}

// Generate a time-limited signed URL for private KYC docs
async function getSignedDocUrl(key, expiresInSeconds = 3600) {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

module.exports = { uploadToS3, uploadPrivateToS3, getSignedDocUrl };

