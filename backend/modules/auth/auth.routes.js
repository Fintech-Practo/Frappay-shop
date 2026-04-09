const express = require("express");
const controller = require("./auth.controller");
const auth = require("../../middlewares/auth.middleware");
const { requireVerifiedEmail } = require("./auth.guard");

const router = express.Router();

// Registration with OTP verification
router.post("/register", controller.register);
router.post("/register/request-otp", controller.requestOTP);
router.post("/register/verify-otp", controller.verifyOTP);

// Login
router.post("/login", controller.login);
router.post("/admin/login", controller.adminLogin);

// OAuth login
router.post("/oauth/google", controller.oauthGoogle);

// Password Management
router.post("/password/request-reset", controller.requestPasswordReset);
router.post("/password/reset", controller.resetPassword);
router.post("/password/add", auth, controller.addPassword);
router.post("/password/change", auth, controller.changePassword);
router.post("/password/change-otp", auth, controller.changePasswordWithOTP);

// Get current user
router.get("/me", auth, controller.getMe);
router.post("/request-otp", auth, controller.requestOTP);

module.exports = router;