const userModel = require("../user/user.model");
const { hashPassword, comparePassword } = require("../../utils/hash");
const { signToken } = require("../../utils/jwt");
const { createOTP, verifyOTP } = require("../../utils/otp");
const { sendRegistrationWelcomeEmail } = require("../../utils/email");
const { verifyGoogleToken, linkOAuthProvider, findUserByOAuthProvider } = require("../../utils/oauth");
const ROLES = require("../../config/roles");
const { getRedirectPath } = require("./auth.redirect");

// Helper function to convert MySQL boolean (0/1) to JavaScript boolean
function toBoolean(value) {
  if (value === null || value === undefined) return false;
  return value === 1 || value === true || value === '1' || value === 'true';
}

/**
 * 1. REGISTRATION - OTP REQUEST
 */
async function requestOTPForRegistration(identifier) {
  // Check if identifier is email or phone
  const isEmail = identifier.includes("@");
  
  // Check if identity already exists
  const existing = isEmail 
    ? await userModel.findByEmail(identifier)
    : await userModel.findByPhone(identifier);
    
  if (existing) {
    throw new Error(`${isEmail ? 'Email' : 'Phone'} already registered. Please login.`);
  }

  await createOTP(identifier, "REGISTRATION");
  return { success: true, message: `OTP sent to ${isEmail ? 'email' : 'phone'}` };
}

/**
 * 2. REGISTRATION - VERIFY & CREATE (Strict)
 */
async function registerUser(data) {
  const { name, email, phone, password, role = ROLES.USER, otp } = data;
  const identifier = email || phone;

  if (role === ROLES.ADMIN) {
    throw new Error("Admin registration not allowed");
  }

  if (!identifier) {
    throw new Error("Email or phone is required");
  }

  // Identity verification MANDATORY
  if (!otp) {
    throw new Error("OTP is required for registration");
  }

  const otpResult = await verifyOTP(identifier, otp, "REGISTRATION");
  if (!otpResult.valid) {
    throw new Error(otpResult.message);
  }

  // Check again to prevent race conditions
  const isEmail = !!email;
  const existing = isEmail 
    ? await userModel.findByEmail(email)
    : await userModel.findByPhone(phone);
    
  if (existing) {
    throw new Error(`${isEmail ? 'Email' : 'Phone'} already registered`);
  }

  // Identity is verified, hash password and create
  const passwordHash = await hashPassword(password);

  const user = await userModel.createUser({
    name,
    email: email || null,
    phone: phone || null,
    passwordHash,
    role,
    isEmailVerified: isEmail,
    isPhoneVerified: !isEmail
  });

  // Welcome email if email provided
  if (email) {
    sendRegistrationWelcomeEmail(email, name).catch(console.error);
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    is_email_verified: !!user.is_email_verified,
    is_phone_verified: !!user.is_phone_verified
  });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_email_verified: !!user.is_email_verified,
      is_phone_verified: !!user.is_phone_verified
    },
    token
  };
}

/**
 * 3. LOGIN - EMAIL/PHONE/PASSWORD (Strict)
 */
async function loginUser(data) {
  const { email, phone, password } = data;
  const identifier = email || phone;

  if (!identifier || !password) {
    throw new Error("Identifier and password are required");
  }

  const user = email 
    ? await userModel.findByEmail(email)
    : await userModel.findByPhone(phone);

  if (!user) {
    throw new Error("Account not found");
  }

  // Account status check
  if (!toBoolean(user.is_active)) {
    throw new Error("Account is disabled. Please contact support.");
  }

  // Identity-first: Block password login for OAuth-only accounts
  if (!user.password_hash) {
    throw new Error("This account was created using Google login. Please continue with Google.");
  }

  // Verify identity
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new Error("Invalid password");
  }

  // Token with critical claims
  const token = signToken({
    userId: user.id,
    role: user.role,
    is_email_verified: toBoolean(user.is_email_verified),
    is_phone_verified: toBoolean(user.is_phone_verified)
  });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_email_verified: toBoolean(user.is_email_verified),
      is_phone_verified: toBoolean(user.is_phone_verified)
    },
    token,
    redirect: getRedirectPath(user.role)
  };
}

/**
 * 4. GOOGLE OAUTH FLOW (Identity Merging)
 */
async function oauthLogin(provider, token) {
  if (provider !== "GOOGLE") {
    throw new Error("Unsupported OAuth provider");
  }

  const verificationResult = await verifyGoogleToken(token);
  if (!verificationResult.success) {
    throw new Error(`OAuth verification failed: ${verificationResult.error}`);
  }

  const { providerUserId, email, name, picture } = verificationResult.data;

  // 1. Precise Match by provider ID
  let user = await findUserByOAuthProvider(provider, providerUserId);

  // 2. Identity Match by Email
  if (!user) {
    user = await userModel.findByEmail(email);

    if (user) {
      // Identity convergence - link this Google ID to existing record
      await linkOAuthProvider(user.id, provider, providerUserId, email);
      // Auto-verify email
      if (!toBoolean(user.is_email_verified)) {
        await userModel.updateEmailVerificationStatus(email, true);
        user.is_email_verified = 1;
      }
    } else {
      // New Identity Signup via Google
      user = await userModel.createUser({
        name: name || "User",
        email,
        passwordHash: null, // Password must be ADDED later via OTP
        role: ROLES.USER,
        isEmailVerified: true
      });
      await linkOAuthProvider(user.id, provider, providerUserId, email);
    }
  }

  if (!toBoolean(user.is_active)) {
    throw new Error("Account is disabled");
  }

  // JWT for synced user
  const jwtToken = signToken({
    userId: user.id,
    role: user.role,
    is_email_verified: true
  });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_email_verified: true
    },
    token: jwtToken,
    redirect: getRedirectPath(user.role)
  };
}

