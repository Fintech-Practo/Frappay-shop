const userService = require("./user.service");
const { uploadFile, deleteFromS3Async } = require("../../utils/upload");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const { updateProfileSchema, updatePreferencesSchema, changePasswordSchema, deleteAccountSchema } = require("./user.schema");
const encryption = require("../../utils/encryption");

async function getProfile(req, res) {
  try {
    const user = await userService.getMyProfile(req.user.userId);
    if (!user) {
      return response.error(res, "User not found", 404);
    }
    return response.success(res, user, "Profile fetched successfully");
  } catch (err) {
    logger.error("Get profile failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch profile", 500);
  }
}

async function updateProfile(req, res) {
  try {
    const { error } = updateProfileSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(d => d.message).join(', ');
      return response.error(res, errorMessage, 400);
    }

    let updateData = {};
    const allowedFields = ['name', 'location', 'phone', 'gender', 'date_of_birth', 'address', 'address_line1', 'city', 'state', 'postal_code'];

    // 1. Extract standard fields — skip empty strings from FormData
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        // Map 'address' from frontend to 'address_line1' for backend compatibility
        if (field === 'address') {
          updateData['address_line1'] = req.body[field];
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // 2. Handle profile image upload (Robust alignment with product logic)
    // Support both single file (req.file) and fields (req.files.profile_image) for consistency
    const imageFile = req.file || (req.files && req.files.profile_image ? req.files.profile_image[0] : null);

    if (imageFile) {
      try {
        // Get current user to delete old profile image
        const currentUser = await userService.getMyProfile(req.user.userId);

        // Upload new image to S3/Local
        const imageUrl = await uploadFile(
          imageFile.buffer,
          imageFile.mimetype,
          'users/profiles',
          imageFile.originalname
        );
        updateData.profile_image_url = imageUrl;

        // Delete old profile image (async, non-blocking)
        if (currentUser && currentUser.profile_image_url) {
          deleteFromS3Async(currentUser.profile_image_url);
        }
      } catch (uploadError) {
        logger.error("Profile image upload failed", {
          userId: req.user.userId,
          error: uploadError.message
        });
        return response.error(res, `Image upload failed: ${uploadError.message}`, 400);
      }
    }

    // 3. Prevent email updates through this endpoint
    delete updateData.email;

    // 4. Validate that there's something to update
    if (Object.keys(updateData).length === 0) {
      return response.error(res, "No changes detected", 400);
    }

    const user = await userService.updateMyProfile(req.user.userId, updateData);
    return response.success(res, user, "Profile updated successfully");
  } catch (err) {
    logger.error("Update profile failed", {
      userId: req.user.userId,
      error: err.stack
    });
    return response.error(res, err.message || "Unable to update profile", 500);
  }
}

async function updatePreferences(req, res) {
  try {
    const { error } = updatePreferencesSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const user = await userService.updatePreferences(
      req.user.userId,
      req.body.preferences
    );
    return response.success(res, user, "Preferences updated successfully");
  } catch (err) {
    logger.error("Update preferences failed", {
      userId: req.user.userId,
      preferences: req.body.preferences,
      error: err.message
    });
    return response.error(res, err.message || "Unable to update preferences", 500);
  }
}

async function getPreferences(req, res) {
  try {
    const preferences = await userService.getPreferences(req.user.userId);
    return response.success(res, { preferences }, "Preferences fetched successfully");
  } catch (err) {
    logger.error("Get preferences failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch preferences", 500);
  }
}

// NEW: Change password
async function changePassword(req, res) {
  try {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { currentPassword, newPassword } = req.body;

    const result = await userService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    return response.success(res, null, "Password changed successfully");
  } catch (err) {
    logger.error("Change password failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to change password", 500);
  }
}

// Verify current password without changing
async function verifyPasswordController(req, res) {
  try {
    const { password } = req.body;
    if (!password) return response.error(res, 'Password is required', 400);
    await userService.verifyPassword(req.user.userId, password);
    return response.success(res, null, 'Password verified');
  } catch (err) {
    logger.error('Verify password failed', { userId: req.user.userId, error: err.message });
    return response.error(res, err.message || 'Unable to verify password', 400);
  }
}

// NEW: Delete account
async function deleteAccount(req, res) {
  try {
    const user = await userService.getMyProfile(req.user.userId);
    const { error } = deleteAccountSchema.validate(req.body, {
      context: { userHasPassword: !!user.password_hash }
    });
    if (error) return response.error(res, error.message, 400);

    const { password } = req.body;

    await userService.deleteAccount(req.user.userId, password);

    return response.success(res, null, "Account deleted successfully");
  } catch (err) {
    logger.error("Delete account failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to delete account", 500);
  }
}

// NEW: Get user activity
async function getUserActivity(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const activity = await userService.getUserActivity(req.user.userId, value);
    return response.success(res, activity, "User activity fetched successfully");
  } catch (err) {
    logger.error("Get user activity failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch user activity", 500);
  }
}

async function getBankDetails(req, res) {
  try {
    const bankDetails = await userService.getBankDetails(req.user.userId);
    if (bankDetails) {
        bankDetails.account_number = encryption.maskAccount(bankDetails.account_number);
    }
    return response.success(res, bankDetails, "Bank details fetched successfully");
  } catch (err) {
    logger.error("Get bank details failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch bank details", 500);
  }
}

async function updateBankDetails(req, res) {
  try {
    // 🚦 Production Validation: Ensure all required fields exist before service call
    const { account_number, ifsc_code, account_holder_name, bank_name } = req.body;
    
    if (!account_number || !ifsc_code || !account_holder_name) {
      return response.error(res, "Incomplete bank details. Account Number, IFSC, and Holder Name are mandatory.", 400);
    }

    const result = await userService.updateBankDetails(req.user.userId, req.body);
    return response.success(res, null, "Bank details updated successfully");
  } catch (err) {
    logger.error("Update bank details failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to update bank details", 500);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  getPreferences,
  changePassword,
  verifyPassword: verifyPasswordController,
  deleteAccount,
  getUserActivity,
  getBankDetails,
  updateBankDetails
};