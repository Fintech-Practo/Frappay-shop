const pool = require("../../config/db");
const logger = require("../../utils/logger");

async function getSellerDetails(sellerId) {
  const connection = await pool.getConnection();

  try {
    // 1. Seller Identity & Account Info
    const sellerInfo = await getSellerIdentity(connection, sellerId);
    if (!sellerInfo) {
      throw new Error('Seller not found');
    }

    // 2. High-Level Performance Summary
    const summary = await getPerformanceSummary(connection, sellerId);

    // 3. Revenue & Sales Breakdown
    const revenue = await getRevenueBreakdown(connection, sellerId);

    // 4. Commission & Platform Earnings
    const commissions = await getCommissionData(connection, sellerId);

    // 5. Product Intelligence
    const products = await getProductIntelligence(connection, sellerId);

    // 6. Order History
    const orders = await getOrderHistory(connection, sellerId, 50, 0);

    // 7. Financial Integrity & Risk Indicators
    const riskMetrics = await getRiskMetrics(connection, sellerId, summary, orders);

    // 8. Activity & Timeline
    const activityTimeline = await getActivityTimeline(connection, sellerId);

    return {
      seller: sellerInfo,
      summary,
      revenue,
      commissions,
      products,
      orders,
      risk_metrics: riskMetrics,
      activity_timeline: activityTimeline
    };
  } catch (error) {
    logger.error("Error fetching seller details", { sellerId, error: error.message });
    throw error;
  } finally {
    connection.release();
  }
}

async function getSellerIdentity(connection, sellerId) {
  const [rows] = await connection.execute(`
    SELECT 
      u.id as user_id,
      u.name as full_name,
      u.email,
      u.phone,
      u.role,
      u.is_active as account_status,
      u.created_at,
      u.profile_image_url,
      u.location,
      u.gender,
      u.date_of_birth,
      si.id as seller_id,
      si.business_name,
      si.business_location,
      si.bank_name,
      si.bank_account_number,
      si.bank_ifsc,
      si.pan_number,
      si.aadhaar_number,
      si.gst_number,
      si.govt_id_type,
      si.govt_id_number,
      si.govt_id_url,
      si.kyc_status,
      si.is_kyc_verified,
      si.approval_status as onboarding_status,
      si.approved_at,
      si.created_at as seller_created_at
    FROM users u
    LEFT JOIN seller_info si ON u.id = si.user_id
    WHERE u.id = ? AND u.role = 'SELLER'
  `, [sellerId]);

  if (rows.length === 0) return null;

  const seller = rows[0];

  // Get phone from addresses if exists (fallback)
  const [addressRows] = await connection.execute(`
    SELECT phone FROM addresses WHERE user_id = ? LIMIT 1
  `, [sellerId]);

  if (addressRows.length > 0 && addressRows[0].phone) {
    seller.phone = seller.phone || addressRows[0].phone;
  }
  seller.account_status = seller.account_status ? 'ACTIVE' : 'SUSPENDED';

  return seller;
}

async function getPerformanceSummary(connection, sellerId) {
  // Get from seller_analytics table
  const [analyticsRows] = await connection.execute(`
    SELECT * FROM seller_analytics WHERE seller_id = ?
  `, [sellerId]);

  if (analyticsRows.length > 0) {
    const analytics = analyticsRows[0];
    return {
      total_products_added: analytics.total_products_added || 0,
      total_orders: analytics.total_orders || 0,
      total_items_sold: analytics.total_items_sold || 0,
      gross_revenue: parseFloat(analytics.gross_revenue) || 0,
      total_admin_commission: parseFloat(analytics.total_admin_commission) || 0,
      seller_net_earnings: parseFloat(analytics.net_profit) || 0,
      average_order_value: parseFloat(analytics.average_order_value) || 0,
      cancelled_orders: analytics.cancelled_orders || 0,
      returned_items: analytics.returned_items || 0,
      pending_shipments: analytics.pending_shipments || 0,
      commission_percentage: parseFloat(analytics.admin_commission_percentage) || 10
    };
  }

  // Fallback: Calculate from raw data
  return await calculateSummaryFromRawData(connection, sellerId);
}

async function calculateSummaryFromRawData(connection, sellerId) {
  const [productCount] = await connection.execute(
    "SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND is_active = true",
    [sellerId]
  );

  const [orderStats] = await connection.execute(`
    SELECT 
      COUNT(DISTINCT o.id) as total_orders,
      SUM(oi.quantity) as total_items_sold,
      SUM(oi.price * oi.quantity) as gross_revenue,
      SUM(oi.commission_amount) as total_admin_commission,
      SUM(oi.seller_payout) as seller_net_earnings,
      AVG(o.total_payable_amount) as average_order_value,
      COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) as cancelled_orders
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ?
  `, [sellerId]);

  const stats = orderStats[0] || {};

  return {
    total_products_added: productCount[0].count || 0,
    total_orders: stats.total_orders || 0,
    total_items_sold: stats.total_items_sold || 0,
    gross_revenue: parseFloat(stats.gross_revenue) || 0,
    total_admin_commission: parseFloat(stats.total_admin_commission) || 0,
    seller_net_earnings: parseFloat(stats.seller_net_earnings) || 0,
    average_order_value: parseFloat(stats.average_order_value) || 0,
    cancelled_orders: stats.cancelled_orders || 0,
    returned_items: 0, // Not tracked separately
    pending_shipments: 0, // Would need shipment tracking
    commission_percentage: 10 // Default
  };
}

