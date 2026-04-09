const pool = require("../../config/db");

async function findByOrderId(orderId) {
  const [rows] = await pool.execute(
    `SELECT oi.*, 
            p.title as product_title, 
            p.image_url as product_image,
            p.seller_id,
            u.name as seller_name
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     LEFT JOIN users u ON p.seller_id = u.id
     WHERE oi.order_id = ?
     ORDER BY oi.created_at ASC`,
    [orderId]
  );
  return rows;
}

async function findByProductId(productId) {
  const [rows] = await pool.execute(
    `SELECT oi.*, 
            o.user_id,
            o.status as order_status,
            o.created_at as order_date
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = ?
     ORDER BY o.created_at DESC`,
    [productId]
  );
  return rows;
}

async function findBySellerId(sellerId, filters = {}) {
  let query = `SELECT oi.*, 
                      o.user_id,
                      o.status as order_status,
                      o.total_payable_amount as total_amount,
                      o.created_at as order_date,
                      p.title as product_title
               FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               JOIN products p ON oi.product_id = p.id
               WHERE p.seller_id = ?`;
  const params = [sellerId];

  if (filters.order_status) {
    query += ` AND o.status = ?`;
    params.push(filters.order_status);
  }

  query += ` ORDER BY o.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);

    if (filters.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }

  const [rows] = await pool.execute(query, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT oi.*, 
            p.title as product_title, 
            p.image_url as product_image,
            p.seller_id,
            o.user_id,
            o.status as order_status
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function getOrderedItemsByUserId(userId, filters = {}) {
  let query = `SELECT oi.*, 
                      p.title as product_title, 
                      p.image_url as product_image,
                      o.id as order_id,
                      o.status as order_status,
                      o.created_at as order_date
               FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               JOIN products p ON oi.product_id = p.id
               WHERE o.user_id = ?`;
  const params = [userId];

  if (filters.order_status) {
    query += ` AND o.status = ?`;
    params.push(filters.order_status);
  }

  query += ` ORDER BY o.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);

    if (filters.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }

  const [rows] = await pool.execute(query, params);
  return rows;
}

async function getStatsBySellerId(sellerId) {
  const [rows] = await pool.execute(
    `SELECT 
      COUNT(DISTINCT oi.order_id) as total_orders,
      SUM(oi.quantity) as total_items_sold,
      SUM(oi.price * oi.quantity) as total_revenue,
      COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) as cancelled_orders
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN products p ON oi.product_id = p.id
     WHERE p.seller_id = ?`,
    [sellerId]
  );
  return rows[0] || {
    total_orders: 0,
    total_items_sold: 0,
    total_revenue: 0,
    delivered_orders: 0,
    cancelled_orders: 0
  };
}

module.exports = {
  findByOrderId,
  findByProductId,
  findBySellerId,
  findById,
  getOrderedItemsByUserId,
  getStatsBySellerId
};

