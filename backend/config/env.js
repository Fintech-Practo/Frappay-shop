const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,

  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    meta: {
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET
    }
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || "noreply@frappay.shop"
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_S3_BUCKET_NAME
  },

  payu: {
    merchantKey: process.env.PAYU_MERCHANT_KEY,
    merchantSalt: process.env.PAYU_MERCHANT_SALT,
    isProduction: process.env.PAYU_IS_PRODUCTION === "true"
  },

  backendUrl: process.env.BACKEND_URL,
  frontendUrl: process.env.FRONTEND_URL,

  delhivery: {
    baseUrl: process.env.DELHIVERY_BASE_URL,
    username: process.env.DELHIVERY_USERNAME,
    password: process.env.DELHIVERY_PASSWORD,
    token: process.env.DELHIVERY_TOKEN,
    pickupLocation: process.env.DELHIVERY_PICKUP_LOCATION || 'Primary',
    trackingUrl: process.env.DELHIVERY_TRACKING_URL || 'https://www.delhivery.com/track/package/'
  },

  logistics: {
    provider: process.env.LOGISTICS_PROVIDER || "mock",
    mode: process.env.LOGISTICS_MODE || "mock"
  },

  // Backward compatibility for directly used env.LOGISTICS_MODE
  LOGISTICS_MODE: process.env.LOGISTICS_MODE || "mock",
  platformFee: Number(process.env.PLATFORM_FEE) || 15
};