async function getRevenueBreakdown(connection, sellerId) {
  // Revenue by date (last 30 days)
  const [dailyRevenue] = await connection.execute(`
    SELECT 
      DATE(o.created_at) as date,
      SUM(oi.price * oi.quantity) as revenue,
      COUNT(DISTINCT o.id) as orders_count,
      SUM(oi.quantity) as items_sold
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ? 
      AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(o.created_at)
    ORDER BY date DESC
    LIMIT 30
  `, [sellerId]);

  // Revenue by format
  const [formatRevenue] = await connection.execute(`
    SELECT 
      oi.format,
      SUM(oi.price * oi.quantity) as revenue,
      COUNT(DISTINCT o.id) as orders_count,
      SUM(oi.quantity) as items_sold
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ?
    GROUP BY oi.format
  `, [sellerId]);

  // Revenue by product type
  const [typeRevenue] = await connection.execute(`
    SELECT 
      oi.product_type_code,
      pt.label as product_type_label,
      SUM(oi.price * oi.quantity) as revenue,
      COUNT(DISTINCT o.id) as orders_count,
      SUM(oi.quantity) as items_sold
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN product_types pt ON oi.product_type_code = pt.code
    WHERE oi.seller_id = ?
    GROUP BY oi.product_type_code, pt.label
  `, [sellerId]);

  // Top selling product
  const [topProduct] = await connection.execute(`
    SELECT 
      p.id as product_id,
      p.title as product_title,
      SUM(oi.quantity) as quantity_sold,
      SUM(oi.price * oi.quantity) as revenue_generated
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.seller_id = ?
    GROUP BY p.id, p.title
    ORDER BY quantity_sold DESC
    LIMIT 1
  `, [sellerId]);

  return {
    daily_revenue: dailyRevenue,
    revenue_by_format: formatRevenue,
    revenue_by_type: typeRevenue,
    top_selling_product: topProduct[0] || null
  };
}

async function getCommissionData(connection, sellerId) {
  // Commission per order
  const [commissionOrders] = await connection.execute(`
    SELECT 
      o.id as order_id,
      o.created_at as order_date,
      SUM(oi.commission_amount) as commission_amount,
      AVG(oi.commission_percentage) as commission_percentage,
      SUM(oi.admin_net_profit) as admin_net_profit
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ?
    GROUP BY o.id, o.created_at
    ORDER BY o.created_at DESC
    LIMIT 50
  `, [sellerId]);

  // Commission trends (last 6 months)
  const [commissionTrends] = await connection.execute(`
    SELECT 
      DATE_FORMAT(o.created_at, '%Y-%m') as month,
      SUM(oi.commission_amount) as total_commission,
      AVG(oi.commission_percentage) as avg_commission_rate,
      COUNT(DISTINCT o.id) as order_count
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ? 
      AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
    ORDER BY month DESC
  `, [sellerId]);

  // Total commission summary
  const [commissionSummary] = await connection.execute(`
    SELECT 
      SUM(oi.commission_amount) as total_commission_paid,
      AVG(oi.commission_percentage) as avg_commission_percentage,
      SUM(oi.admin_net_profit) as admin_net_profit_total
    FROM order_items oi
    WHERE oi.seller_id = ?
  `, [sellerId]);

  return {
    commission_orders: commissionOrders,
    commission_trends: commissionTrends,
    summary: commissionSummary[0] || {
      total_commission_paid: 0,
      avg_commission_percentage: 0,
      admin_net_profit_total: 0
    }
  };
}

async function getProductIntelligence(connection, sellerId) {
  // All products by seller
  const [allProducts] = await connection.execute(`
    SELECT 
      p.id as product_id,
      p.title,
      p.format,
      p.selling_price,
      p.stock,
      p.is_active as status,
      p.created_at,
      COALESCE(sales.total_sold, 0) as total_sold,
      COALESCE(sales.revenue_generated, 0) as revenue_generated
    FROM products p
    LEFT JOIN (
      SELECT 
        product_id,
        SUM(quantity) as total_sold,
        SUM(price * quantity) as revenue_generated
      FROM order_items 
      WHERE seller_id = ?
      GROUP BY product_id
    ) sales ON p.id = sales.product_id
    WHERE p.seller_id = ?
    ORDER BY p.created_at DESC
  `, [sellerId, sellerId]);

  // Get low stock threshold from seller_analytics
  const [analyticsRows] = await connection.execute(
    "SELECT low_stock_threshold FROM seller_analytics WHERE seller_id = ?",
    [sellerId]
  );
  const lowStockThreshold = analyticsRows[0]?.low_stock_threshold || 10;

  // Filter products by categories
  const lowStockProducts = allProducts.filter(p => p.stock < lowStockThreshold && p.status === 1);
  const inactiveProducts = allProducts.filter(p => p.status === 0);
  const neverSoldProducts = allProducts.filter(p => p.total_sold === 0);

  return {
    all_products: allProducts,
    low_stock_products: lowStockProducts,
    inactive_products: inactiveProducts,
    never_sold_products: neverSoldProducts,
    low_stock_threshold: lowStockThreshold
  };
}

