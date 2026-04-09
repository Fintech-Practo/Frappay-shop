const userModel = require("../user/user.model");
const orderModel = require("../order/order.model");
const auditService = require("../audit/audit.service");
const notificationService = require("../notification/notification.service");

async function getAllUsers(filters = {}) {
  const users = await userModel.listAll(filters);
  const total = await userModel.countAll(filters);
  return { users, total };
}

async function getAllOrders(filters = {}) {
  const orders = await orderModel.findAll(filters);
  const total = await orderModel.countAll(filters);
  return { orders, total };
}

async function disableUser(userId, reason, adminId) {
  return userModel.disableUser(userId, reason, adminId);
}

async function enableUser(userId, reason, adminId) {
  return userModel.enableUser(userId, reason, adminId);
}

async function getDashboardStats(range = '6m') {
  const userStats = await userModel.getUserStats();
  const orderStats = await orderModel.getOrderStats();
  const userGrowth = await userModel.getUserGrowthStats(range);
  const revenueSeries = await orderModel.getRevenueSeriesStats(range);

  return {
    users: userStats,
    orders: orderStats,
    charts: {
      user_growth: userGrowth,
      revenue_series: revenueSeries
    }
  };
}

async function getLowStockProducts(threshold) {
  const productModel = require("../product/product.model");
  return productModel.findLowStock(threshold);
}

async function getSalesAnalytics(filters = {}) {
  const orderModel = require("../order/order.model");
  return orderModel.getSalesAnalytics(filters);
}

async function getUserActivity(filters = {}) {
  return userModel.getUserActivity(filters);
}

async function getSystemHealth() {
  const db = require("../../config/db");
  try {
    await db.execute('SELECT 1');
    return { status: 'healthy', database: 'connected' };
  } catch (error) {
    return { status: 'unhealthy', database: 'disconnected', error: error.message };
  }
}


const pool = require("../../config/db");

// --- Global Commission Settings ---

async function getGlobalCommission() {
  const [rows] = await pool.query(
    "SELECT percentage FROM commission_settings WHERE type = 'GLOBAL' LIMIT 1"
  );
  return rows.length > 0 ? rows[0] : { percentage: 10.00 };
}

async function updateGlobalCommission(percentage) {
  await pool.query(
    "UPDATE commission_settings SET percentage = ? WHERE type = 'GLOBAL'",
    [percentage]
  );
  return { success: true };
}

// --- Commission Requests ---

async function getCommissionRequests(status = 'PENDING') {
  const [rows] = await pool.query(
    `SELECT r.*, u.name as seller_name, u.email as seller_email 
     FROM seller_commission_requests r
     JOIN users u ON r.seller_id = u.id
     WHERE r.status = ?
     ORDER BY r.created_at DESC`,
    [status]
  );
  return rows;
}

async function getOrderSMSLogs(orderId) {
  const [rows] = await pool.query(
    `SELECT * FROM sms_logs WHERE order_id = ? ORDER BY created_at DESC`,
    [orderId]
  );
  return rows;
}

