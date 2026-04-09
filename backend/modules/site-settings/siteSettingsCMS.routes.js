const express = require('express');
const router = express.Router();
const siteSettingsCMSController = require('./siteSettingsCMS.controller');
const auth = require('../../middlewares/auth.middleware');
const { allowRole } = require('../../middlewares/role.middleware');
const ROLES = require('../../config/roles');
const { validateRequest: validate } = require('../../middlewares/validation.middleware');
const Joi = require('joi');
const multer = require('multer');
const { memoryStorage } = require('multer');

// Configure multer for image uploads
const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation schemas
const bannerSchema = Joi.object({
  title: Joi.string().required(),
  highlight: Joi.string().allow(''),
  description: Joi.string().required(),
  badge: Joi.string().allow(''),
  bgImage: Joi.string().allow(''),
  sideImage: Joi.string().allow(''),
  btnText: Joi.string().required(),
  btnLink: Joi.string().required(),
  is_active: Joi.boolean().default(true),
  order: Joi.number().default(999)
});

const categorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  image: Joi.string().required(),
  link: Joi.string().required(),
  is_active: Joi.boolean().default(true),
  order: Joi.number().default(999)
});

const footerSchema = Joi.object({
  company_info: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    address: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    email: Joi.string().email().allow('')
  }),
  social_links: Joi.object({
    facebook: Joi.string().uri().allow(''),
    twitter: Joi.string().uri().allow(''),
    instagram: Joi.string().uri().allow(''),
    linkedin: Joi.string().uri().allow('')
  }),
  quick_links: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      link: Joi.string().uri().required()
    })
  ),
  legal_links: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      link: Joi.string().uri().required()
    })
  ),
  copyright_text: Joi.string().required()
});

const featuresSchema = Joi.object({
  free_shipping: Joi.object({
    enabled: Joi.boolean().required(),
    text: Joi.string().required()
  }),
  secure_payment: Joi.object({
    enabled: Joi.boolean().required(),
    text: Joi.string().required()
  }),
  fast_delivery: Joi.object({
    enabled: Joi.boolean().required(),
    text: Joi.string().required()
  }),
  customer_support: Joi.object({
    enabled: Joi.boolean().required(),
    text: Joi.string().required()
  })
});

// Public routes (no auth required)
router.get('/public', siteSettingsCMSController.getPublicSiteSettings);

// Apply auth middleware to all admin routes
router.use(auth);
router.use(allowRole(ROLES.ADMIN));

// GET /api/site-settings/cms - Get all CMS settings
router.get('/', siteSettingsCMSController.getAllCMSSettings);

// HERO BANNERS
router.get('/hero', siteSettingsCMSController.getHeroBanners);
router.post('/hero', validate(bannerSchema), siteSettingsCMSController.createHeroBanner);
router.put('/hero/:id', validate(bannerSchema), siteSettingsCMSController.updateHeroBanner);
router.delete('/hero/:id', siteSettingsCMSController.deleteHeroBanner);
router.put('/hero/:id/reorder', validate(Joi.object({ order: Joi.number().required() })), siteSettingsCMSController.reorderHeroBanner);

// PROMO BANNERS
router.get('/promo', siteSettingsCMSController.getPromoBanners);
router.post('/promo', validate(bannerSchema), siteSettingsCMSController.createPromoBanner);
router.put('/promo/:id', validate(bannerSchema), siteSettingsCMSController.updatePromoBanner);
router.delete('/promo/:id', siteSettingsCMSController.deletePromoBanner);

// CATEGORIES
router.get('/categories', siteSettingsCMSController.getHomepageCategories);
router.post('/categories', validate(categorySchema), siteSettingsCMSController.createHomepageCategory);
router.put('/categories/:id', validate(categorySchema), siteSettingsCMSController.updateHomepageCategory);
router.delete('/categories/:id', siteSettingsCMSController.deleteHomepageCategory);

// FOOTER
router.get('/footer', siteSettingsCMSController.getFooterSettings);
router.put('/footer', validate(footerSchema), siteSettingsCMSController.updateFooterSettings);

// FEATURE STRIPS
router.get('/features', siteSettingsCMSController.getFeatureStrips);
router.put('/features', validate(featuresSchema), siteSettingsCMSController.updateFeatureStrips);

// IMAGE UPLOAD
router.post('/upload', upload.single('image'), siteSettingsCMSController.uploadImage);

module.exports = router;
