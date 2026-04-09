/**
 * Preferences Module
 * 
 * Isolated module for managing user preferences including:
 * - Preference onboarding
 * - User product preferences
 * - Preference-based recommendation filters
 * 
 * Public API (for consumption by other modules):
 * - initializeForNewUser(userId): Initialize empty preferences for new users
 * - getRecommendationFilters(userId): Get normalized filters for product recommendations
 * - deleteUserPreferences(userId): Clean up preferences when user is deleted
 * 
 * REST API:
 * - GET /api/preferences/me: Get current user's preferences
 * - POST /api/preferences/me: Save preferences during onboarding
 * - PUT /api/preferences/me: Update existing preferences
 * - GET /api/preferences/status: Get onboarding completion status
 */

const preferenceService = require("./preference.service");
const preferenceController = require("./preference.controller");
const preferenceModel = require("./preference.model");

module.exports = {
  // Service layer for other module consumption
  service: preferenceService,

  // Controller (used by routes)
  controller: preferenceController,

  // Model (internal use)
  model: preferenceModel,

  // Public API for other modules
  publicAPI: {
    /**
     * Initialize preferences for a new user after registration
     * Should be called by auth module during user creation
     */
    initializeForNewUser: preferenceService.initializeForNewUser,

    /**
     * Get recommendation filters for the product module
     * Normalizes user preferences into a format suitable for product search
     */
    getRecommendationFilters: preferenceService.getRecommendationFilters,

    /**
     * Delete user preferences when user account is deleted
     * Should be called by user module during account deletion
     */
    deleteUserPreferences: preferenceService.deleteUserPreferences
  }
};