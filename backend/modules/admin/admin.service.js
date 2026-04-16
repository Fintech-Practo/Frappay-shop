const userModel = require("../user/user.model");
const orderModel = require("../order/order.model");
const auditService = require("../audit/audit.service");
const notificationService = require("../notification/notification.service");
const pool = require("../../config/db");

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
  const orderModelForAnalytics = require("../order/order.model");
  return orderModelForAnalytics.getSalesAnalytics(filters);
}

async function getUserActivity(filters = {}) {
  return userModel.getUserActivity(filters);
}

async function getSystemHealth() {
  try {
    await pool.query('SELECT 1');
    return { status: 'healthy', database: 'connected' };
  } catch (error) {
    return { status: 'unhealthy', database: 'disconnected', error: error.message };
  }
}

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

    if (rows.length === 0) throw new Error("Request not found");
    const request = rows[0];

    if (request.status !== 'PENDING') throw new Error("Request is not pending");

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await connection.query(
      "UPDATE seller_commission_requests SET status = ?, admin_remarks = ? WHERE id = ?",
      [newStatus, adminRemarks, requestId]
    );

    if (newStatus === 'APPROVED') {
      await connection.query(
        "UPDATE seller_analytics SET admin_commission_percentage = ? WHERE seller_id = ?",
        [request.requested_percentage, request.seller_id]
      );
    }

    await connection.commit();

    // Notify & Audit
    try {
      await notificationService.sendNotification(
        request.seller_id,
        'SYSTEM',
        'Commission Request Update',
        `Your commission change request has been ${newStatus.toLowerCase()}. ${adminRemarks ? 'Remarks: ' + adminRemarks : ''}`,
        'COMMISSION_REQUEST',
        requestId
      );

      await auditService.logAction({
        action: `${action}_COMMISSION_REQUEST`,
        module: 'SELLER',
        entityType: 'COMMISSION_REQUEST',
        entityId: parseInt(requestId),
        performedBy: adminId,
        newValues: { action, remarks: adminRemarks }
      });
    } catch (err) {
      console.error("Post-action logging failed:", err.message);
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
  let warehouseSyncContext = null;
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM seller_profile_update_requests WHERE id = ?",
      [requestId]
    );

    if (rows.length === 0) throw new Error("Request not found");
    const request = rows[0];

    if (request.status !== 'PENDING') throw new Error("Request is not pending");

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await connection.query(
      "UPDATE seller_profile_update_requests SET status = ?, admin_remarks = ? WHERE id = ?",
      [newStatus, adminRemarks, requestId]
    );

    if (newStatus === 'APPROVED') {
      const data = typeof request.data_json === 'string' ? JSON.parse(request.data_json) : request.data_json;

      // 1. Update seller_info table
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
        const [existing] = await connection.query("SELECT id FROM seller_info WHERE user_id = ?", [request.seller_id]);

        if (existing.length === 0) {
          const columns = ['user_id', ...sellerInfoUpdates.map(u => u.split(' = ')[0]), 'approval_status'];
          const placeholders = columns.map(() => '?').join(', ');
          const values = [request.seller_id, ...sellerInfoValues, 'APPROVED'];
          await connection.query(`INSERT INTO seller_info (${columns.join(', ')}) VALUES (${placeholders})`, values);
        } else {
          sellerInfoValues.push(request.seller_id);
          await connection.query(`UPDATE seller_info SET ${sellerInfoUpdates.join(', ')} WHERE user_id = ?`, sellerInfoValues);
        }
      }

      // 2. Update seller_warehouses
      const warehouseMapping = {
        'warehouse_name': 'warehouse_name',
        'warehouse_phone': 'phone',
        'warehouse_address': 'address',
        'warehouse_state': 'state',
        'warehouse_city': 'city',
        'warehouse_pin': 'pincode',
        'warehouse_country': 'country',
        'warehouse_email': 'email'
      };

      const warehouseUpdates = [];
      const warehouseValues = [];

      for (const [apiKey, dbKey] of Object.entries(warehouseMapping)) {
        if (data[apiKey] !== undefined && data[apiKey] !== '') {
          warehouseUpdates.push(`${dbKey} = ?`);
          warehouseValues.push(data[apiKey]);
        }
      }

      if (data.warehouse_name !== undefined && data.warehouse_name !== '') {
        warehouseUpdates.push('pickup_location_name = ?');
        warehouseValues.push(data.warehouse_name);
      }

      if (warehouseUpdates.length > 0) {
        const [existingWarehouse] = await connection.query("SELECT id FROM seller_warehouses WHERE seller_id = ?", [request.seller_id]);

        if (existingWarehouse.length === 0) {
          const columns = ['seller_id', ...warehouseUpdates.map(u => u.split(' = ')[0])];
          const placeholders = columns.map(() => '?').join(', ');
          const values = [request.seller_id, ...warehouseValues];
          await connection.query(`INSERT INTO seller_warehouses (${columns.join(', ')}) VALUES (${placeholders})`, values);
          warehouseSyncContext = { sellerId: request.seller_id, type: 'create' };
        } else {
          warehouseValues.push(request.seller_id);
          await connection.query(`UPDATE seller_warehouses SET ${warehouseUpdates.join(', ')} WHERE seller_id = ?`, warehouseValues);
          warehouseSyncContext = { sellerId: request.seller_id, type: 'edit' };
        }
      }
    }

    await connection.commit();
    if (newStatus === 'APPROVED' && warehouseSyncContext) {
      try {
        const logisticsService = require("../logistics/logistics.service");
        const [warehouseRows] = await pool.query(
          "SELECT * FROM seller_warehouses WHERE seller_id = ? ORDER BY created_at DESC LIMIT 1",
          [warehouseSyncContext.sellerId]
        );

        if (warehouseRows.length > 0) {
          const warehouse = warehouseRows[0];
          const syncType = warehouse.warehouse_created ? 'edit' : warehouseSyncContext.type;
          await logisticsService.syncWarehouse(warehouseSyncContext.sellerId, warehouse, syncType);
        }
      } catch (syncErr) {
        console.error("Warehouse sync after profile update approval failed:", syncErr.message);
      }
    }


    try {
      await notificationService.sendNotification(
        request.seller_id,
        'SYSTEM',
        'Profile Update Request',
        `Your profile update request has been ${newStatus.toLowerCase()}.`,
        'PROFILE_UPDATE_REQUEST',
        requestId
      );

      await auditService.logAction({
        action: `${action}_PROFILE_UPDATE`,
        module: 'SELLER',
        entityType: 'PROFILE_UPDATE_REQUEST',
        entityId: parseInt(requestId),
        performedBy: adminId,
        newValues: { action, remarks: adminRemarks }
      });
    } catch (e) { console.error("Logging error", e.message); }

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
    code, description, discount_type, discount_value, min_order_value,
    max_discount, expiry_date, usage_limit, per_user_limit, start_date, is_welcome
  } = data;

  await pool.query(
    `INSERT INTO coupons 
    (code, description, discount_type, discount_value, min_order_value, max_discount, expiry_date, usage_limit, per_user_limit, start_date, is_welcome)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, description, discount_type, discount_value, min_order_value, max_discount, expiry_date, usage_limit, per_user_limit, start_date, is_welcome]
  );
  return { success: true };
}

async function toggleCouponStatus(id) {
  await pool.query("UPDATE coupons SET is_active = NOT is_active WHERE id = ?", [id]);
  return { success: true };
}

async function getAllCoupons() {
  const [rows] = await pool.query("SELECT * FROM coupons ORDER BY created_at DESC");
  return rows;
}

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

async function getRefundLedger(page = 1, limit = 10, filters = {}) {
  const offset = (page - 1) * limit;

  let baseQuery = `FROM refunds r LEFT JOIN users u ON r.user_id = u.id WHERE 1=1`;
  const values = [];

  if (filters.status && filters.status !== 'all') {
    baseQuery += " AND r.status = ?";
    values.push(filters.status.toLowerCase());
  }

  if (filters.order_id) {
    baseQuery += " AND r.order_id LIKE ?";
    values.push(`%${filters.order_id}%`);
  }

  const dataQuery = `SELECT r.*, u.name AS user_name, u.email AS user_email ${baseQuery} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

  const [rows] = await pool.query(dataQuery, [...values, Number(limit), Number(offset)]);
  const [[{ total }]] = await pool.query(countQuery, values);

  return {
    success: true,
    data: {
      items: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  };
}

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
  getCouponUsageDetails,
  getOrderSMSLogs,
  getRefundLedger,
};