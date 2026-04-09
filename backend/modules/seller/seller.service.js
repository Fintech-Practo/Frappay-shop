const sellerRepository = require("./seller.repository");
const productModel = require("../product/product.model");
const orderModel = require("../order/order.model");
const pool = require("../../config/db");
const CONSTANTS = require("./seller.constants");

async function getDashboard(sellerId) {
  // Verify user is a seller
  const [users] = await pool.query(
    `SELECT role FROM users WHERE id = ?`,
    [sellerId]
  );

  if (users.length === 0 || users[0].role !== "SELLER") {
    throw new Error("Access denied. Seller account required");
  }

  // Get seller profile info
  const [sellerInfo] = await pool.query(
    `SELECT * FROM seller_info WHERE user_id = ?`,
    [sellerId]
  );

  // Get and sync analytics
  const analytics = await sellerRepository.recalculateAnalytics(sellerId);

  // Get low stock products
  const lowStockProducts = await sellerRepository.getLowStockProducts(sellerId);

  // Calculate pending shipments
  const [pendingOrders] = await pool.query(
    `SELECT COUNT(DISTINCT o.id) as count
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE (oi.seller_id = ? OR (oi.seller_id IS NULL AND p.seller_id = ?))
       AND o.status IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'pending', 'confirmed', 'shipped')`,
    [sellerId, sellerId]
  );

  await sellerRepository.updatePendingShipments(sellerId, pendingOrders[0].count || 0);

  // Update top selling product
  await sellerRepository.updateTopSellingProduct(sellerId);


  // Get updated analytics
  const updatedAnalytics = await sellerRepository.getAnalytics(sellerId);

  // Get latest profile update request
  const [updateRequests] = await pool.query(
    `SELECT * FROM seller_profile_update_requests 
     WHERE seller_id = ? AND status IN ('PENDING', 'REJECTED')
     ORDER BY created_at DESC LIMIT 1`,
    [sellerId]
  );

  // Get seller warehouse data
  const [warehouseData] = await pool.query(
    `SELECT * FROM seller_warehouses WHERE seller_id = ?`,
    [sellerId]
  );

  // Get Payout Analytics
  const [[{ pending_payout_amount }]] = await pool.query(
    `SELECT IFNULL(SUM(amount), 0) as pending_payout_amount FROM payouts WHERE seller_id = ? AND status = 'pending'`,
    [sellerId]
  );
  const [[{ settled_payout_amount }]] = await pool.query(
    `SELECT IFNULL(SUM(amount), 0) as settled_payout_amount FROM payouts WHERE seller_id = ? AND status = 'settled'`,
    [sellerId]
  );

  return {
    analytics: updatedAnalytics,
    low_stock_products: lowStockProducts,
    pending_shipments: pendingOrders[0].count || 0,
    payouts: {
      pending: pending_payout_amount,
      settled: settled_payout_amount
    },
    seller_profile: (sellerInfo && sellerInfo.length > 0) ? sellerInfo[0] : {},
    seller_warehouses: warehouseData || [],
    latest_update_request: (updateRequests && updateRequests.length > 0) ? updateRequests[0] : null
  };
}

