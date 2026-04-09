const userModel = require("./user.model");
const { deleteFromS3Async } = require("../../utils/upload");
const { comparePassword, hashPassword } = require("../../utils/hash");
const pool = require("../../config/db");
const encryption = require("../../utils/encryption");

async function getMyProfile(userId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  // Remove sensitive data
  if (user.password_hash) delete user.password_hash;
  return user;
}

async function updateMyProfile(userId, data) {
  // Email is immutable - remove if present
  if (data.email) {
    delete data.email;
  }

  // 🔥 Address Structuring Logic: Sync with the 'addresses' table
  const addressModel = require("../address/address.model");
  const addressFields = ['address_line1', 'city', 'state', 'postal_code'];
  const hasAddressData = addressFields.some(f => data[f] !== undefined);

  if (hasAddressData) {
    const user = await userModel.findById(userId);
    const addressData = {
      address_line1: data.address_line1 || user.address_line1 || "",
      city: data.city || user.city || "",
      state: data.state || user.state || "",
      postal_code: data.postal_code || user.postal_code || "",
      full_name: data.name || user.name || "Customer",
      is_default: true,
      label: "Home"
    };

    if (user.address_id) {
      // Update existing address
      await addressModel.update(user.address_id, userId, addressData);
    } else {
      // Create new address and link it
      const newAddress = await addressModel.create(userId, addressData);
      data.address_id = newAddress.id;
    }

    // Clean up raw address fields so they don't bloat the users table UPDATE query
    addressFields.forEach(f => delete data[f]);
  }

  // NOTE: Image cleanup for the actually uploaded file is handled in the controller 
  // to align with the product module pattern. 
  // However, we still delegate the DB update to the model.

  return await userModel.updateProfile(userId, data);
}

async function updatePreferences(userId, preferences) {
  return userModel.updatePreferences(userId, preferences);
}

async function getPreferences(userId) {
  return userModel.getPreferences(userId);
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.password_hash) {
    throw new Error("This account uses OAuth login. Password cannot be changed.");
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  const newPasswordHash = await hashPassword(newPassword);
  await userModel.updatePassword(userId, newPasswordHash);

  return { message: "Password changed successfully" };
}

async function verifyPassword(userId, password) {
  const user = await userModel.findById(userId);
  if (!user) throw new Error('User not found');
  if (!user.password_hash) throw new Error('This account uses OAuth login. No password set');
  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) throw new Error('Password is incorrect');
  return { message: 'Password verified' };
}

async function deleteAccount(userId, password) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === 'ADMIN') {
    throw new Error("Admin accounts cannot be deleted through this endpoint");
  }

  if (user.password_hash) {
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("Password is incorrect");
    }
  }

  await userModel.deleteUser(userId);

  return { message: "Account deleted successfully" };
}

async function getUserActivity(userId, filters = {}) {
  return userModel.getUserActivity(userId, filters);
}

async function getBankDetails(userId) {
  const [rows] = await pool.query(
    `SELECT account_number, ifsc_code, account_holder_name, bank_name 
     FROM user_bank_details WHERE user_id = ?`,
    [userId]
  );
  if (!rows[0]) return null;
  
  const decrypted = { ...rows[0] };
  decrypted.account_number = encryption.decrypt(decrypted.account_number);
  return decrypted;
}

async function updateBankDetails(userId, data) {
  const { account_number, ifsc_code, account_holder_name, bank_name } = data;
  
  // 🚦 Service-Level Validation: Ensure no required fields are undefined before processing
  if (!account_number || !ifsc_code || !account_holder_name) {
    throw new Error("Missing mandatory fields: Account number, IFSC, and Holder Name.");
  }

  // 🔥 Security Check: If the account number is masked (e.g. XXXXXX1234), 
  // do not update the actual encrypted field (keep existing).
  let encryptedAccountNumber;
  if (/^X+/.test(account_number)) {
      // Fetch existing and keep it
      const [existing] = await pool.query(
          `SELECT account_number FROM user_bank_details WHERE user_id = ?`,
          [userId]
      );
      if (existing.length > 0) {
          encryptedAccountNumber = existing[0].account_number;
      } else {
          throw new Error("Invalid account number provided.");
      }
  } else {
      encryptedAccountNumber = encryption.encrypt(account_number);
  }

  await pool.query(
    `INSERT INTO user_bank_details (user_id, account_number, ifsc_code, account_holder_name, bank_name)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
     account_number = ?,
     ifsc_code = VALUES(ifsc_code),
     account_holder_name = VALUES(account_holder_name),
     bank_name = VALUES(bank_name)`,
    [userId, encryptedAccountNumber, ifsc_code, account_holder_name, bank_name, encryptedAccountNumber]
  );

  return { message: "Bank details updated successfully" };
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  updatePreferences,
  getPreferences,
  changePassword,
  verifyPassword,
  deleteAccount,
  getUserActivity,
  getBankDetails,
  updateBankDetails
};