const pool = require("../../config/db");
const CONSTANTS = require("./seller.constants");

// Initialize or get seller analytics
async function findOrCreateAnalytics(sellerId, commissionRate = null) {
  const [existing] = await pool.query(
    `SELECT * FROM seller_analytics WHERE seller_id = ?`,
    [sellerId]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new analytics record
  const initialCommission = commissionRate !== null ? commissionRate : CONSTANTS.DEFAULT_ADMIN_COMMISSION_PERCENTAGE;

  const [result] = await pool.query(
    `INSERT INTO seller_analytics (
      seller_id, 
      admin_commission_percentage, 
      low_stock_threshold
    ) VALUES (?, ?, ?)`,
    [
      sellerId,
      initialCommission,
      CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD
    ]
  );

  const [analytics] = await pool.query(
    `SELECT * FROM seller_analytics WHERE id = ?`,
    [result.insertId]
  );

  return analytics[0];
}

// Get seller analytics
async function getAnalytics(sellerId) {
  const [rows] = await pool.query(
    `SELECT sa.*, 
            p.title as top_selling_product_title
     FROM seller_analytics sa
     LEFT JOIN products p ON sa.top_selling_product_id = p.id
     WHERE sa.seller_id = ?`,
    [sellerId]
  );
  return rows[0] || null;
}

// Update analytics when product is added
async function incrementProductsAdded(sellerId) {
  await pool.query(
    `UPDATE seller_analytics 
     SET total_products_added = total_products_added + 1 
     WHERE seller_id = ?`,
    [sellerId]
  );
}

// Update analytics when order is placed
async function updateOrderMetrics(sellerId, orderData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get current analytics
    const analytics = await findOrCreateAnalytics(sellerId);

    // Calculate metrics
    const { totalItems, grossRevenue, totalCost } = orderData;

    // Calculate commission
    const commissionPercentage = analytics.admin_commission_percentage || CONSTANTS.DEFAULT_ADMIN_COMMISSION_PERCENTAGE;
    const commissionAmount = (grossRevenue * commissionPercentage) / 100;
    const sellerRevenue = grossRevenue - commissionAmount;
    const netProfit = sellerRevenue - totalCost;

    // Update analytics
    await connection.query(
      `UPDATE seller_analytics 
       SET total_orders = total_orders + 1,
           total_items_sold = total_items_sold + ?,
           gross_revenue = gross_revenue + ?,
           total_cost = total_cost + ?,
           net_profit = net_profit + ?,
           total_admin_commission = total_admin_commission + ?,
           average_order_value = (gross_revenue + ?) / (total_orders + 1)
       WHERE seller_id = ?`,
      [
        totalItems,
        grossRevenue,
        totalCost,
        netProfit,
        commissionAmount,
        grossRevenue,
        sellerId
      ]
    );

    // Record admin commission
    await connection.query(
      `INSERT INTO admin_revenue (seller_id, order_id, order_item_id, commission_amount, commission_percentage)
       VALUES (?, ?, ?, ?, ?)`,
      [
        sellerId,
        orderData.order_id,
        orderData.order_item_id,
        commissionAmount,
        commissionPercentage
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Update cancelled orders
async function incrementCancelledOrders(sellerId) {
  await pool.query(
    `UPDATE seller_analytics 
     SET cancelled_orders = cancelled_orders + 1 
     WHERE seller_id = ?`,
    [sellerId]
  );
}

// Update returned items
async function incrementReturnedItems(sellerId, quantity) {
  await pool.query(
    `UPDATE seller_analytics 
     SET returned_items = returned_items + ? 
     WHERE seller_id = ?`,
    [quantity, sellerId]
  );
}

// Update pending shipments
async function updatePendingShipments(sellerId, count) {
  await pool.query(
    `UPDATE seller_analytics 
     SET pending_shipments = ? 
     WHERE seller_id = ?`,
    [count, sellerId]
  );
}

// Update top selling product
async function updateTopSellingProduct(sellerId) {
  const [rows] = await pool.query(
    `SELECT oi.product_id, SUM(oi.quantity) as total_sold
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     WHERE p.seller_id = ? AND o.status = 'DELIVERED'
     GROUP BY oi.product_id
     ORDER BY total_sold DESC
     LIMIT 1`,
    [sellerId]
  );

  if (rows.length > 0) {
    await pool.query(
      `UPDATE seller_analytics 
       SET top_selling_product_id = ? 
       WHERE seller_id = ?`,
      [rows[0].product_id, sellerId]
    );
  }
}

// Get low stock products
async function getLowStockProducts(sellerId) {
  const analytics = await findOrCreateAnalytics(sellerId);
  const threshold = analytics.low_stock_threshold || CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD;

  const [rows] = await pool.query(
    `SELECT * FROM products 
     WHERE seller_id = ? AND stock < ? AND is_active = true
     ORDER BY stock ASC`,
    [sellerId, threshold]
  );

  return rows;
}

// Get sales by date range
async function getSalesByDateRange(sellerId, startDate, endDate) {
  const [rows] = await pool.query(
    `SELECT 
      DATE(o.created_at) as sale_date,
      COUNT(DISTINCT o.id) as orders_count,
      SUM(oi.quantity) as items_sold,
      SUM(oi.price * oi.quantity) as revenue
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     JOIN products p ON oi.product_id = p.id
     WHERE p.seller_id = ? 
       AND o.status = 'DELIVERED'
       AND DATE(o.created_at) BETWEEN ? AND ?
     GROUP BY DATE(o.created_at)
     ORDER BY sale_date DESC`,
    [sellerId, startDate, endDate]
  );

  return rows;
}

// Get total admin revenue
async function getTotalAdminRevenue() {
  const [rows] = await pool.query(
    `SELECT 
      SUM(commission_amount) as total_revenue,
      COUNT(*) as total_transactions
     FROM admin_revenue`
  );
  return rows[0] || { total_revenue: 0, total_transactions: 0 };
}

// Get admin revenue by seller
async function getAdminRevenueBySeller(sellerId) {
  const [rows] = await pool.query(
    `SELECT 
      SUM(commission_amount) as total_revenue,
      COUNT(*) as total_transactions
     FROM admin_revenue
     WHERE seller_id = ?`,
    [sellerId]
  );
  return rows[0] || { total_revenue: 0, total_transactions: 0 };
}

// Recalculate seller analytics from source data
async function recalculateAnalytics(sellerId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Ensure analytics record exists
    let [analytics] = await connection.query(
      `SELECT admin_commission_percentage FROM seller_analytics WHERE seller_id = ?`,
      [sellerId]
    );

    if (analytics.length === 0) {
      await connection.query(
        `INSERT INTO seller_analytics (
          seller_id, 
          admin_commission_percentage, 
          low_stock_threshold
        ) VALUES (?, ?, ?)`,
        [
          sellerId,
          CONSTANTS.DEFAULT_ADMIN_COMMISSION_PERCENTAGE,
          CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD
        ]
      );
      analytics = [{ admin_commission_percentage: CONSTANTS.DEFAULT_ADMIN_COMMISSION_PERCENTAGE }];
    }

    const commissionPercentage = analytics[0].admin_commission_percentage || CONSTANTS.DEFAULT_ADMIN_COMMISSION_PERCENTAGE;

    // 2. Count Total Products
    const [productsCount] = await connection.query(
      `SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND is_active = true`,
      [sellerId]
    );
    const totalProducts = productsCount[0].count;

    // 3. Calculate Order Metrics
    // We include CONFIRMED, SHIPPED, DELIVERED for visible stats
    const [orderMetrics] = await connection.query(
      `SELECT
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold,
        COALESCE(SUM(oi.price * oi.quantity), 0) as gross_revenue,
        0 as total_cost
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.seller_id = ?
       AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')`,
      [sellerId]
    );

    const { total_orders, total_items_sold, gross_revenue, total_cost } = orderMetrics[0];

    // Calculate financials
    const commissionAmount = (gross_revenue * commissionPercentage) / 100;
    const netProfit = gross_revenue - commissionAmount - total_cost;
    const averageOrderValue = total_orders > 0 ? gross_revenue / total_orders : 0;

    // 4. Update seller_analytics
    await connection.query(
      `UPDATE seller_analytics
       SET
        total_products_added = ?,
        total_orders = ?,
        total_items_sold = ?,
        gross_revenue = ?,
        net_profit = ?,
        total_cost = ?,
        total_admin_commission = ?,
        average_order_value = ?
       WHERE seller_id = ?`,
      [
        totalProducts,
        total_orders,
        total_items_sold,
        gross_revenue,
        netProfit,
        total_cost,
        commissionAmount,
        averageOrderValue,
        sellerId
      ]
    );

    await connection.commit();

    // Return fresh data
    return await getAnalytics(sellerId);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  findOrCreateAnalytics,
  getAnalytics,
  incrementProductsAdded,
  updateOrderMetrics,
  incrementCancelledOrders,
  incrementReturnedItems,
  updatePendingShipments,
  updateTopSellingProduct,
  getLowStockProducts,
  getSalesByDateRange,
  getTotalAdminRevenue,
  getAdminRevenueBySeller,
  recalculateAnalytics
};

