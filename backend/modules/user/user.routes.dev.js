const express = require("express");
const controller = require("./user.controller");
// const auth = require("../../middlewares/auth.middleware"); // Commented out for testing
const upload = require("../../config/multer");

const router = express.Router();

// DEVELOPMENT ONLY - These routes have NO authentication
// WARNING: Remove this file in production!
router.get("/dev/me", controller.getProfile);
router.put("/dev/me", upload.single("profile_image"), controller.updateProfile);
router.get("/dev/preferences", controller.getPreferences);
router.put("/dev/preferences", controller.updatePreferences);

// Original authenticated routes
router.get("/me", auth, controller.getProfile);
router.put("/me", auth, upload.single("profile_image"), controller.updateProfile);
router.get("/me/preferences", auth, controller.getPreferences);
router.put("/me/preferences", auth, controller.updatePreferences);

module.exports = router;
