const sellerOnboardingModel = require("./sellerOnboarding.model");
const userModel = require("../user/user.model");
const pool = require("../../config/db");
const delhiveryService = require("../logistics/delhivery.service");
const { getSignedDocUrl } = require("../../utils/s3.util");

async function submitOnboarding(userId, data) {

  // Check if user already has seller role
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "SELLER") {
    throw new Error("You are already a seller");
  }

  // Validate required fields
  const requiredFields = [
    'business_name', 'business_location', 'city', 'pin', 'phone',
    'bank_account_number', 'bank_ifsc', 'bank_name', 'pan_number', 'aadhaar_number',
    'warehouse_name', 'warehouse_phone', 'warehouse_address', 'warehouse_city', 'warehouse_pin', 'warehouse_email',
    'return_address', 'return_city', 'return_state', 'return_pin'
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`${field.replace(/_/g, ' ')} is required`);
    }
  }

  // Validate PAN format (basic)
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan_number)) {
    throw new Error("Invalid PAN number format");
  }

  // Validate Aadhaar format (basic - 12 digits)
  if (!/^\d{12}$/.test(data.aadhaar_number)) {
    throw new Error("Invalid Aadhaar number format (must be 12 digits)");
  }

  // Validate IFSC format (basic)
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bank_ifsc)) {
    throw new Error("Invalid IFSC code format");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Save Seller Info (Identity / Business)
    const onboarding = await sellerOnboardingModel.createOrUpdate(userId, data, connection);

    // 2. Save Warehouse Details (Logistics)
    const [existingWarehouse] = await connection.query(
      `SELECT id FROM seller_warehouses WHERE seller_id = ?`,
      [userId]
    );

    if (existingWarehouse.length > 0) {
      await connection.query(
        `UPDATE seller_warehouses
         SET warehouse_name = ?, pickup_location_name = ?, address = ?,
             city = ?, state = ?, pincode = ?, phone = ?, email = ?,
             return_address = ?, return_city = ?, return_state = ?, return_pincode = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          data.warehouse_name || data.business_name,
          data.warehouse_name || data.business_name, // default pickup_location_name to warehouse_name
          data.warehouse_address,
          data.warehouse_city,
          data.return_state || data.warehouse_city, // fallback state
          data.warehouse_pin,
          data.warehouse_phone,
          data.warehouse_email,
          data.return_address || data.warehouse_address,
          data.return_city || data.warehouse_city,
          data.return_state || data.warehouse_city,
          data.return_pin || data.warehouse_pin,
          existingWarehouse[0].id
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO seller_warehouses
         (seller_id, warehouse_name, pickup_location_name, address, city, state, pincode, phone, email,
          return_address, return_city, return_state, return_pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          data.warehouse_name || data.business_name,
          data.warehouse_name || data.business_name,
          data.warehouse_address,
          data.warehouse_city,
          data.return_state || data.warehouse_city,
          data.warehouse_pin,
          data.warehouse_phone,
          data.warehouse_email,
          data.return_address || data.warehouse_address,
          data.return_city || data.warehouse_city,
          data.return_state || data.warehouse_city,
          data.return_pin || data.warehouse_pin
        ]
      );
    }

    await connection.commit();
    return onboarding;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function getMyOnboardingStatus(userId) {
  const status = await sellerOnboardingModel.findByUserId(userId);
  const user = await userModel.findById(userId);

  return {
    onboarding: status,
    user_role: user?.role,
    is_seller: user?.role === "SELLER"
  };
}

async function getAllPendingOnboarding(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const pendingRequests = await sellerOnboardingModel.getAllPending({ limit, offset });
  const totalItems = await sellerOnboardingModel.countPending();
  const totalPages = Math.ceil(totalItems / limit);
  return { pendingRequests, totalPages, currentPage: page, totalItems };
}

async function getOnboardingDetails(userId) {
  const details = await sellerOnboardingModel.findByUserId(userId);
  if (details) {
    try {
      if (details.pan_url) {
        details.pan_url = await getSignedDocUrl(details.pan_url);
      }
      if (details.aadhaar_url) {
        details.aadhaar_url = await getSignedDocUrl(details.aadhaar_url);
      }
      // Backward compatibility for generic field
      if (details.govt_id_url) {
        details.govt_id_url = await getSignedDocUrl(details.govt_id_url);
      }
    } catch (err) {
      console.error("Failed to sign KYC doc URL for admin:", err);
    }
  }
  return details;
}

async function approveOnboarding(userId, adminId, commissionRate = null) {
  const result = await sellerOnboardingModel.approve(userId, adminId, commissionRate);

  // Sync warehouse: Get the existing warehouse for this seller
  try {
    const [warehouses] = await pool.query(
      `SELECT * FROM seller_warehouses WHERE seller_id = ? LIMIT 1`,
      [userId]
    );

    if (warehouses.length > 0) {
      const warehouse = warehouses[0];
      const syncMethod = warehouse.warehouse_created
        ? delhiveryService.editClientWarehouse
        : delhiveryService.createClientWarehouse;

      await syncMethod({
        ...warehouse,
        pickup_location_name: warehouse.warehouse_name || warehouse.pickup_location_name
      });

      await pool.query(
        `UPDATE seller_warehouses SET warehouse_created = TRUE WHERE id = ?`,
        [warehouse.id]
      );
    }
  } catch (err) {
    console.error(`Failed to sync warehouse with Delhivery for seller ${userId}:`, err);
  }

  return result;
}

async function rejectOnboarding(userId, adminId, reason) {
  if (!reason || reason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }
  return await sellerOnboardingModel.reject(userId, adminId, reason);
}

module.exports = {
  submitOnboarding,
  getMyOnboardingStatus,
  getAllPendingOnboarding,
  getOnboardingDetails,
  approveOnboarding,
  rejectOnboarding
};