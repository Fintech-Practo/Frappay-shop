const pool = require("../../config/db");
const userModel = require("../user/user.model");
const orderModel = require("../order/order.model");

async function getUserDetails(userId) {
  if (!userId || isNaN(userId)) {
    throw new Error("Valid user ID is required");
  }

  // Get basic user info
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Get user's orders with items
  const orders = await orderModel.findByUserId(userId);
  
  // Get reviews by user
  const [reviews] = await pool.query(
    `SELECT r.*, p.title as product_title 
     FROM reviews r 
     LEFT JOIN products p ON r.product_id = p.id 
     WHERE r.user_id = ? 
     ORDER BY r.created_at DESC`,
    [userId]
  );

  // Get seller info if user is a seller
  let sellerInfo = null;
  if (user.role === 'SELLER') {
    const [sellerRows] = await pool.query(
      `SELECT * FROM seller_info WHERE user_id = ?`,
      [userId]
    );
    sellerInfo = sellerRows[0] || null;
  }

  // Calculate summary statistics
  const summary = {
    total_orders: orders.length,
    total_spent: orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0),
    total_items_purchased: orders.reduce((sum, order) => 
      sum + (order.items ? order.items.reduce((itemSum, item) => itemSum + item.quantity, 0) : 0), 0
    ),
    total_reviews: reviews.length,
    account_age_days: Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)),
    cancelled_orders: orders.filter(order => order.status === 'CANCELLED').length,
    delivered_orders: orders.filter(order => order.status === 'DELIVERED').length
  };

  // Calculate financial metrics
  const financials = {
    total_orders: summary.total_orders,
    total_items_purchased: summary.total_items_purchased,
    total_spent: summary.total_spent,
    avg_order_value: summary.total_orders > 0 ? summary.total_spent / summary.total_orders : 0,
    cancelled_orders: summary.cancelled_orders,
    refunded_value: 0, // Would need to check refunds table if exists
    ebook_vs_physical_ratio: { ebook: 0, physical: 0 }
  };

  // Calculate format ratios
  let ebookCount = 0;
  let physicalCount = 0;
  
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        if (item.format === 'EBOOK') {
          ebookCount += item.quantity;
        } else {
          physicalCount += item.quantity;
        }
      });
    }
  });

  const totalItems = ebookCount + physicalCount;
  if (totalItems > 0) {
    financials.ebook_vs_physical_ratio = {
      ebook: (ebookCount / totalItems * 100).toFixed(1),
      physical: (physicalCount / totalItems * 100).toFixed(1)
    };
  }

  // Create activity timeline
  const timeline = [];
  
  // Account creation
  timeline.push({
    type: 'account_created',
    date: user.created_at,
    description: 'Account created'
  });

  // First order
  if (orders.length > 0) {
    const firstOrder = orders.reduce((earliest, order) => 
      new Date(order.created_at) < new Date(earliest.created_at) ? order : earliest
    );
    timeline.push({
      type: 'first_order',
      date: firstOrder.created_at,
      description: `First order placed (#${firstOrder.id})`,
      order_id: firstOrder.id
    });
  }

  // Last order
  if (orders.length > 0) {
    const lastOrder = orders.reduce((latest, order) => 
      new Date(order.created_at) > new Date(latest.created_at) ? order : latest
    );
    timeline.push({
      type: 'last_order',
      date: lastOrder.created_at,
      description: `Last order placed (#${lastOrder.id})`,
      order_id: lastOrder.id
    });
  }

  // Reviews posted
  reviews.forEach(review => {
    timeline.push({
      type: 'review_posted',
      date: review.created_at,
      description: `Posted review for ${review.product_title || 'product'}`,
      rating: review.rating,
      review_id: review.id
    });
  });

  // Sort timeline by date (most recent first)
  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate risk metrics
  const riskMetrics = {
    cancellation_rate: summary.total_orders > 0 ? 
      (summary.cancelled_orders / summary.total_orders * 100).toFixed(1) : 0,
    suspicious_activity_flag: false, // Could implement heuristics here
    excessive_refunds: false, // Would need refunds data
    blocked_attempts: 0 // Would need audit logs for failed login attempts
  };

  // Simple heuristic for suspicious activity
  if (parseFloat(riskMetrics.cancellation_rate) > 50) {
    riskMetrics.suspicious_activity_flag = true;
  }

  // Parse preferences if they exist
  let parsedPreferences = {};
  if (user.preferences) {
    try {
      parsedPreferences = JSON.parse(user.preferences);
    } catch (e) {
      console.warn("Failed to parse user preferences:", e);
    }
  }

  // Get user addresses and identify default
  const addressModel = require("../address/address.model");
  const userAddresses = await addressModel.findByUserId(userId);
  const defaultAddress = userAddresses.find(addr => addr.is_default) || userAddresses[0] || null;

  // Derive location from default address if not set
  let derivedLocation = user.location;
  if (!derivedLocation && defaultAddress) {
    derivedLocation = `${defaultAddress.city}, ${defaultAddress.state}`;
  }

  // Format response
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      is_email_verified: user.is_email_verified,
      profile_image_url: user.profile_image_url,
      phone: user.phone || (defaultAddress ? defaultAddress.phone : null),
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      address: user.address,
      location: derivedLocation,
      preferences: parsedPreferences,
      created_at: user.created_at,
      updated_at: user.updated_at
    },
    default_address: defaultAddress,
    summary,
    orders: orders.map(order => ({
      id: order.id,
      invoice_number: order.invoice_number,
      order_date: order.created_at,
      order_status: order.status,
      payment_status: order.payment_status,
      order_type: order.order_type,
      items_count: order.items ? order.items.length : 0,
      total_amount: order.total_amount,
      items: order.items ? order.items.map(item => ({
        product_id: item.product_id,
        product_title: item.product_title,
        format: item.format,
        quantity: item.quantity,
        price: item.price,
        seller_id: item.seller_id,
        commission_percentage: item.commission_percentage,
        commission_amount: item.commission_amount,
        seller_payout: item.seller_payout,
        admin_net_profit: item.admin_net_profit
      })) : []
    })),
    financials,
    activity_timeline: timeline,
    risk_metrics: riskMetrics,
    seller_info: sellerInfo,
    reviews: reviews.map(review => ({
      id: review.id,
      product_id: review.product_id,
      product_title: review.product_title,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      created_at: review.created_at
    }))
  };
}

module.exports = {
  getUserDetails
};