// Update seller profile
async function updateProfile(sellerId, data) {
  const [users] = await pool.query(
    `SELECT role FROM users WHERE id = ?`,
    [sellerId]
  );

  if (users.length === 0 || users[0].role !== "SELLER") {
    throw new Error("Access denied. Seller account required");
  }

  const {
    business_name,
    business_location,
    warehouse_name,
    warehouse_phone,
    warehouse_address,
    warehouse_city,
    warehouse_state,
    warehouse_pincode,
    warehouse_email,
    return_address,
    return_pincode,
    return_city,
    return_state
  } = data;

  const profileFields = [
    'business_name', 'business_location',
    'bank_name', 'bank_account_number', 'bank_ifsc',
    'warehouse_name', 'warehouse_phone', 'warehouse_address', 'warehouse_state',
    'warehouse_city', 'warehouse_pincode', 'warehouse_email',
    'return_address', 'return_pincode', 'return_city', 'return_state'
  ];

  const profileData = {};
  profileFields.forEach(field => {
    if (data[field] !== undefined) {
      profileData[field] = data[field];
    }
  });

  if (Object.keys(profileData).length > 0) {
    // Check if there is already a PENDING request
    const [existing] = await pool.query(
      `SELECT id FROM seller_profile_update_requests WHERE seller_id = ? AND status = 'PENDING'`,
      [sellerId]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE seller_profile_update_requests SET data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify(profileData), existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO seller_profile_update_requests (seller_id, data_json, status) VALUES (?, ?, 'PENDING')`,
        [sellerId, JSON.stringify(profileData)]
      );
    }
  }


  const [updatedUser] = await pool.query(
    `SELECT id, name, email, phone, gender, DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth, role, is_active, profile_image_url, location, preferences, created_at, updated_at 
     FROM users WHERE id = ?`,
    [sellerId]
  );

  return updatedUser[0];
}

async function getSalesAnalytics(sellerId, filters = {}) {
  // Verify user is a seller
  const [users] = await pool.query(
    `SELECT role FROM users WHERE id = ?`,
    [sellerId]
  );

  if (users.length === 0 || users[0].role !== "SELLER") {
    throw new Error("Access denied. Seller account required");
  }

  const startDate = filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = filters.end_date || new Date().toISOString().split('T')[0];

  const salesData = await sellerRepository.getSalesByDateRange(sellerId, startDate, endDate);
  const analytics = await sellerRepository.getAnalytics(sellerId);

  return {
    sales_data: salesData,
    summary: analytics,
    date_range: {
      start_date: startDate,
      end_date: endDate
    }
  };
}

async function getMyProducts(sellerId, filters = {}) {
  // Verify user is a seller
  const [users] = await pool.query(
    `SELECT role FROM users WHERE id = ?`,
    [sellerId]
  );

  if (users.length === 0 || users[0].role !== "SELLER") {
    throw new Error("Access denied. Seller account required");
  }

  return await productModel.findAll({ seller_id: sellerId, ...filters });
}

async function getMyOrders(sellerId, filters = {}) {
  // Verify user is a seller
  const [users] = await pool.query(
    `SELECT role FROM users WHERE id = ?`,
    [sellerId]
  );

  if (users.length === 0 || users[0].role !== "SELLER") {
    throw new Error("Access denied. Seller account required");
  }

  // Get orders that contain seller's products
  let query = `SELECT DISTINCT o.id, o.user_id, o.status, o.total_payable_amount, o.created_at, u.name as customer_name
               FROM orders o
               JOIN users u ON o.user_id = u.id
               JOIN order_items oi ON o.id = oi.order_id
               LEFT JOIN products p ON oi.product_id = p.id
               WHERE (oi.seller_id = ? OR (oi.seller_id IS NULL AND p.seller_id = ?))`;

  const params = [sellerId, sellerId];

  if (filters.status) {
    query += ` AND (o.status = ? OR o.status = ?)`;
    params.push(filters.status.toUpperCase(), filters.status.toLowerCase());
  }

  query += ` ORDER BY o.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT ?`;
    params.push(parseInt(filters.limit));

    if (filters.offset) {
      query += ` OFFSET ?`;
      params.push(parseInt(filters.offset));
    }
  }

  const [rows] = await pool.query(query, params);

  // Return simplified order objects to avoid complexity
  return rows.map(row => ({
    id: row.id,
    customer_name: row.customer_name,
    user_name: row.customer_name,
    user: { name: row.customer_name },
    status: row.status,
    total_amount: row.total_payable_amount,
    created_at: row.created_at
  }));
}

// This function should be called when a product is added by seller
async function onProductAdded(sellerId) {
  await sellerRepository.incrementProductsAdded(sellerId);
}

// This function should be called when an order is delivered
async function onOrderDelivered(orderId, sellerId) {
  // Get order items for this seller
  const [items] = await pool.query(
    `SELECT oi.*
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ? AND p.seller_id = ?`,
    [orderId, sellerId]
  );

  if (items.length === 0) return;

  // Calculate metrics
  let totalItems = 0;
  let grossRevenue = 0;
  let totalCost = 0;

  for (const item of items) {
    totalItems += item.quantity;
    grossRevenue += item.price * item.quantity;
    // totalCost += (item.cost_price || 0) * item.quantity; // cost_price not available
  }

  // Update analytics
  await sellerRepository.updateOrderMetrics(sellerId, {
    order_id: orderId,
    order_item_id: items[0].id,
    totalItems,
    grossRevenue,
    totalCost
  });

  // Update top selling product
  await sellerRepository.updateTopSellingProduct(sellerId);
}

// This function should be called when an order is cancelled
async function onOrderCancelled(orderId, sellerId) {
  await sellerRepository.incrementCancelledOrders(sellerId);
}

// Get admin revenue (for admin only)
async function getAdminRevenue(userRole) {
  if (userRole !== "ADMIN") {
    throw new Error("Access denied. Admin only");
  }

  return await sellerRepository.getTotalAdminRevenue();
}

// Request profile update (Admin approval required)
async function requestProfileUpdate(sellerId, data) {
  // Verify user is a seller
  const [users] = await pool.query(
    `SELECT role FROM users WHERE id = ?`,
    [sellerId]
  );

  if (users.length === 0 || users[0].role !== "SELLER") {
    throw new Error("Access denied. Seller account required");
  }

  const {
    business_name,
    business_location,
    bank_name,
    bank_account_number,
    bank_ifsc
  } = data;

  // Filter only relevant fields
  const requestData = {};
  if (business_name !== undefined) requestData.business_name = business_name;
  if (business_location !== undefined) requestData.business_location = business_location;
  if (bank_name !== undefined) requestData.bank_name = bank_name;
  if (bank_account_number !== undefined) requestData.bank_account_number = bank_account_number;
  if (bank_ifsc !== undefined) requestData.bank_ifsc = bank_ifsc;

  if (Object.keys(requestData).length === 0) {
    throw new Error("No update data provided");
  }

  // Insert request into seller_profile_update_requests
  await pool.query(
    `INSERT INTO seller_profile_update_requests (
      seller_id, data_json, status
    ) VALUES (?, ?, 'PENDING')`,
    [sellerId, JSON.stringify(requestData)]
  );

  return { success: true, message: "Profile update requested. Pending admin approval." };
}

// Request commission change
async function requestCommissionChange(sellerId, requestedPercentage) {
  // Verify user is a seller
  const [users] = await pool.query(
    `SELECT role FROM users WHERE id = ?`,
    [sellerId]
  );

  if (users.length === 0 || users[0].role !== "SELLER") {
    throw new Error("Access denied. Seller account required");
  }

  if (isNaN(requestedPercentage) || requestedPercentage < 0 || requestedPercentage > 100) {
    throw new Error("Invalid percentage");
  }

  // Insert request
  await pool.query(
    `INSERT INTO seller_commission_requests (
      seller_id, requested_percentage, status
    ) VALUES (?, ?, 'PENDING')`,
    [sellerId, requestedPercentage]
  );

  return { success: true, message: "Commission change requested. Pending admin approval." };
}

async function addSellerWarehouse(sellerId, data) {
  const {
    warehouse_name,
    address,
    city,
    state,
    pincode,
    phone,
    email,
    return_address,
    return_city,
    return_state,
    return_pincode
  } = data;

  const finalWarehouseName = warehouse_name || `primary_seller_${sellerId}`;

  const [existing] = await pool.query(
    `SELECT id FROM seller_warehouses WHERE seller_id = ?`,
    [sellerId]
  );

  if (existing.length > 0) {
    throw new Error("Only one warehouse is allowed. Please edit the existing warehouse.");
  }
  //  INSERT NEW WAREHOUSE
  const [result] = await pool.query(
    `INSERT INTO seller_warehouses
     (seller_id, warehouse_name, pickup_location_name, address, city, state, pincode, phone, email, 
      return_address, return_city, return_state, return_pincode, warehouse_created)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
    [
      sellerId, 
      finalWarehouseName, 
      finalWarehouseName, 
      address, 
      city, 
      state, 
      pincode, 
      phone, 
      email,
      return_address || address,
      return_city || city,
      return_state || state || city,
      return_pincode || pincode
    ]
  );

  const warehouseId = result.insertId;

  //  SYNC WITH DELHIVERY
  try {
    const delhiveryService = require("../logistics/delhivery.service");

    await delhiveryService.createClientWarehouse({
      warehouse_name: finalWarehouseName,
      pickup_location_name: finalWarehouseName,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      return_address: return_address || address,
      return_city: return_city || city,
      return_state: return_state || state || city,
      return_pincode: return_pincode || pincode
    });

    //  Mark as synced
    await pool.query(
      `UPDATE seller_warehouses SET warehouse_created = TRUE WHERE id = ?`,
      [warehouseId]
    );

    return {
      message: "Warehouse created and synced successfully."
    };

  } catch (syncError) {
    console.error(
      `Warehouse sync failed for seller ${sellerId}: ${syncError.message}`
    );

    //  Warehouse created but sync failed
    return {
      message: "Warehouse created but Delhivery sync failed.",
      warning: syncError.message
    };
  }
}

async function getSellerWarehouses(sellerId) {
  const [rows] = await pool.query(
    `SELECT * FROM seller_warehouses WHERE seller_id = ? ORDER BY created_at DESC`,
    [sellerId]
  );
  return rows;
}

async function getProfileRequests(sellerId) {
  // Get profile update requests for this seller
  const [rows] = await pool.query(
    `SELECT * FROM profile_update_requests WHERE user_id = ? ORDER BY created_at DESC`,
    [sellerId]
  );

  return rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    request_type: row.request_type || 'PROFILE_UPDATE',
    data_json: row.data_json,
    status: row.status,
    admin_remarks: row.admin_remarks,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

module.exports = {
  getDashboard,
  getSalesAnalytics,
  getMyProducts,
  getMyOrders,
  onProductAdded,
  onOrderDelivered,
  onOrderCancelled,
  getAdminRevenue,
  updateProfile,
  addSellerWarehouse,
  getSellerWarehouses,
  getProfileRequests
};