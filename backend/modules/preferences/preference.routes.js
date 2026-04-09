const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./preference.controller");

/**
 * All preference routes require authentication
 */

/**
 * GET /api/preferences/me
 * Returns current user's complete preferences
 */
router.get("/me", auth, controller.getMyPreferences);

/**
 * POST /api/preferences/me
 * Save preferences during onboarding
 * Rejects if already completed
 */
router.post("/me", auth, controller.savePreferences);

/**
 * PUT /api/preferences/me
 * Update existing preferences
 */
router.put("/me", auth, controller.updatePreferences);

/**
 * GET /api/preferences/status
 * Returns only the completion status
 * Lightweight endpoint for checking if onboarding is needed
 */
router.get("/status", auth, controller.getStatus);

module.exports = router;