async function getOrderHistory(connection, sellerId, limit = 50, offset = 0) {
  const [orders] = await connection.execute(`
    SELECT 
      o.id as order_id,
      u.name as customer_name,
      o.created_at as order_date,
      o.status as order_status,
      o.payment_status,
      o.order_type,
      COUNT(oi.id) as items_count,
      o.total_payable_amount as order_total,
      SUM(oi.seller_payout) as seller_payout,
      SUM(oi.commission_amount) as admin_commission
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN users u ON o.user_id = u.id
    WHERE oi.seller_id = ?
    GROUP BY o.id, u.name, o.created_at, o.status, o.payment_status, o.order_type, o.total_payable_amount
    ORDER BY o.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `, [sellerId]);

  return orders;
}

async function getRiskMetrics(connection, sellerId, summary, orders) {
  const totalOrders = summary.total_orders || 0;
  const totalItemsSold = summary.total_items_sold || 0;
  const cancelledOrders = summary.cancelled_orders || 0;
  const returnedItems = summary.returned_items || 0;

  // Calculate rates
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
  const returnRate = totalItemsSold > 0 ? (returnedItems / totalItemsSold) * 100 : 0;

  // Revenue volatility (month-over-month change)
  const [monthlyRevenue] = await connection.execute(`
    SELECT 
      DATE_FORMAT(o.created_at, '%Y-%m') as month,
      SUM(o.total_payable_amount) as revenue
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ? 
      AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
    GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
    ORDER BY month DESC
  `, [sellerId]);

  let revenueVolatility = 0;
  if (monthlyRevenue.length >= 2) {
    const current = parseFloat(monthlyRevenue[0].revenue) || 0;
    const previous = parseFloat(monthlyRevenue[1].revenue) || 0;
    revenueVolatility = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  // Risk flags
  const riskFlags = [];
  if (cancellationRate > 20) {
    riskFlags.push("High cancellation rate");
  }
  if (summary.total_products_added > 10 && totalItemsSold === 0) {
    riskFlags.push("Zero sales with many products");
  }
  if (revenueVolatility > 200) {
    riskFlags.push("Sudden revenue spikes");
  }

  return {
    cancellation_rate: parseFloat(cancellationRate.toFixed(2)),
    return_rate: parseFloat(returnRate.toFixed(2)),
    revenue_volatility: parseFloat(revenueVolatility.toFixed(2)),
    risk_flags: riskFlags,
    monthly_revenue: monthlyRevenue
  };
}

async function getActivityTimeline(connection, sellerId) {
  const timeline = [];

  // Seller onboarded
  const [sellerCreated] = await connection.execute(
    "SELECT created_at FROM users WHERE id = ?",
    [sellerId]
  );
  if (sellerCreated.length > 0) {
    timeline.push({
      event: "Seller onboarded",
      date: sellerCreated[0].created_at,
      details: "Account created"
    });
  }

  // First product added
  const [firstProduct] = await connection.execute(
    "SELECT created_at, title FROM products WHERE seller_id = ? ORDER BY created_at ASC LIMIT 1",
    [sellerId]
  );
  if (firstProduct.length > 0) {
    timeline.push({
      event: "First product added",
      date: firstProduct[0].created_at,
      details: `Product: ${firstProduct[0].title}`
    });
  }

  // First sale
  const [firstSale] = await connection.execute(`
    SELECT o.created_at, o.total_payable_amount
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ?
    ORDER BY o.created_at ASC
    LIMIT 1
  `, [sellerId]);
  if (firstSale.length > 0) {
    timeline.push({
      event: "First sale",
      date: firstSale[0].created_at,
      details: `Amount: ₹${firstSale[0].total_payable_amount}`
    });
  }

  // Highest revenue day
  const [highestRevenueDay] = await connection.execute(`
    SELECT 
      DATE(o.created_at) as date,
      SUM(o.total_payable_amount) as daily_revenue
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ?
    GROUP BY DATE(o.created_at)
    ORDER BY daily_revenue DESC
    LIMIT 1
  `, [sellerId]);
  if (highestRevenueDay.length > 0) {
    timeline.push({
      event: "Highest revenue day",
      date: highestRevenueDay[0].date,
      details: `Revenue: ₹${highestRevenueDay[0].daily_revenue}`
    });
  }

  // Last order
  const [lastOrder] = await connection.execute(`
    SELECT o.created_at, o.total_payable_amount
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.seller_id = ?
    ORDER BY o.created_at DESC
    LIMIT 1
  `, [sellerId]);
  if (lastOrder.length > 0) {
    timeline.push({
      event: "Last order",
      date: lastOrder[0].created_at,
      details: `Amount: ₹${lastOrder[0].total_payable_amount}`
    });
  }

  // Sort timeline by date
  return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
}

module.exports = {
  getSellerDetails
};