/**
 * 5. PASSWORD MANAGEMENT (Add vs Change)
 */

async function addPassword(userId, newPassword, otp) {
  const user = await userModel.findById(userId);
  if (!user) throw new Error("User not found");

  // Can only ADD if none exists
  if (user.password_hash) {
    throw new Error("Password already exists. Use change password flow.");
  }

  // If OTP provided, verify it. If not provided, allow only for authenticated users
  // who do not have a password yet and have a verified email (typical OAuth signup).
  if (otp) {
    // Try verifying with ADD_PASSWORD first; if not found/invalid, try PASSWORD_RESET
    // This handles cases where DB enum lacked ADD_PASSWORD so OTP was stored as PASSWORD_RESET
    let otpResult = await verifyOTP(user.email, otp, "ADD_PASSWORD");
    if (!otpResult.valid) {
      // attempt fallback if OTP was stored under PASSWORD_RESET due to DB enum mismatch
      otpResult = await verifyOTP(user.email, otp, "PASSWORD_RESET");
    }
    if (!otpResult.valid) throw new Error(otpResult.message);
  } else {
    // No OTP provided: allow only if user has no password and email is verified
    if (!user) throw new Error("User not found");
    if (user.password_hash) throw new Error("Password already exists. Use change password flow.");
    if (!user.is_email_verified) {
      throw new Error("Email not verified. OTP required to add password.");
    }
    // Proceed without OTP
  }

  const hashed = await hashPassword(newPassword);
  await userModel.updatePassword(userId, hashed);

  return { success: true, message: "Password added. You can now login using email and password." };
}

async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await require("../../config/db").execute(
    "SELECT password_hash FROM users WHERE id = ?",
    [userId]
  );

  const user = rows[0];
  if (!user || !user.password_hash) {
    throw new Error("Please add a password first.");
  }

  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) throw new Error("Incorrect current password");

  const hashed = await hashPassword(newPassword);
  await userModel.updatePassword(userId, hashed);

  return { success: true, message: "Password updated." };
}

async function changePasswordWithOTP(userId, currentPassword, newPassword, otp) {
  const user = await userModel.findById(userId);
  if (!user) throw new Error("User not found");

  if (!user.password_hash) {
    throw new Error("Please add a password first.");
  }

  // 1. Verify Current Password (Optional if OTP is verified)
  if (currentPassword) {
    const isMatch = await comparePassword(currentPassword, user.password_hash);
    if (!isMatch) throw new Error("Incorrect current password");
  }

  // 2. Verify OTP
  let otpResult = await verifyOTP(user.email, otp, "CHANGE_PASSWORD");
  if (!otpResult.valid) {
    // Fallback if DB enum mismatch (stores as PASSWORD_RESET)
    otpResult = await verifyOTP(user.email, otp, "PASSWORD_RESET");
  }

  if (!otpResult.valid) {
    throw new Error(otpResult.message);
  }

  // 3. Update Password
  const hashed = await hashPassword(newPassword);
  await userModel.updatePassword(userId, hashed);

  return { success: true, message: "Password updated successfully." };
}

async function getCurrentUser(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw new Error("User not found");

  const hasPassword = !!(await require("../../config/db").execute(
    "SELECT password_hash FROM users WHERE id = ?",
    [userId]
  ))[0][0].password_hash;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    is_email_verified: toBoolean(user.is_email_verified),
    is_phone_verified: toBoolean(user.is_phone_verified),
    has_password: hasPassword,
    profile_image_url: user.profile_image_url || null
  };
}

async function adminLogin(data) {
  const { email, password } = data;
  const user = await userModel.findByEmail(email);
  if (!user || user.role !== ROLES.ADMIN) throw new Error("Unauthorized");

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) throw new Error("Invalid credentials");

  const token = signToken({
    userId: user.id,
    role: user.role,
    is_email_verified: true
  });

  return {
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
    redirect: getRedirectPath(ROLES.ADMIN)
  };
}

/**
 * 7. FORGOT PASSWORD - REQUEST OTP
 */
async function requestPasswordReset(identifier) {
  const isEmail = String(identifier).includes("@");
  const user = isEmail 
    ? await userModel.findByEmail(identifier)
    : await userModel.findByPhone(identifier);

  if (!user) {
    // Don't reveal if identifier exists (security best practice)
    return { message: `If ${isEmail ? 'email' : 'phone'} exists, OTP will be sent` };
  }

  // Create OTP for password reset
  await createOTP(identifier, "PASSWORD_RESET");

  return { message: `OTP sent to your ${isEmail ? 'email' : 'phone'}` };
}

/**
 * 8. FORGOT PASSWORD - RESET WITH OTP
 */
async function resetPassword(identifier, newPassword, otp) {
  if (!identifier || !newPassword || !otp) {
    throw new Error("Identifier, new password, and OTP are required");
  }

  // Verify OTP first
  const otpResult = await verifyOTP(identifier, otp, "PASSWORD_RESET");

  if (!otpResult.valid) {
    throw new Error(otpResult.message);
  }

  // Find user and update password
  const isEmail = String(identifier).includes("@");
  const user = isEmail 
    ? await userModel.findByEmail(identifier)
    : await userModel.findByPhone(identifier);

  if (!user) {
    throw new Error("User not found");
  }

  const passwordHash = await hashPassword(newPassword);
  await userModel.updatePassword(user.id, passwordHash);

  return { message: "Password reset successfully" };
}

module.exports = {
  registerUser,
  loginUser,
  adminLogin,
  requestOTPForRegistration,
  requestPasswordReset,
  resetPassword,
  oauthLogin,
  getCurrentUser,
  addPassword,
  changePassword,
  changePasswordWithOTP
};