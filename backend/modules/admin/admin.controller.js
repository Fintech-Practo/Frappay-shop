const adminService = require("./admin.service");
const sellerDetailsService = require("./sellerDetails.service");
const userDetails = require("./userDetails.service");
const orderDetails = require("./orderDetails.service");
const inventoryDetails = require("./inventoryDetails.service");
const auditService = require("../audit/audit.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const db = require("../../config/db"); // Added db
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const { adminActionSchema, getStatsSchema } = require("./admin.schema");

// Get all users with pagination and filters
async function listUsers(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    // Calculate offset if page is provided
    if (value.page && !value.offset) {
      value.offset = (value.page - 1) * value.limit;
    }

    const users = await adminService.getAllUsers(value);
    return response.success(res, users, "Users fetched successfully");
  } catch (err) {
    logger.error("List users failed", {
      query: req.query,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch users", 500);
  }
}

// Get all orders with pagination and filters
async function listOrders(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    if (value.page && !value.offset) {
      value.offset = (value.page - 1) * value.limit;
    }

    const data = await adminService.getAllOrders(value);
    return response.success(res, data, "Orders fetched successfully");
  } catch (err) {
    logger.error("List orders failed", {
      query: req.query,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch orders", 500);
  }
}

// Block/disable user account
async function blockUser(req, res) {
  try {
    const { error } = adminActionSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { reason } = req.body;
    const user = await adminService.disableUser(req.params.id, reason, req.user.userId);

    // Log audit
    const auditService = require("../audit/audit.service");
    await auditService.logAction({
      req,
      action: "BLOCK_USER",
      module: "USER",
      entityType: "USER",
      entityId: req.params.id,
      newValues: { reason }
    });

    return response.success(res, user, "User disabled successfully");
  } catch (err) {
    logger.error("Block user failed", {
      userId: req.params.id,
      adminId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to disable user", 500);
  }
}

// Unblock/enable user account
async function unblockUser(req, res) {
  try {
    const { error } = adminActionSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { reason } = req.body;
    const user = await adminService.enableUser(req.params.id, reason, req.user.userId);

    // Log audit
    const auditService = require("../audit/audit.service");
    await auditService.logAction({
      req,
      action: "UNBLOCK_USER",
      module: "USER",
      entityType: "USER",
      entityId: req.params.id,
      newValues: { reason }
    });

    return response.success(res, user, "User enabled successfully");
  } catch (err) {
    logger.error("Unblock user failed", {
      userId: req.params.id,
      adminId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Unable to enable user", 500);
  }
}

// Get comprehensive dashboard statistics
async function getDashboardStats(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const range = value.range || '6m';
    const stats = await adminService.getDashboardStats(range);
    return response.success(res, stats, "Dashboard stats fetched successfully");
  } catch (err) {
    logger.error("Get dashboard stats failed", {
      range: req.query.range,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch dashboard stats", 500);
  }
}

// Get low stock products for inventory management
async function getLowStockProducts(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    // Calculate offset if page is provided
    if (value.page && !value.offset) {
      value.offset = (value.page - 1) * value.limit;
    }

    const data = await adminService.getLowStockProducts(value);
    return response.success(res, data, "Low stock products fetched successfully");
  } catch (err) {
    logger.error("Get low stock products failed", {
      threshold: req.query.threshold,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch low stock products", 500);
  }
}

// Get sales analytics
async function getSalesAnalytics(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const analytics = await adminService.getSalesAnalytics(value);
    return response.success(res, analytics, "Sales analytics fetched successfully");
  } catch (err) {
    logger.error("Get sales analytics failed", {
      query: req.query,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch sales analytics", 500);
  }
}

// Get user activity logs
async function getUserActivity(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const activity = await adminService.getUserActivity(value);
    return response.success(res, activity, "User activity fetched successfully");
  } catch (err) {
    logger.error("Get user activity failed", {
      query: req.query,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch user activity", 500);
  }
}

// Get system health metrics
async function getSystemHealth(req, res) {
  try {
    const health = await adminService.getSystemHealth();
    return response.success(res, health, "System health fetched successfully");
  } catch (err) {
    logger.error("Get system health failed", { error: err.message });
    return response.error(res, err.message || "Unable to fetch system health", 500);
  }
}

// Get comprehensive seller details
async function getSellerDetails(req, res) {
  try {
    const sellerId = req.params.sellerId;

    if (!sellerId || isNaN(sellerId)) {
      return response.error(res, "Valid seller ID is required", 400);
    }

    const details = await sellerDetailsService.getSellerDetails(parseInt(sellerId));
    return response.success(res, details, "Seller details fetched successfully");
  } catch (err) {
    logger.error("Get seller details failed", {
      sellerId: req.params.sellerId,
      error: err.message
    });

    if (err.message === 'Seller not found') {
      return response.error(res, "Seller not found", 404);
    }

    return response.error(res, err.message || "Unable to fetch seller details", 500);
  }
}

// Get comprehensive user details
async function getUserDetails(req, res) {
  try {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
      return response.error(res, "Valid user ID is required", 400);
    }

    const details = await userDetails.getUserDetails(parseInt(userId));
    return response.success(res, details, "User details fetched successfully");
  } catch (err) {
    logger.error("Get user details failed", {
      userId: req.params.userId,
      error: err.message
    });

    if (err.message === 'User not found') {
      return response.error(res, "User not found", 404);
    }

    return response.error(res, err.message || "Unable to fetch user details", 500);
  }
}

// Get comprehensive order details
async function getOrderDetails(req, res) {
  try {
    const orderId = req.params.orderId;

    if (!orderId || isNaN(orderId)) {
      return response.error(res, "Valid order ID is required", 400);
    }

    const details = await orderDetails.getOrderDetails(parseInt(orderId));
    return response.success(res, details, "Order details fetched successfully");
  } catch (err) {
    logger.error("Get order details failed", {
      orderId: req.params.orderId,
      error: err.message
    });

    if (err.message === 'Order not found') {
      return response.error(res, "Order not found", 404);
    }

    return response.error(res, err.message || "Unable to fetch order details", 500);
  }
}

// Get comprehensive inventory details
async function getInventoryDetails(req, res) {
  try {
    const productId = req.params.productId;

    if (!productId || isNaN(productId)) {
      return response.error(res, "Valid product ID is required", 400);
    }

    const details = await inventoryDetails.getInventoryDetails(parseInt(productId));
    return response.success(res, details, "Inventory details fetched successfully");
  } catch (err) {
    logger.error("Get inventory details failed", {
      productId: req.params.productId,
      error: err.message
    });

    if (err.message === 'Product not found') {
      return response.error(res, "Product not found", 404);
    }

    return response.error(res, err.message || "Unable to fetch inventory details", 500);
  }
}

// Get full inventory list with pagination and filters
async function getInventoryList(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    // Calculate offset if page is provided
    if (value.page && !value.offset) {
      value.offset = (value.page - 1) * value.limit;
    }

    const data = await adminService.getInventoryList(value);
    return response.success(res, data, "Inventory list fetched successfully");
  } catch (err) {
    logger.error("Get inventory list failed", {
      query: req.query,
      error: err.message
    });
    return response.error(res, err.message || "Unable to fetch inventory list", 500);
  }
}

async function getSellerWarehouseStatus(req, res) {
  try {
    const sellerId = parseInt(req.params.sellerId, 10);
    if (isNaN(sellerId)) {
      return response.error(res, 'Invalid seller ID', 400);
    }

    const [rows] = await db.query(
      `SELECT * FROM seller_warehouses WHERE seller_id = ? ORDER BY created_at DESC`,
      [sellerId]
    );

    return response.success(res, rows, 'Warehouse status fetched successfully');
  } catch (err) {
    logger.error('getSellerWarehouseStatus failed', { error: err.message });
    return response.error(res, err.message, 500);
  }
}

async function getSellerOnboardingRequests(req, res) {
  try {
    // Mock onboarding requests - replace with actual logic
    const requests = [
      {
        id: 1,
        sellerId: 15,
        sellerName: 'Test Seller',
        status: 'pending',
        requestDate: new Date().toISOString(),
        documents: []
      }
    ];

    return response.success(res, requests, 'Onboarding requests fetched successfully');
  } catch (err) {
    logger.error('getSellerOnboardingRequests failed', { error: err.message });
    return response.error(res, err.message, 500);
  }
}

async function syncSellerWarehouse(req, res) {
  try {
    const sellerId = parseInt(req.params.sellerId, 10);
    const { warehouseId } = req.body;

    if (isNaN(sellerId)) {
      return response.error(res, 'Invalid seller ID', 400);
    }

    const logisticsService = require("../logistics/logistics.service");

    // Fetch warehouse data
    let warehouseData;
    if (warehouseId) {
      const [rows] = await db.query("SELECT * FROM seller_warehouses WHERE id = ?", [warehouseId]);
      if (rows.length === 0) return response.error(res, "Warehouse not found", 404);
      warehouseData = rows[0];
    } else {
      // Fallback to most recent or primary if ID not provided
      const [rows] = await db.query("SELECT * FROM seller_warehouses WHERE seller_id = ? ORDER BY created_at DESC LIMIT 1", [sellerId]);
      if (rows.length === 0) return response.error(res, "No warehouses found for this seller", 404);
      warehouseData = rows[0];
    }

    // Call sync logic
    const syncResponse = await logisticsService.syncWarehouse(sellerId, warehouseData);

    return response.success(res, syncResponse, "Warehouse synced successfully");
  } catch (err) {
    logger.error('syncSellerWarehouse failed', { error: err.message, sellerId: req.params.sellerId });
    return response.error(res, err.message, 500);
  }
}

async function getOrderSMSLogs(req, res) {
  try {
    const orderId = req.params.orderId;
    if (!orderId || isNaN(orderId)) {
      return response.error(res, "Valid order ID is required", 400);
    }
    const logs = await adminService.getOrderSMSLogs(orderId);
    return response.success(res, logs, "Order SMS logs fetched successfully");
  } catch (err) {
    logger.error("Get order SMS logs failed", { orderId: req.params.orderId, error: err.message });
    return response.error(res, err.message, 500);
  }
}

async function exportOrderLedger(req, res) {
  try {
    const data = [
      {
        id: 1,
        created_at: new Date(),
        total_payable_amount: 100
      }
    ];

    let csv = 'Order ID,Date,Total\n';

    data.forEach(row => {
      csv += `${row.id},${row.created_at},${row.total_payable_amount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=order_ledger.csv');

    res.status(200).send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export failed' });
  }
}
async function getCouponUsageDetails(req, res) {
  try {
    const data = await adminService.getCouponUsageDetails(req.params.code);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// module.exports = {
//   syncSellerWarehouse,
//   listUsers,
//   blockUser,
//   unblockUser,
//   getDashboardStats,
//   getLowStockProducts,
//   getSalesAnalytics,
//   getUserActivity,
//   getSystemHealth,
//   getSellerDetails,
//   getUserDetails,
//   getOrderDetails,
//   getInventoryDetails,
//   getInventoryList,
//   listOrders,
//   getGlobalCommission,
//   updateGlobalCommission,
//   getCommissionRequests,
//   actionCommissionRequest,
//   getProfileUpdateRequests,
//   actionProfileUpdateRequest,
//   getMaintenanceMode,
//   updateMaintenanceMode,
//   getNotices,
//   createNotice,
//   updateNotice,
//   deleteNotice,
//   getShippingMargins,
//   createShippingMargin,
//   deleteShippingMargin,
//   updateSellerCommission,
//   listSellers,
//   getSellerWarehouseStatus,
//   getSellerOnboardingRequests,
//   getOrderSMSLogs,
//   exportOrderLedger,
//   getCouponUsageDetails,
// };

// --- New Controller Methods ---

async function getGlobalCommission(req, res) {
  try {
    const data = await adminService.getGlobalCommission();
    return response.success(res, data, "Fetched global commission");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function updateGlobalCommission(req, res) {
  try {
    const { percentage } = req.body;
    if (percentage === undefined || isNaN(percentage)) {
      return response.error(res, "Valid percentage is required", 400);
    }
    await adminService.updateGlobalCommission(parseFloat(percentage));

    // Audit Log
    await auditService.logAction({
      req,
      action: 'UPDATE_GLOBAL_COMMISSION',
      module: 'SYSTEM',
      entityType: 'COMMISSION',
      entityId: 1, // Global
      newValues: { percentage }
    });

    return response.success(res, null, "Global commission updated");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getCommissionRequests(req, res) {
  try {
    const status = req.query.status || 'PENDING';
    const data = await adminService.getCommissionRequests(status);
    return response.success(res, data, "Fetched commission requests");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function actionCommissionRequest(req, res) {
  try {
    const { action, remarks } = req.body; // action: APPROVE or REJECT
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return response.error(res, "Invalid action", 400);
    }
    await adminService.actionCommissionRequest(req.params.requestId, action, remarks, req.user.userId);

    // Audit Log
    await auditService.logAction({
      req,
      action: `${action}_COMMISSION_REQUEST`,
      module: 'SELLER',
      entityType: 'COMMISSION_REQUEST',
      entityId: parseInt(req.params.requestId),
      newValues: { action, remarks }
    });

    return response.success(res, null, `Request ${action}ED successfully`);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getProfileUpdateRequests(req, res) {
  try {
    const status = req.query.status || 'PENDING';
    const data = await adminService.getProfileUpdateRequests(status);
    return response.success(res, data, "Fetched profile update requests");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function actionProfileUpdateRequest(req, res) {
  try {
    const { action, remarks } = req.body;
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return response.error(res, "Invalid action", 400);
    }
    await adminService.actionProfileUpdateRequest(req.params.requestId, action, remarks, req.user.userId);

    // Audit Log
    await auditService.logAction({
      req,
      action: `${action}_PROFILE_UPDATE`,
      module: 'SELLER',
      entityType: 'PROFILE_UPDATE_REQUEST',
      entityId: parseInt(req.params.requestId),
      newValues: { action, remarks }
    });

    return response.success(res, null, `Request ${action}ED successfully`);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getMaintenanceMode(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT setting_value FROM site_settings WHERE group_name = 'system' AND setting_key = 'maintenance_mode'`
    );
    let data = { enabled: false, message: "Platform under maintenance" };
    if (rows.length > 0) {
      data = JSON.parse(rows[0].setting_value);
    }
    return response.success(res, data, "Fetched maintenance mode");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function updateMaintenanceMode(req, res) {
  try {
    const { enabled, message } = req.body;
    const value = JSON.stringify({ enabled: !!enabled, message: message || "Platform under maintenance" });

    await db.query(
      `UPDATE site_settings SET setting_value = ? WHERE group_name = 'system' AND setting_key = 'maintenance_mode'`,
      [value]
    );
    return response.success(res, { enabled, message }, "Updated maintenance mode");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getNotices(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT setting_value FROM site_settings WHERE group_name = 'notices' AND setting_key = 'header_notices'`
    );
    let data = [];
    if (rows.length > 0) {
      data = JSON.parse(rows[0].setting_value);
    }
    return response.success(res, data, "Fetched notices");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function createNotice(req, res) {
  try {
    const { message, link, is_active } = req.body;
    const [rows] = await db.query(
      `SELECT setting_value FROM site_settings WHERE group_name = 'notices' AND setting_key = 'header_notices'`
    );
    let notices = [];
    if (rows.length > 0) {
      notices = JSON.parse(rows[0].setting_value);
    }

    const newNotice = {
      id: Date.now().toString(),
      message,
      link: link || null,
      is_active: is_active !== undefined ? is_active : true
    };

    notices.push(newNotice);

    await db.query(
      `UPDATE site_settings SET setting_value = ? WHERE group_name = 'notices' AND setting_key = 'header_notices'`,
      [JSON.stringify(notices)]
    );

    return response.success(res, newNotice, "Created notice", 201);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function updateNotice(req, res) {
  try {
    const { id } = req.params;
    const { message, link, is_active } = req.body;

    const [rows] = await db.query(
      `SELECT setting_value FROM site_settings WHERE group_name = 'notices' AND setting_key = 'header_notices'`
    );
    let notices = [];
    if (rows.length > 0) {
      notices = JSON.parse(rows[0].setting_value);
    }

    const noticeIndex = notices.findIndex(n => n.id === id);
    if (noticeIndex === -1) {
      return response.error(res, "Notice not found", 404);
    }

    notices[noticeIndex] = {
      ...notices[noticeIndex],
      ...(message !== undefined && { message }),
      ...(link !== undefined && { link }),
      ...(is_active !== undefined && { is_active })
    };

    await db.query(
      `UPDATE site_settings SET setting_value = ? WHERE group_name = 'notices' AND setting_key = 'header_notices'`,
      [JSON.stringify(notices)]
    );

    return response.success(res, notices[noticeIndex], "Updated notice");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function deleteNotice(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT setting_value FROM site_settings WHERE group_name = 'notices' AND setting_key = 'header_notices'`
    );
    let notices = [];
    if (rows.length > 0) {
      notices = JSON.parse(rows[0].setting_value);
    }

    const filteredNotices = notices.filter(n => n.id !== id);

    if (filteredNotices.length === notices.length) {
      return response.error(res, "Notice not found", 404);
    }

    await db.query(
      `UPDATE site_settings SET setting_value = ? WHERE group_name = 'notices' AND setting_key = 'header_notices'`,
      [JSON.stringify(filteredNotices)]
    );

    return response.success(res, null, "Deleted notice");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getShippingMargins(req, res) {
  try {
    const [rows] = await db.query("SELECT * FROM shipping_margin_rules ORDER BY min_order_amount ASC");
    return response.success(res, rows, "Fetched shipping margins");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function createShippingMargin(req, res) {
  try {
    const { min_order_amount, max_order_amount, margin_amount, margin_type } = req.body;

    // validate
    if (min_order_amount === undefined || max_order_amount === undefined || margin_amount === undefined) {
      return response.error(res, "Missing required margin fields", 400);
    }

    await db.query(
      `INSERT INTO shipping_margin_rules 
       (min_order_amount, max_order_amount, margin_amount, margin_type)
       VALUES (?, ?, ?, ?)`,
      [min_order_amount, max_order_amount, margin_amount, margin_type || 'flat']
    );

    return response.success(res, null, "Rule added successfully");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function deleteShippingMargin(req, res) {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM shipping_margin_rules WHERE id = ?", [id]);
    return response.success(res, null, "Deleted rule");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

/**
 * GET /api/admin/sellers
 * Return all active sellers with their current commission rates.
 */
async function listSellers(req, res) {
  try {
    const { error, value } = getStatsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    if (value.page && !value.offset) {
      value.offset = (value.page - 1) * value.limit;
    }

    const { limit, offset } = value;

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email,
              so.business_name, so.requested_commission_rate,
              COALESCE(sa.admin_commission_percentage, 10.00) AS commission_rate
       FROM users u
       LEFT JOIN seller_info so ON so.user_id = u.id
       LEFT JOIN seller_analytics sa  ON sa.seller_id = u.id
       WHERE u.role = 'SELLER'
       ORDER BY u.name ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM users WHERE role = 'SELLER'`);
    const total = countRows[0].total;

    return response.success(res, { sellers: rows, total }, 'Sellers fetched successfully');
  } catch (err) {
    logger.error('listSellers failed', { error: err.message });
    return response.error(res, err.message, 500);
  }
}

/**
 * PATCH /api/admin/sellers/:sellerId/commission
 * Inline update of a seller's commission rate.
 * Validates: 0 <= commission_rate <= 100
 */
async function updateSellerCommission(req, res) {
  try {
    const sellerId = parseInt(req.params.sellerId, 10);
    const rate = parseFloat(req.body.commission_rate);

    if (isNaN(sellerId) || isNaN(rate)) {
      return response.error(res, 'sellerId and commission_rate are required', 400);
    }
    if (rate < 0 || rate > 100) {
      return response.error(res, 'Commission rate must be between 0 and 100', 400);
    }

    // Upsert seller_analytics record
    await db.query(
      `INSERT INTO seller_analytics (seller_id, admin_commission_percentage, low_stock_threshold)
       VALUES (?, ?, 10)
       ON DUPLICATE KEY UPDATE admin_commission_percentage = ?`,
      [sellerId, rate, rate]
    );

    // Audit log
    await auditService.logAction({
      req,
      action: 'UPDATE_SELLER_COMMISSION',
      module: 'SELLER',
      entityType: 'SELLER',
      entityId: sellerId,
      newValues: { commission_rate: rate }
    });

    logger.info('[Admin] Seller commission updated', { sellerId, rate, byAdmin: req.user.userId });
    return response.success(res, { sellerId, commission_rate: rate }, 'Commission rate updated');
  } catch (err) {
    logger.error('updateSellerCommission failed', { error: err.message });
    return response.error(res, err.message, 500);
  }
}

async function exportOrderLedger(req, res) {
  try {
    const data = [
      {
        id: 1,
        created_at: new Date(),
        total_payable_amount: 100
      }
    ];

    let csv = 'Order ID,Date,Total\n';

    data.forEach(row => {
      csv += `${row.id},${row.created_at},${row.total_payable_amount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=order_ledger.csv');

    res.status(200).send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export failed' });
  }
}
module.exports = {
  syncSellerWarehouse,
  listUsers,
  listOrders,
  blockUser,
  unblockUser,
  getDashboardStats,
  getLowStockProducts,
  getSalesAnalytics,
  getUserActivity,
  getSystemHealth,
  getSellerDetails,
  getUserDetails,
  getOrderDetails,
  getInventoryDetails,
  getInventoryList,
  getSellerWarehouseStatus,
  getSellerOnboardingRequests,
  getOrderSMSLogs,
  exportOrderLedger,
  getCouponUsageDetails,

  // commission + admin tools
  getGlobalCommission,
  updateGlobalCommission,
  getCommissionRequests,
  actionCommissionRequest,
  getProfileUpdateRequests,
  actionProfileUpdateRequest,

  // system
  getMaintenanceMode,
  updateMaintenanceMode,
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,

  // shipping
  getShippingMargins,
  createShippingMargin,
  deleteShippingMargin,

  // seller
  listSellers,
  updateSellerCommission,
};