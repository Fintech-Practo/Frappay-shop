const multer = require("multer");
const path = require("path");
const env = require("../config/env");

// Configure multer for memory storage (for S3 upload)
const storage = multer.memoryStorage();

// File filter with separate validation for images and PDFs
const fileFilter = (req, file, cb) => {
  // Log for debugging
  console.log(`[Multer] Processing file: fieldname=${file.fieldname}, mimetype=${file.mimetype}, originalname=${file.originalname}`);
  
  // Different validation based on field name
  if (file.fieldname === "image" || file.fieldname === "profile_image" || file.fieldname === "banner_image") {
    // Image validation: jpeg, jpg, png, webp, avif (removed gif for production)
    const allowedImageTypes = /jpeg|jpg|png|webp|avif/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extname = allowedImageTypes.test(ext);
    const mimetype = file.mimetype && (allowedImageTypes.test(file.mimetype) || file.mimetype.startsWith("image/"));

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      return cb(new Error(`Image field: Only image files are allowed (jpeg, jpg, png, webp, avif). Received: ${file.mimetype} (${ext})`), false);
    }
  } else if (file.fieldname === "ebook_pdf" || file.fieldname === "book_pdf") {
    // PDF validation: accept PDF files by extension or mimetype
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdfExt = ext === ".pdf";
    const isPdfMime = file.mimetype && (
      file.mimetype === "application/pdf" || 
      file.mimetype === "application/x-pdf" ||
      file.mimetype.includes("pdf")
    );
    
    if (isPdfExt || isPdfMime) {
      console.log(`[Multer] PDF file accepted: ${file.originalname}`);
      return cb(null, true);
    } else {
      return cb(new Error(`Ebook PDF field: Only PDF files are allowed. Received: mimetype=${file.mimetype}, ext=${ext}`), false);
    }
  } else if (file.fieldname === "images") {
    // Multiple images field
    const allowedImageTypes = /jpeg|jpg|png|webp|avif/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extname = allowedImageTypes.test(ext);
    const mimetype = file.mimetype && (allowedImageTypes.test(file.mimetype) || file.mimetype.startsWith("image/"));

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      return cb(new Error(`Images field: Only image files are allowed (jpeg, jpg, png, webp, avif). Received: ${file.mimetype} (${ext})`), false);
    }
  } else if (file.fieldname === 'govt_id') {
    // KYC Government ID: accept images and PDF
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const allowed = /jpeg|jpg|png|pdf/;
    const extOk = allowed.test(ext);
    const mimeOk = file.mimetype && (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('pdf')
    );
    if (extOk && mimeOk) {
      return cb(null, true);
    } else {
      return cb(new Error(`govt_id: Only jpg, png, pdf files are allowed. Received: ${file.mimetype}`), false);
    }
  } else {
    // Unknown field - reject for security
    console.warn(`[Multer] Unknown file field: ${file.fieldname}, rejecting`);
    return cb(new Error(`Unknown file field: ${file.fieldname}`), false);
  }
};

// Create multer instance with fields support
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for PDFs)
    files: 5, // Maximum 5 files per request
  },
  fileFilter: fileFilter,
  onError: (err, next) => {
    console.error('Multer error:', err);
    next(err);
  },
});

// Specific upload configurations for different use cases
const uploadSingleImage = upload.single('image');
const uploadMultipleImages = upload.array('images', 5);
const uploadProductFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 4 },
  { name: 'ebook_pdf', maxCount: 1 },
  { name: 'book_pdf', maxCount: 1 },
]);
const uploadProfileImage = upload.single('profile_image');
const uploadBannerImage = upload.single('banner_image');
const uploadGovtId = upload.single('govt_id'); // KYC document upload

module.exports = {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductFiles,
  uploadProfileImage,
  uploadBannerImage,
  uploadGovtId,
};
