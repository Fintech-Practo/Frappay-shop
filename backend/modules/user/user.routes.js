const express = require("express");
const controller = require("./user.controller");
const auth = require("../../middlewares/auth.middleware");
const { uploadProfileImage } = require("../../config/multer");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const { updateProfileSchema, updatePreferencesSchema, changePasswordSchema, deleteAccountSchema } = require("./user.schema");
const { getStatsSchema } = require("../admin/admin.schema");

const router = express.Router();

// Profile management
router.get("/me", auth, controller.getProfile);
router.put("/me", auth, uploadProfileImage, controller.updateProfile);

// Preferences
router.get("/me/preferences", auth, controller.getPreferences);
router.put("/me/preferences", auth, validateRequest(updatePreferencesSchema), controller.updatePreferences);

// Security
router.post("/me/change-password", auth, validateRequest(changePasswordSchema), controller.changePassword);
router.post("/me/verify-password", auth, controller.verifyPassword);
router.delete("/me", auth, validateRequest(deleteAccountSchema), controller.deleteAccount);

// Activity
router.get("/me/activity", auth, validateQuery(getStatsSchema), controller.getUserActivity);

// Bank details
router.get("/me/bank-details", auth, controller.getBankDetails);
router.post("/me/bank-details", auth, controller.updateBankDetails);

module.exports = router;