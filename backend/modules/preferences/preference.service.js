const preferenceModel = require("./preference.model");
const logger = require("../../utils/logger");

/**
 * Get current user's preferences
 * Includes completion status
 */
async function getMyPreferences(userId) {
  const preferences = await preferenceModel.findByUserId(userId);

  // If no preferences exist yet for the user, return a safe default
  if (!preferences) {
    return { user_id: userId, is_completed: false, preferences: {} };
  }

  // Parse JSON preferences if stored as string
  if (typeof preferences.preferences === 'string') {
    try {
      preferences.preferences = JSON.parse(preferences.preferences);
    } catch (e) {
      // If parsing fails, fall back to empty object but keep logs
      logger.warn('Failed to parse stored preferences JSON', { userId, error: e.message });
      preferences.preferences = {};
    }
  }

  return preferences;
}

/**
 * Save user preferences during onboarding
 * 
 * @param {number} userId - User ID
 * @param {object} preferenceData - Preference data from request
 * @returns {object} Updated preference record with is_completed = true
 * @throws {Error} If preferences were already completed
 */
async function savePreferencesOnboarding(userId, preferenceData) {
  // Check if preferences already completed
  const existing = await preferenceModel.findByUserId(userId);
  
  if (!existing) {
    throw new Error("User preferences not found. Please contact support.");
  }

  if (existing.is_completed) {
    throw new Error(
      "Preferences already completed. Use PUT endpoint to update existing preferences."
    );
  }

  // Save the onboarding preferences
  const updated = await preferenceModel.saveOnboarding(userId, preferenceData);
  
  if (typeof updated.preferences === 'string') {
    updated.preferences = JSON.parse(updated.preferences);
  }

  logger.info("Preferences onboarding completed", {
    userId,
    timestamp: new Date().toISOString()
  });

  return updated;
}

/**
 * Update user preferences
 * Used after onboarding completion
 * Supports partial updates via JSON_MERGE_PATCH
 * 
 * @param {number} userId - User ID
 * @param {object} preferenceData - Partial or complete preference data
 * @returns {object} Updated preference record
 */
async function updateUserPreferences(userId, preferenceData) {
  const existing = await preferenceModel.findByUserId(userId);
  
  if (!existing) {
    throw new Error("User preferences not found");
  }

  // Update preferences
  const updated = await preferenceModel.updatePreferences(userId, preferenceData);
  
  if (typeof updated.preferences === 'string') {
    updated.preferences = JSON.parse(updated.preferences);
  }

  logger.info("User preferences updated", {
    userId,
    timestamp: new Date().toISOString()
  });

  return updated;
}

/**
 * Get preference completion status
 * Lightweight endpoint for frontend to determine if onboarding is needed
 * 
 * @param {number} userId - User ID
 * @returns {object} { is_completed: boolean, user_id: number }
 */
async function getOnboardingStatus(userId) {
  const status = await preferenceModel.getCompletionStatus(userId);

  // If no status row exists, treat as not completed instead of throwing
  if (!status) {
    return { user_id: userId, is_completed: false };
  }

  return {
    user_id: status.user_id,
    is_completed: status.is_completed
  };
}

/**
 * Get normalized preference filters for product recommendations
 * This is a service-level function exposed to other modules
 * 
 * @param {number} userId - User ID
 * @returns {object} Normalized filters structure for product search
 */
async function getRecommendationFilters(userId) {
  const filters = await preferenceModel.getPreferenceFilters(userId);
  
  if (!filters) {
    return null;
  }

  return filters;
}

/**
 * Initialize preferences for a new user
 * Called by auth module after successful registration
 * 
 * @param {number} userId - User ID
 * @returns {object} Empty preference record
 */
async function initializeForNewUser(userId) {
  const preferences = await preferenceModel.createEmpty(userId);
  
  if (typeof preferences.preferences === 'string') {
    preferences.preferences = JSON.parse(preferences.preferences);
  }

  logger.info("Preferences initialized for new user", {
    userId,
    timestamp: new Date().toISOString()
  });

  return preferences;
}

/**
 * Clean up preferences when user account is deleted
 * Called by user module during account deletion
 * 
 * @param {number} userId - User ID
 * @returns {boolean} Success flag
 */
async function deleteUserPreferences(userId) {
  return await preferenceModel.deleteByUserId(userId);
}

module.exports = {
  getMyPreferences,
  savePreferencesOnboarding,
  updateUserPreferences,
  getOnboardingStatus,
  getRecommendationFilters,
  initializeForNewUser,
  deleteUserPreferences
};