const crypto = require("crypto");

/**
 * Encrypt sensitive text using AES-256-CBC
 * @param {string} text 
 * @returns {string} hex encrypted string
 */
function encrypt(text) {
  if (!text) {
    return null;
  }

  if (!process.env.REFUND_ENCRYPTION_KEY || !process.env.REFUND_ENCRYPTION_IV) {
    throw new Error("Encryption failed: Environment variables REFUND_ENCRYPTION_KEY or IV are missing.");
  }

  const key = Buffer.from(process.env.REFUND_ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(process.env.REFUND_ENCRYPTION_IV, 'hex');
  
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text.toString(), "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText 
 * @returns {string} decrypted string
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  if (!process.env.REFUND_ENCRYPTION_KEY || !process.env.REFUND_ENCRYPTION_IV) {
    console.warn("Encryption keys are not set. Returning text as is.");
    return encryptedText;
  }

  try {
    const key = Buffer.from(process.env.REFUND_ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(process.env.REFUND_ENCRYPTION_IV, 'hex');

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // If decryption fails, it might be legacy plain text
    return encryptedText;
  }
}

/**
 * Mask account number for safe display (e.g., XXXXXX1234)
 * @param {string} acc 
 * @returns {string} masked account number
 */
function maskAccount(acc) {
  if (!acc) return '';
  return "XXXXXX" + acc.slice(-4);
}

module.exports = {
  encrypt,
  decrypt,
  maskAccount
};
