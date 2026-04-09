const express = require('express');
const router = express.Router();
const siteSettingsController = require('./site-settings.controller');
const { upload } = require('../../config/multer');
const authMiddleware = require('../../middlewares/auth.middleware');
const { allowRole } = require('../../middlewares/role.middleware');
const ROLES = require('../../config/roles');

// Public Routes
router.get('/', siteSettingsController.getPublicSettings);

// Admin Routes
router.get('/admin', authMiddleware, allowRole(ROLES.ADMIN), siteSettingsController.getAdminSettings);
router.put('/', authMiddleware, allowRole(ROLES.ADMIN), siteSettingsController.updateSettings);
router.post('/upload-asset', authMiddleware, allowRole(ROLES.ADMIN), upload.single('image'), siteSettingsController.uploadAsset);
router.post('/upload/:key', authMiddleware, allowRole(ROLES.ADMIN), upload.single('image'), siteSettingsController.uploadSettingImage);

// Site Settings CMS Sub-routes (Mounted at /site-settings/cms)
router.use('/cms', require('./siteSettingsCMS.routes'));

module.exports = router;
