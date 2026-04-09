const preferenceService = require("./preference.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const {
  createPreferencesSchema,
  updatePreferencesSchema
} = require("./preference.schema");

/**
 * GET /api/preferences/me
 * Returns current user's complete preferences including completion status
 */
async function getMyPreferences(req, res) {
  try {
    const preferences = await preferenceService.getMyPreferences(req.user.userId);
    
    return response.success(
      res,
      preferences,
      "Preferences retrieved successfully"
    );
  } catch (err) {
    logger.error("Get preferences failed", {
      userId: req.user.userId,
      error: err.message
    });

    // If the preferences table is not yet created, return an empty result
    // This avoids failing user registration / OAuth flows while migrations are applied
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return response.success(res, { user_id: req.user.userId, is_completed: false, preferences: {} }, "Preferences not initialized");
    }

    return response.error(res, err.message || "Unable to fetch preferences", 500);
  }
}

/**
 * POST /api/preferences/me
 * Save preferences for the first time (during onboarding)
 * Rejects if already completed to prevent accidental overwrite
 */
async function savePreferences(req, res) {
  try {
    // Validate request body
    const { error } = createPreferencesSchema.validate(req.body);
    if (error) {
      return response.error(res, error.message, 400);
    }

    // Extract preferences from validated body
    const { preferences: preferenceData } = req.body;

    // Save preferences with onboarding completion
    const updated = await preferenceService.savePreferencesOnboarding(
      req.user.userId,
      preferenceData
    );

    return response.success(
      res,
      updated,
      "Preferences saved successfully. Onboarding completed."
    );
  } catch (err) {
    logger.error("Save preferences failed", {
      userId: req.user.userId,
      error: err.message
    });

    // Return 409 Conflict if preferences already completed
    if (err.message.includes("already completed")) {
      return response.error(res, err.message, 409);
    }

    return response.error(res, err.message || "Unable to save preferences", 500);
  }
}

/**
 * PUT /api/preferences/me
 * Update existing user preferences
 * Supports partial updates via JSON merge
 */
async function updatePreferences(req, res) {
  try {
    // Validate request body
    const { error } = updatePreferencesSchema.validate(req.body);
    if (error) {
      return response.error(res, error.message, 400);
    }

    // Extract preferences from validated body
    const { preferences: preferenceData } = req.body;

    // Update preferences
    const updated = await preferenceService.updateUserPreferences(
      req.user.userId,
      preferenceData
    );

    return response.success(
      res,
      updated,
      "Preferences updated successfully"
    );
  } catch (err) {
    logger.error("Update preferences failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to update preferences", 500);
  }
}

/**
 * GET /api/preferences/status
 * Lightweight endpoint returning only completion status
 * Used by frontend immediately after login to determine if onboarding needed
 */
async function getStatus(req, res) {
  try {
    const status = await preferenceService.getOnboardingStatus(req.user.userId);
    
    return response.success(
      res,
      status,
      "Preference status retrieved successfully"
    );
  } catch (err) {
    logger.error("Get preference status failed", {
      userId: req.user.userId,
      error: err.message
    });
    // If preferences table missing, treat as not completed (no onboarding yet)
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return response.success(res, { user_id: req.user.userId, is_completed: false }, "Preferences not initialized");
    }

    return response.error(res, err.message || "Unable to fetch status", 500);
  }
}

module.exports = {
  getMyPreferences,
  savePreferences,
  updatePreferences,
  getStatus
};