const pool = require("../../config/db");

/**
 * Find preferences by user ID
 * Returns the complete preference record including completion status
 */
async function findByUserId(userId) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, user_id, preferences, is_completed, created_at, updated_at
       FROM user_preferences
       WHERE user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding preferences by user ID:", error);
    throw error;
  }
}

/**
 * Create initial preference record for a new user
 * Called after user registration
 */
async function createEmpty(userId) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO user_preferences (user_id, preferences, is_completed)
       VALUES (?, JSON_OBJECT(), false)`,
      [userId]
    );

    return await findByUserId(userId);
  } catch (error) {
    console.error("Error creating empty preferences:", error);
    throw error;
  }
}

/**
 * Save preferences for the first time (during onboarding)
 * Marks is_completed as true
 */
async function saveOnboarding(userId, preferenceData) {
  try {
    const [result] = await pool.execute(
      `UPDATE user_preferences
       SET preferences = ?, is_completed = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [JSON.stringify(preferenceData), userId]
    );

    if (result.affectedRows === 0) {
      throw new Error("User preferences not found");
    }

    return await findByUserId(userId);
  } catch (error) {
    console.error("Error saving preferences during onboarding:", error);
    throw error;
  }
}

/**
 * Update existing preferences
 * Used when user edits preferences after onboarding completion
 */
async function updatePreferences(userId, preferenceData) {
  try {
    const [result] = await pool.execute(
      `UPDATE user_preferences
       SET preferences = JSON_MERGE_PATCH(preferences, ?), updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [JSON.stringify(preferenceData), userId]
    );

    if (result.affectedRows === 0) {
      throw new Error("User preferences not found");
    }

    return await findByUserId(userId);
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw error;
  }
}

/**
 * Check if user has completed onboarding preferences
 * Returns only the completion status
 */
async function getCompletionStatus(userId) {
  try {
    const [rows] = await pool.execute(
      `SELECT user_id, is_completed, updated_at
       FROM user_preferences
       WHERE user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error getting completion status:", error);
    throw error;
  }
}

/**
 * Get normalized preference filters for product recommendations
 * Extracts preference data in a format suitable for product search queries
 */
async function getPreferenceFilters(userId) {
  try {
    const preferences = await findByUserId(userId);
    
    if (!preferences || !preferences.preferences) {
      return null;
    }

    const prefs = preferences.preferences;
    
    // Build normalized filters for consumption by product module
    const filters = {
      categories: prefs.interested_categories || [],
      types: prefs.preferred_types || [],
      formats: prefs.preferred_formats || [],
      budget: {
        min: prefs.budget_min || null,
        max: prefs.budget_max || null
      },
      purposes: prefs.purpose || [],
      language: prefs.language || null,
      completed: preferences.is_completed
    };

    return filters;
  } catch (error) {
    console.error("Error getting preference filters:", error);
    throw error;
  }
}

/**
 * Get all preferences (internal method, for admin or analytical purposes)
 * Should be protected by role-based middleware
 */
async function findAll(limit = 100, offset = 0) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, user_id, preferences, is_completed, created_at, updated_at
       FROM user_preferences
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    console.error("Error finding all preferences:", error);
    throw error;
  }
}

/**
 * Count total preference records
 * Useful for pagination
 */
async function count() {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total FROM user_preferences`
    );
    return rows[0].total;
  } catch (error) {
    console.error("Error counting preferences:", error);
    throw error;
  }
}

/**
 * Delete preferences for a user
 * Called when user account is deleted
 */
async function deleteByUserId(userId) {
  try {
    const [result] = await pool.execute(
      `DELETE FROM user_preferences WHERE user_id = ?`,
      [userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting preferences:", error);
    throw error;
  }
}

module.exports = {
  findByUserId,
  createEmpty,
  saveOnboarding,
  updatePreferences,
  getCompletionStatus,
  getPreferenceFilters,
  findAll,
  count,
  deleteByUserId
};