async function actionCommissionRequest(requestId, action, adminRemarks, adminId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM seller_commission_requests WHERE id = ?",
      [requestId]
    );

    if (rows.length === 0) {
      throw new Error("Request not found");
    }

    const request = rows[0];

    if (request.status !== 'PENDING') {
      throw new Error("Request is not pending");
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await connection.query(
      "UPDATE seller_commission_requests SET status = ?, admin_remarks = ? WHERE id = ?",
      [newStatus, adminRemarks, requestId]
    );

    if (newStatus === 'APPROVED') {
      // Update seller analytics with new commission
      await connection.query(
        "UPDATE seller_analytics SET admin_commission_percentage = ? WHERE seller_id = ?",
        [request.requested_percentage, request.seller_id]
      );
    }

    await connection.commit();

    // --- Post-Commit Actions (Notifications & Audits) ---

    // 1. Notify Seller
    try {
      await notificationService.sendNotification(
        request.seller_id,
        'SYSTEM',
        'Commission Request Update',
        `Your commission change request has been ${newStatus.toLowerCase()}. ${adminRemarks ? 'Remarks: ' + adminRemarks : ''}`,
        'COMMISSION_REQUEST',
        requestId
      );
    } catch (notifyErr) {
      console.error("Seller notification for commission request failed:", notifyErr.message);
    }

    // 2. Audit Log (Moving from controller for consistency)
    try {
      await auditService.logAction({
        action: `${action}_COMMISSION_REQUEST`,
        module: 'SELLER',
        entityType: 'COMMISSION_REQUEST',
        entityId: parseInt(requestId),
        performedBy: adminId,
        newValues: { action, remarks: adminRemarks }
      });
    } catch (auditErr) {
      console.error("Audit log for commission request failed:", auditErr.message);
    }

    return { success: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// --- Profile Update Requests ---

async function getProfileUpdateRequests(status = 'PENDING') {
  const [rows] = await pool.query(
    `SELECT r.*, u.name as seller_name, u.email as seller_email 
     FROM seller_profile_update_requests r
     JOIN users u ON r.seller_id = u.id
     WHERE r.status = ?
     ORDER BY r.created_at DESC`,
    [status]
  );
  return rows;
}

async function actionProfileUpdateRequest(requestId, action, adminRemarks, adminId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM seller_profile_update_requests WHERE id = ?",
      [requestId]
    );

    if (rows.length === 0) {
      throw new Error("Request not found");
    }

    const request = rows[0];

    if (request.status !== 'PENDING') {
      throw new Error("Request is not pending");
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await connection.query(
      "UPDATE seller_profile_update_requests SET status = ?, admin_remarks = ? WHERE id = ?",
      [newStatus, adminRemarks, requestId]
    );

    if (newStatus === 'APPROVED') {
      const data = typeof request.data_json === 'string' ? JSON.parse(request.data_json) : request.data_json;

      // 1. Update seller_info table (only valid columns)
      const sellerInfoFields = [
        'business_name', 'business_location', 'bank_account_number', 'bank_ifsc', 'bank_name',
        'pan_number', 'aadhaar_number', 'pickup_location_name', 'pickup_pincode',
        'city', 'pin'
      ];

      const sellerInfoUpdates = [];
      const sellerInfoValues = [];

      for (const [key, value] of Object.entries(data)) {
        if (sellerInfoFields.includes(key) && value !== undefined && value !== '') {
          sellerInfoUpdates.push(`${key} = ?`);
          sellerInfoValues.push(value);
        }
      }

      if (sellerInfoUpdates.length > 0) {
        sellerInfoValues.push(request.seller_id);

        // Ensure record exists logic (upsert)
        const [existing] = await connection.query(
          "SELECT id FROM seller_info WHERE user_id = ?",
          [request.seller_id]
        );

        if (existing.length === 0) {
          const insertKeys = ['user_id', ...sellerInfoUpdates.map(u => u.split(' = ')[0]), 'approval_status'];
          const insertValues = [request.seller_id, ...sellerInfoValues, 'APPROVED'];

          await connection.query(
            `INSERT INTO seller_info (${insertKeys.join(', ')}) VALUES (${insertKeys.map(() => '?').join(', ')})`,
            insertValues
          );

        } else {
          await connection.query(
            `UPDATE seller_info SET ${sellerInfoUpdates.join(', ')} WHERE user_id = ?`,
            sellerInfoValues
          );
        }
      }

      // 2. Update seller_warehouses table (specific mapping)
      const warehouseMapping = {
        'warehouse_name': 'pickup_location_name',
        'warehouse_phone': 'phone',
        'warehouse_address': 'address',
        'warehouse_state': 'state',
        'warehouse_city': 'city',
        'warehouse_pin': 'pincode',
        'warehouse_country': 'country',
        'warehouse_email': 'email',
        'return_address': 'return_address',
        'return_city': 'return_city',
        'return_state': 'return_state',
        'return_pin': 'return_pincode'
      };

      const warehouseUpdates = [];
      const warehouseValues = [];

      for (const [apiKey, dbKey] of Object.entries(warehouseMapping)) {
        if (data[apiKey] !== undefined && data[apiKey] !== '') {
          warehouseUpdates.push(`${dbKey} = ?`);
          warehouseValues.push(data[apiKey]);
        }
      }

      if (warehouseUpdates.length > 0) {
        warehouseValues.push(request.seller_id);

        // Check if warehouse record exists
        const [existingWarehouse] = await connection.query(
          "SELECT id FROM seller_warehouses WHERE seller_id = ?",
          [request.seller_id]
        );

        if (existingWarehouse.length === 0) {
          // For new records, ensure pickup_location_name is set
          const insertFields = ['seller_id', 'pickup_location_name', ...warehouseUpdates.map(u => u.split(' = ')[0])];
          const insertValues = [request.seller_id, data.warehouse_name || 'Primary Warehouse', ...warehouseValues];

          await connection.query(
            `INSERT INTO seller_warehouses (${insertFields.join(', ')}) VALUES (${insertFields.map(() => '?').join(', ')})`,
            insertValues
          );
        } else {
          await connection.query(
            `UPDATE seller_warehouses SET ${warehouseUpdates.join(', ')} WHERE seller_id = ?`,
            warehouseValues
          );
        }
      }
    }

    await connection.commit();

    // --- Post-Commit Actions (Notifications & Audits) ---

    // 1. Notify Seller
    try {
      await notificationService.sendNotification(
        request.seller_id,
        'SYSTEM',
        'Profile Update Request',
        `Your profile update request has been ${newStatus.toLowerCase()}. ${adminRemarks ? 'Remarks: ' + adminRemarks : ''}`,
        'PROFILE_UPDATE_REQUEST',
        requestId
      );
    } catch (notifyErr) {
      console.error("Seller notification for profile update failed:", notifyErr.message);
    }

    // 2. Audit Log
    try {
      await auditService.logAction({
        action: `${action}_PROFILE_UPDATE`,
        module: 'SELLER',
        entityType: 'PROFILE_UPDATE_REQUEST',
        entityId: parseInt(requestId),
        performedBy: adminId,
        newValues: { action, remarks: adminRemarks }
      });
    } catch (auditErr) {
      console.error("Audit log for profile update failed:", auditErr.message);
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
async function createCoupon(data) {
  const {
    code,
    description,
    discount_type,
    discount_value,
    min_order_value,
    max_discount,
    expiry_date,
    usage_limit,
    per_user_limit,
    start_date,
    is_welcome
  } = data;

  await pool.query(
    `INSERT INTO coupons 
    (code, description, discount_type, discount_value, min_order_value, max_discount, expiry_date, usage_limit, per_user_limit, start_date, is_welcome)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      description,
      discount_type,
      discount_value,
      min_order_value,
      max_discount,
      expiry_date,
      usage_limit,
      per_user_limit,
      start_date,
      is_welcome
    ]
  );

  return { success: true };
}
async function toggleCouponStatus(id) {
  await pool.query(
    "UPDATE coupons SET is_active = NOT is_active WHERE id = ?",
    [id]
  );
  return { success: true };
}
async function getCouponUsageDetails(code) {
  const [rows] = await pool.query(
    `
    SELECT 
      o.id AS order_id,
      o.created_at,
      o.total_amount,
      o.discount_amount,
      u.name AS user_name,
      u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.coupon_code = ?
    ORDER BY o.created_at DESC
    `,
    [code]
  );

  return rows;
}
async function getAllCoupons() {
  const [rows] = await pool.query(
    "SELECT * FROM coupons ORDER BY created_at DESC"
  );
  return rows;
}
getCouponUsageDetails: async (code) => {
  const res = await api.get(`/admin/coupon-usage/${code}`);
  return res.data;
},
// 🔍 GET COUPON USAGE DETAILS
async function getCouponUsageDetails(code) {
  const [rows] = await pool.query(
    `SELECT 
        o.id AS order_id,
        u.name AS user_name,
        o.discount_amount AS discount_value,
        o.created_at AS used_at
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN coupons c ON o.coupon_id = c.id
     WHERE c.code = ?
     ORDER BY o.created_at DESC`,
    [code]
  );

  return rows;
}
getCouponUsage: async (code) => {
  const res = await api.get(`/admin/coupon-usage/${code}`);
  return res.data;
},

module.exports = {
  getAllUsers,
  disableUser,
  enableUser,
  getDashboardStats,
  getLowStockProducts,
  getSalesAnalytics,
  getUserActivity,
  getSystemHealth,
  getGlobalCommission,
  updateGlobalCommission,
  getCommissionRequests,
  actionCommissionRequest,
  getProfileUpdateRequests,
  actionProfileUpdateRequest,
  getAllOrders,
  getAllCoupons,
createCoupon,
toggleCouponStatus,
getCouponUsageDetails
};