const {
  registerSchema,
  loginSchema,
  requestOTPSchema,
  verifyOTPSchema,
  oauthSchema,
  addPasswordSchema,
  changePasswordSchema,
  changePasswordWithOTPSchema
} = require("./auth.schema");
const authService = require("./auth.service");
const { createOTP, verifyOTP } = require("../../utils/otp");
const response = require("../../utils/response");

// Request OTP for registration or password additions
async function requestOTP(req, res, next) {
  try {
    const { error } = requestOTPSchema.validate(req.body);
    if (error) {
      console.error("Joi Validation Error (requestOTP):", error.message, req.body);
      return response.error(res, error.message, 400);
    }

    const { email, phone, purpose = "REGISTRATION" } = req.body;
    const identifier = email || phone;

    if (purpose === "REGISTRATION") {
      await authService.requestOTPForRegistration(identifier);
    } else if (purpose === 'ADD_PASSWORD') {
      const user = email ? await require('../user/user.model').findByEmail(email) : await require('../user/user.model').findByPhone(phone);
      if (!user) return response.error(res, 'Account not found', 404);
      await createOTP(identifier, purpose);
    } else {
      await createOTP(identifier, purpose);
    }

    return response.success(res, null, `OTP sent to ${email ? 'email' : 'phone'}`);
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// Verify OTP
async function verifyOTPController(req, res, next) {
  try {
    const { error } = verifyOTPSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { email, phone, otp, purpose = "REGISTRATION" } = req.body;
    const identifier = email || phone;
    const result = await verifyOTP(identifier, otp, purpose);

    if (!result.valid) {
      return response.error(res, result.message, 400);
    }

    return response.success(res, null, "OTP verified successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// Register user (Strict OTP required in service)
async function register(req, res, next) {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await authService.registerUser(req.body);
    return response.success(res, result, "User registered successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// User login
async function login(req, res, next) {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await authService.loginUser(req.body);
    return response.success(res, result, "Login successful");
  } catch (err) {
    return response.error(res, err.message || "Login failed", 401);
  }
}

// Admin login
async function adminLogin(req, res, next) {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await authService.adminLogin(req.body);
    return response.success(res, result, "Admin login successful");
  } catch (err) {
    return response.error(res, err.message, 401);
  }
}

// OAuth Google login
async function oauthGoogle(req, res, next) {
  try {
    const { error } = oauthSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await authService.oauthLogin("GOOGLE", req.body.token);
    return response.success(res, result, "OAuth login successful");
  } catch (err) {
    return response.error(res, err.message, 401);
  }
}

// Add password to OAuth account
async function addPasswordController(req, res, next) {
  try {
    const { error } = addPasswordSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await authService.addPassword(req.user.userId, req.body.newPassword, req.body.otp);
    return response.success(res, null, result.message);
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// Change existing password
async function changePasswordController(req, res, next) {
  try {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    return response.success(res, null, result.message);
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// Change password with OTP (Seller requirement)
async function changePasswordWithOTPController(req, res, next) {
  try {
    const { error } = changePasswordWithOTPSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await authService.changePasswordWithOTP(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword,
      req.body.otp
    );
    return response.success(res, null, result.message);
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// Get current user
async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    return response.success(res, user, "User fetched");
  } catch (err) {
    return response.error(res, err.message || "Failed to fetch user", 500);
  }
}

// Request password reset OTP
async function requestPasswordResetController(req, res, next) {
  try {
    const { error } = requestOTPSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { email, phone } = req.body;
    const identifier = email || phone;
    const result = await authService.requestPasswordReset(identifier);
    return response.success(res, null, result.message);
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// Reset password with OTP
async function resetPasswordController(req, res, next) {
  try {
    const { email, phone, newPassword, otp } = req.body;
    const identifier = email || phone;

    if (!identifier || !newPassword || !otp) {
      return response.error(res, "Identifier, new password, and OTP are required", 400);
    }

    const result = await authService.resetPassword(identifier, newPassword, otp);
    return response.success(res, null, result.message);
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

module.exports = {
  register,
  login,
  adminLogin,
  requestOTP,
  verifyOTP: verifyOTPController,
  requestPasswordReset: requestPasswordResetController,
  resetPassword: resetPasswordController,
  oauthGoogle,
  getMe,
  addPassword: addPasswordController,
  changePassword: changePasswordController,
  changePasswordWithOTP: changePasswordWithOTPController
};