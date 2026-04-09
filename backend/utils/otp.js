const pool = require("../config/db");
const { sendOTPEmail } = require("./email");
const bcrypt = require("bcrypt");

/**
 * Generate a random numeric OTP
 */
function generateOTP(length = 6) {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Identify if provider is email or phone
 */
function getIdentifierType(identifier) {
  const idStr = String(identifier || '');
  if (idStr.includes("@")) return "EMAIL";
  // Basic check for phone - numeric and 10+ digits
  const numeric = idStr.replace(/\D/g, "");
  if (numeric.length >= 10 && numeric.length <= 15) return "PHONE";
  return "UNKNOWN";
}

/**
 * Create an OTP for a specific identifier (email or phone)
 */
async function createOTP(identifier, purpose = "REGISTRATION") {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Invalidate any existing unused OTPs for this identifier and purpose
  await pool.execute(
    `UPDATE otp_verifications 
     SET is_used = true 
     WHERE identifier = ? AND purpose = ? AND is_used = false`,
    [identifier, purpose]
  );

  // Create new OTP record
  try {
    await pool.execute(
      `INSERT INTO otp_verifications (identifier, otp, purpose, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [identifier, hashedOtp, purpose, expiresAt]
    );
  } catch (err) {
    // Fallback for ENUM truncation if purpose is new/missing in certain environments
    const msg = String(err.message || '').toLowerCase();
    if (msg.includes('data truncated') || msg.includes('invalid') || msg.includes('enum')) {
      const fallback = 'PASSWORD_RESET';
      await pool.execute(
        `INSERT INTO otp_verifications (identifier, otp, purpose, expires_at) 
         VALUES (?, ?, ?, ?)`,
        [identifier, hashedOtp, fallback, expiresAt]
      ).catch(e => console.error("OTP insertion with fallback failed:", e.message));
    } else {
      throw err;
    }
  }

  // LOG OTP FOR DEBUGGING
  console.log(`[DEBUG] OTP for ${identifier} (${purpose}): ${otp}`);

  const type = getIdentifierType(identifier);

  // Send via detected channel
  if (type === "EMAIL") {
    sendOTPEmail(identifier, otp, purpose).catch((err) => {
      console.error("Failed to send OTP email:", err);
    });
  } else if (type === "PHONE") {
    try {
      const { sendOtpSMS } = require("../services/notificationService");
      // For registration, we might not have a userId yet, which is fine
      await sendOtpSMS(identifier, otp, null, purpose);
    } catch (smsErr) {
      console.error("Failed to send OTP SMS:", smsErr.message);
    }
  }

  // Cross-channel sync: If user exists with both email and phone, send to both for convenience
  (async () => {
    try {
      const query = type === "EMAIL" 
        ? "SELECT id, phone FROM users WHERE email = ? LIMIT 1" 
        : "SELECT id, email FROM users WHERE phone = ? LIMIT 1";
      const [rows] = await pool.execute(query, [identifier]);
      
      if (rows && rows.length > 0) {
        const user = rows[0];
        if (type === "EMAIL" && user.phone) {
          const { sendOtpSMS } = require("../services/notificationService");
          await sendOtpSMS(user.phone, otp, user.id, purpose).catch(e => {});
        } else if (type === "PHONE" && user.email) {
          sendOTPEmail(user.email, otp, purpose).catch(e => {});
        }
      }
    } catch (syncErr) {
      // Slient fail for cross-channel sync
    }
  })();

  return otp;
}

/**
 * Verify an OTP for a specific identifier
 */
async function verifyOTP(identifier, otp, purpose = "REGISTRATION") {
  // Get latest unused OTP for this identifier/purpose
  const [rows] = await pool.execute(
    `SELECT id, otp, expires_at 
     FROM otp_verifications 
     WHERE identifier = ? AND purpose = ? AND is_used = 0 
     ORDER BY id DESC 
     LIMIT 1`,
    [identifier, purpose]
  );

  if (rows.length === 0) {
    return { valid: false, message: "Invalid OTP or none found" };
  }

  const otpRecord = rows[0];

  // Check Expiry
  if (new Date(otpRecord.expires_at) < new Date()) {
    return { valid: false, message: "OTP has expired" };
  }

  // Compare Hash
  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  if (!isMatch) {
    return { valid: false, message: "Invalid OTP" };
  }

  // Mark OTP as used
  await pool.execute(
    `UPDATE otp_verifications 
     SET is_used = true 
     WHERE id = ?`,
    [otpRecord.id]
  );

  return { valid: true, message: "OTP verified successfully" };
}

module.exports = {
  generateOTP,
  createOTP,
  verifyOTP,
};