const pool = require("../../config/db");
const logger = require("../../utils/logger");
const config = require("../../config/env");

async function create(orderData, items, providedConnection = null) {
  const connection = providedConnection || await pool.getConnection();
  const shouldManageTransaction = !providedConnection;

  try {
    if (shouldManageTransaction) {
      await connection.beginTransaction();
    }

    // Task: Snapshot address fields into orders table
    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        user_id, total_payable_amount, shipping_amount, shipping_cost, subtotal_amount, 
        coupon_id, coupon_discount, items_discount, coin_discount,
        status, order_type, payment_method, payment_status,
        shipping_full_name, shipping_phone, shipping_address_line1, shipping_address_line2,
        shipping_city, shipping_state, shipping_postal_code, shipping_country,
        shipping_address, phone,
        admin_commission_total, admin_net_profit, seller_payout_total,
        warehouse_id, gateway_fee, cod_charges, shipping_margin, shipping_base_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderData.user_id,
        orderData.total_payable_amount || orderData.total_amount,
        orderData.shipping_amount || orderData.shipping_cost || 0,
        orderData.shipping_cost || orderData.shipping_amount || 0,
        orderData.subtotal_amount || 0,
        orderData.coupon_id || null,
        orderData.coupon_discount || 0,
        orderData.items_discount || 0,
        orderData.coin_discount || 0,
        orderData.status || 'pending',
        orderData.order_type || 'PHYSICAL',
        orderData.payment_method || 'COD',
        orderData.payment_status || 'PENDING',
        orderData.shipping_full_name || null,
        orderData.shipping_phone || null,
        orderData.shipping_address_line1 || null,
        orderData.shipping_address_line2 || null,
        orderData.shipping_city || null,
        orderData.shipping_state || null,
        orderData.shipping_postal_code || null,
        orderData.shipping_country || 'India',
        JSON.stringify({
          address_line1: orderData.shipping_address_line1,
          address_line2: orderData.shipping_address_line2,
          city: orderData.shipping_city,
          state: orderData.shipping_state,
          postal_code: orderData.shipping_postal_code,
          phone: orderData.shipping_phone
        }),
        orderData.shipping_phone || null,
        orderData.admin_commission_total || 0,
        orderData.admin_net_profit || 0,
        orderData.seller_payout_total || 0,
        orderData.warehouse_id || null,
        orderData.gateway_fee || 0,
        orderData.cod_charges || 0,
        orderData.shipping_margin || 0,
        orderData.shipping_base_rate || 0
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (
          order_id, product_id, product_title, seller_id, quantity, price,
          product_type_code, format, commission_percentage, commission_amount,
          seller_payout, admin_net_profit,
          reward_coins, reward_rule_id, reward_commission_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.product_title,
          item.seller_id || null,
          item.quantity,
          item.price,
          item.product_type_code || null,
          item.format || 'PHYSICAL',
          item.commission_percentage || 0,
          item.commission_amount || 0,
          item.seller_payout || 0,
          item.admin_net_profit || 0,
          item.reward_coins || 0,
          item.reward_rule_id || null,
          item.reward_commission_snapshot || null
        ]
      );

      if (item.format !== 'EBOOK' && !item.is_unlimited_stock) {
        const [result] = await connection.query(
          `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
          [item.quantity, item.product_id, item.quantity]
        );

        if (result.affectedRows === 0) {
          throw new Error(`Insufficient stock for product: ${item.product_title}`);
        }
      }
    }

    if (shouldManageTransaction) {
      await connection.commit();
    }
    return await findById(orderId, connection);
  } catch (error) {
    if (shouldManageTransaction) {
      await connection.rollback();
    }
    logger.error("Order creation failed", { error: error.message });
    throw error;
  } finally {
    if (shouldManageTransaction) {
      connection.release();
    }
  }
}

const paymentTransactionModel = require("../payment/paymentTransaction.model");

async function findById(id, connection = null) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT o.*,
            ls.admin_status as shipment_status,
            ls.label_s3_url,
            ls.last_location,
            o.coupon_id,
            o.coupon_discount,
            o.coin_discount,
            o.items_discount,
            o.total_payable_amount as total_amount,
            o.shipping_amount as shipping_cost,
            o.total_payable_amount as grand_total,
            o.subtotal_amount as product_subtotal,
            u.name as user_name, u.email as user_email,
            pt.gateway_transaction_id,
            pt.gateway as pt_gateway,
            pt.status as pt_status,
            pt.amount as pt_amount
     FROM orders o
     JOIN users u ON o.user_id = u.id 
     LEFT JOIN payment_transactions pt ON o.id = pt.order_id
     LEFT JOIN logistics_shipments ls ON o.id = ls.order_id
     WHERE o.id = ?`,
    [id]
  );

  if (rows.length === 0) return null;

  const order = rows[0];
  
  // Dynamic Platform Fee from .env
  order.platform_fee = order.order_type === 'PHYSICAL' ? (config.platformFee || 15) : 0;

  // 1. Map Snapshot Fields to Shipping Object
  // Fallback to legacy 'shipping_address' column if snapshot fields are missing
  const rawAddr = order.shipping_address_line1 || order.shipping_address || "";
  const pinMatch = rawAddr.match(/\b\d{6}\b/);
  const extractedPin = pinMatch ? pinMatch[0] : "";
  const extractedPhone = rawAddr.match(/\b\d{10}\b/)?.[0] || "";

  order.shipping = {
    full_name: order.shipping_full_name || order.user_name || "Customer",
    phone: order.shipping_phone || extractedPhone,
    address_line1: order.shipping_address_line1 || order.shipping_address || "Address",
    address_line2: order.shipping_address_line2 || "",
    city: order.shipping_city || (extractedPin ? "Parsing..." : ""),
    state: order.shipping_state || "India",
    postal_code: order.shipping_postal_code || extractedPin || "",
    country: order.shipping_country || "India"
  };

  // 2. Compatibility Layer (Some parts of UI expect shipping_address object)
  order.shipping_address = {
    ...order.shipping,
    pin: order.shipping.postal_code, // used in some components
    pincode: order.shipping.postal_code
  };

  // 3. Payment Info - Initial default values
  order.payment = {
    gateway: order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online',
    gateway_transaction_id: order.gateway_transaction_id || 'N/A',
    amount: order.total_amount || 0,
    status: order.payment_status || 'PENDING',
    date: order.created_at || new Date()
  };

  const [items] = await db.query(
    `SELECT oi.*, p.title as current_product_title, p.attributes, p.image_url as product_image, 
            p.selling_price as current_price, p.ebook_url, p.seller_id as product_seller_id
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [id]
  );

  order.items = items.map(item => ({
    ...item,
    product_title: item.product_title || item.current_product_title,
    price: item.price,
    format: item.format,
    product_type_code: item.product_type_code,
    commission_percentage: item.commission_percentage,
    commission_amount: item.commission_amount,
    seller_payout: item.seller_payout,
    admin_net_profit: item.admin_net_profit
  }));

  try {
    const [returnRows] = await db.query(
      `SELECT reason as return_reason, status as return_lifecycle_status, admin_remarks 
       FROM order_returns WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    if (returnRows.length > 0) {
      order.return_reason = returnRows[0].return_reason;
      order.return_lifecycle_status = returnRows[0].return_lifecycle_status;
      order.admin_remarks = returnRows[0].admin_remarks;
    }
  } catch (err) {
    logger.warn(`Failed to fetch return details for order ${id}: ${err.message}`);
  }

  if (order.coupon_id) {
    try {
      const [couponRows] = await db.query(
        `SELECT id, code, description as name, discount_type, discount_value FROM coupons WHERE id = ?`,
        [order.coupon_id]
      );
      if (couponRows.length > 0) {
        order.coupon = {
          id: couponRows[0].id,
          code: couponRows[0].code,
          name: couponRows[0].name,
          discount_type: couponRows[0].discount_type,
          discount: parseFloat(order.coupon_discount || 0)
        };
      }
    } catch (err) {
      logger.warn(`Failed to fetch coupon details for order ${id}: ${err.message}`);
    }
  }

  try {
    const paymentTxn = await paymentTransactionModel.findByOrderId(id);
    if (paymentTxn) {
      order.payment = {
        gateway: paymentTxn.gateway || order.payment.gateway,
        gateway_transaction_id: paymentTxn.gateway_transaction_id || order.payment.gateway_transaction_id,
        amount: Number(paymentTxn.amount) || order.payment.amount,
        status: paymentTxn.status || order.payment.status,
        date: paymentTxn.created_at || order.payment.date
      };
    }
  } catch (err) {
    logger.warn(`Failed to fetch payment transaction for order ${id}: ${err.message}`);
  }

  if (order.awb_number && order.shipment_created) {
    const env = require('../../config/env');
    order.tracking_url = `https://www.delhivery.com/track/package/${order.awb_number}`;
  }

  try {
    const [shipmentRows] = await db.query(
      `SELECT id, admin_status, awb_code, courier_name, tracking_url, packed_at, pickup_date, delivered_date, seller_id, label_status, label_s3_url, pickup_status, pickup_token
       FROM logistics_shipments WHERE order_id = ? ORDER BY created_at ASC`,
      [id]
    );
    order.shipments = shipmentRows;

    // Fetch Status History (Internal Events)
    const [history] = await db.query(
      `SELECT * FROM status_history WHERE order_id = ? ORDER BY created_at DESC`,
      [id]
    );
    order.status_history = history;

    // Fetch Detailed Tracking History for each shipment
    for (let ship of order.shipments) {
      const [tracking] = await db.query(
        `SELECT * FROM shipment_tracking_history WHERE shipment_id = ? ORDER BY activity_date DESC`,
        [ship.id]
      );
      ship.tracking_history = tracking;
    }
  } catch (err) {
    logger.warn(`Failed to fetch shipments for order ${id}: ${err.message}`);
    order.shipments = [];
  }

  return order;
}

async function findEbooksByUserId(userId) {
  const [orders] = await pool.query(
    `SELECT DISTINCT o.*, 
            o.total_payable_amount as grand_total, 
            o.subtotal_amount as product_subtotal
     FROM orders o
     INNER JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = ? AND oi.format = 'EBOOK'
     AND (o.status = 'CONFIRMED' OR o.payment_status = 'PAID')
     ORDER BY o.created_at DESC`,
    [userId]
  );

  if (orders.length === 0) return [];
  const orderIds = orders.map(order => order.id);

  const [allItems] = await pool.query(
    `SELECT oi.*, p.title as current_product_title, p.attributes, 
            p.image_url as product_image, p.ebook_url, p.selling_price as current_price
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')}) AND oi.format = 'EBOOK'
     ORDER BY oi.order_id, oi.id`,
    orderIds
  );

  const orderMap = new Map(orders.map(order => [order.id, order]));

  return allItems.map(item => {
    const order = orderMap.get(item.order_id);
    const enriched = {
      ...item,
      order_id: order.id,
      order_date: order.created_at,
      order_status: order.status,
      payment_status: order.payment_status,
      product_title: item.product_title || item.current_product_title,
      price: item.price,
      ebook_url: item.ebook_url,
      product_image: item.product_image,
      attributes: item.attributes
    };

    // Add shipping context from snapshot fields
    enriched.shipping = {
      full_name: order.shipping_full_name,
      city: order.shipping_city,
      state: order.shipping_state,
      postal_code: order.shipping_postal_code
    };
    return enriched;
  });
}

async function findByUserId(userId, filters = {}) {
  let query = `SELECT o.*, 
                      o.total_payable_amount as total_amount,
                      COALESCE(NULLIF(o.shipping_amount, 0), 0) as shipping_cost,
                      o.total_payable_amount as grand_total, 
                      o.subtotal_amount as product_subtotal,
                      u.name as user_name, u.email as user_email 
               FROM orders o 
               LEFT JOIN users u ON o.user_id = u.id 
               WHERE o.user_id = ?`;
  const params = [userId];

  if (filters.status) {
    query += ` AND o.status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY o.created_at DESC`;
  const limit = filters.limit ? parseInt(filters.limit, 10) : 50;
  query += ` LIMIT ?`;
  params.push(limit);

  try {
    const [orderRows] = await pool.query(query, params);
    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map(row => row.id);
    const [allItems] = await pool.query(
      `SELECT oi.*, p.title as current_product_title, p.attributes, p.image_url as product_image, 
              p.selling_price as current_price, p.ebook_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
       ORDER BY oi.order_id, oi.id`,
      orderIds
    );

    const [allPayments] = await pool.query(
      `SELECT * FROM payment_transactions WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );

    const itemsByOrderId = new Map();
    allItems.forEach(item => {
      if (!itemsByOrderId.has(item.order_id)) itemsByOrderId.set(item.order_id, []);
      itemsByOrderId.get(item.order_id).push({
        ...item,
        product_title: item.product_title || item.current_product_title
      });
    });

    const paymentsByOrderId = new Map();
    allPayments.forEach(payment => paymentsByOrderId.set(payment.order_id, payment));

    return orderRows.map(order => {
      const orderObj = { ...order };
      orderObj.items = itemsByOrderId.get(order.id) || [];
      const paymentTxn = paymentsByOrderId.get(order.id);
      if (paymentTxn) {
        // Payment snapshot
        orderObj.payment = {
          gateway: (paymentTxn?.gateway) || (order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online'),
          gateway_transaction_id: (paymentTxn?.gateway_transaction_id) || order.gateway_transaction_id || 'N/A',
          amount: Number(paymentTxn?.amount) || order.total_amount || 0,
          status: (paymentTxn?.status) || order.payment_status || 'PENDING',
          date: (paymentTxn?.created_at) || order.created_at || new Date()
        };
      }
      // Add shipping snapshot
      orderObj.shipping = {
        full_name: order.shipping_full_name,
        phone: order.shipping_phone,
        city: order.shipping_city,
        state: order.shipping_state,
        postal_code: order.shipping_postal_code
      };
      
      // Dynamic Platform Fee from .env
      orderObj.platform_fee = order.order_type === 'PHYSICAL' ? (config.platformFee || 15) : 0;
      
      return orderObj;
    });
  } catch (error) {
    console.error("Error in findByUserId:", error);
    throw error;
  }
}

async function findAll(filters = {}) {
  const { limit = 50, offset = 0, status, user_id } = filters;
  let query = `SELECT o.*, 
                      o.total_payable_amount as total_amount,
                      COALESCE(NULLIF(o.shipping_amount, 0), 0) as shipping_cost,
                      o.total_payable_amount as grand_total, 
                      o.subtotal_amount as product_subtotal,
                      u.name as user_name, u.email as user_email 
     FROM orders o 
     JOIN users u ON o.user_id = u.id 
     WHERE 1=1`;
  const params = [];

  if (status) {
    query += ` AND o.status = ?`;
    params.push(status);
  }

  if (user_id) {
    query += ` AND o.user_id = ?`;
    params.push(user_id);
  }

  query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  try {
    const [orderRows] = await pool.query(query, params);
    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map(row => row.id);
    const [allItems] = await pool.query(
      `SELECT oi.*, p.title as current_product_title, p.attributes, p.image_url as product_image, 
              p.selling_price as current_price, p.ebook_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
       ORDER BY oi.order_id, oi.id`,
      orderIds
    );

    const [allPayments] = await pool.query(
      `SELECT * FROM payment_transactions WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );

    const itemsByOrderId = new Map();
    allItems.forEach(item => {
      if (!itemsByOrderId.has(item.order_id)) itemsByOrderId.set(item.order_id, []);
      itemsByOrderId.get(item.order_id).push({
        ...item,
        product_title: item.product_title || item.current_product_title
      });
    });

    const paymentsByOrderId = new Map();
    allPayments.forEach(payment => paymentsByOrderId.set(payment.order_id, payment));

    return orderRows.map(order => {
      const orderObj = { ...order };
      orderObj.items = itemsByOrderId.get(order.id) || [];
      const paymentTxn = paymentsByOrderId.get(order.id);
      if (paymentTxn) {
        // Payment snapshot
        orderObj.payment = {
          gateway: (paymentTxn?.gateway) || (order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online'),
          gateway_transaction_id: (paymentTxn?.gateway_transaction_id) || order.gateway_transaction_id || '/A',
          amount: Number(paymentTxn?.amount) || order.total_amount || 0,
          status: (paymentTxn?.status) || order.payment_status || 'PENDING',
          date: (paymentTxn?.created_at) || order.created_at || new Date()
        };
      }
      // Add shipping snapshot
      orderObj.shipping = {
        full_name: order.shipping_full_name,
        phone: order.shipping_phone,
        city: order.shipping_city,
        state: order.shipping_state,
        postal_code: order.shipping_postal_code
      };
      
      // Dynamic Platform Fee from .env
      orderObj.platform_fee = order.order_type === 'PHYSICAL' ? (config.platformFee || 15) : 0;
      
      return orderObj;
    });
  } catch (error) {
    console.error("Error in findAll (order):", error);
    throw error;
  }
}

async function countAll(filters = {}) {
  const { status, user_id } = filters;
  let query = `SELECT COUNT(*) as total FROM orders WHERE 1=1`;
  const params = [];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (user_id) {
    query += ` AND user_id = ?`;
    params.push(user_id);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
}

async function addStatusLog(orderId, status, remarks = null, connection = null) {
  const db = connection || pool;
  await db.query(
    "INSERT INTO order_status_logs (order_id, status, remarks) VALUES (?, ?, ?)",
    [orderId, status, remarks]
  );
}

async function updateStatus(id, status, remarks = null, connection = null) {
  const db = connection || pool;
  await db.query(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);
  await addStatusLog(id, status, remarks, connection);
  return await findById(id, connection);
}

async function updateShippingAddress(id, address) {
  // Update the snapshot fields if the user updates address after order (usually not allowed, but keeping for compatibility)
  await pool.query(
    `UPDATE orders SET 
      shipping_full_name = ?, shipping_phone = ?, shipping_address_line1 = ?, 
      shipping_city = ?, shipping_state = ?, shipping_postal_code = ? 
    WHERE id = ?`,
    [address.full_name, address.phone, address.address_line1, address.city, address.state, address.postal_code, id]
  );
  return await findById(id);
}

async function getOrderStats() {
  const [stats] = await pool.query(
    `SELECT 
      COUNT(*) as total_orders,
      SUM(total_payable_amount) as total_revenue,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as delivered_orders
     FROM orders`
  );
  return stats[0];
}

async function getRevenueSeriesStats(range = '6m') {
  let condition = 'created_at >= NOW() - INTERVAL 6 MONTH';
  let groupBy = "DATE_FORMAT(created_at, '%Y-%m')";
  let dateFormat = "DATE_FORMAT(created_at, '%b')";

  const [rows] = await pool.query(
    `SELECT ${dateFormat} as label, SUM(total_payable_amount) as value
     FROM orders WHERE ${condition} GROUP BY ${groupBy}, ${dateFormat} ORDER BY ${groupBy} ASC`
  );
  return rows;
}

async function getSalesAnalytics(filters = {}) {
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(created_at, '%b') as period, COUNT(*) as total_orders,
      SUM(total_payable_amount) as revenue, AVG(total_payable_amount) as avg_order_value
     FROM orders WHERE status != 'CANCELLED' GROUP BY period ORDER BY period ASC`
  );
  return rows;
}

async function createReturnRequest(data) {
  const { order_id, user_id, reason, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id } = data;
  const [result] = await pool.execute(
    `INSERT INTO order_returns (order_id, user_id, reason, status, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id) VALUES (?, ?, ?, 'RETURN_REQUESTED', ?, ?, ?, ?, ?)`,
    [order_id, user_id, reason, bank_account_name || null, bank_account_number || null, bank_ifsc || null, bank_name || null, upi_id || null]
  );
  return result.insertId;
}

async function findAllReturnRequests(filters = {}) {
  const { status, limit = 50, offset = 0 } = filters;
  let query = `SELECT r.id as return_primary_id, r.order_id as id, r.reason as return_reason, 
                      r.status, r.admin_remarks, r.created_at,
                      r.bank_account_name, r.bank_account_number, r.bank_ifsc, r.bank_name, r.upi_id,
                      u.name as user_name, u.email as user_email, o.total_payable_amount, o.payment_method 
               FROM order_returns r
               JOIN users u ON r.user_id = u.id
               JOIN orders o ON r.order_id = o.id
               WHERE 1=1`;
  const params = [];

  if (status) {
    query += ` AND r.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  return rows;
}

async function countReturnRequests(filters = {}) {
  const { status } = filters;
  let query = `SELECT COUNT(*) as total FROM order_returns WHERE 1=1`;
  const params = [];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
}

async function updateReturnStatus(orderId, status, adminRemarks, returnStatus = status) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE order_returns SET status = ?, admin_remarks = ? WHERE order_id = ?`,
      [status, adminRemarks, orderId]
    );

    await connection.execute(
      `UPDATE orders SET status = ?, return_status = ? WHERE id = ?`,
      [status, returnStatus, orderId]
    );

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    logger.error("Failed to update return status", { orderId, status, error: err.message });
    throw err;
  } finally {
    connection.release();
  }
}

async function findByWaybill(waybill) {
  const [rows] = await pool.query(
    `SELECT o.*, 
            o.total_payable_amount as total_amount
     FROM orders o
     JOIN logistics_shipments ls ON o.id = ls.order_id
     WHERE ls.awb_code = ?`,
    [waybill]
  );

  if (rows.length === 0) return null;
  return await findById(rows[0].id);
}

module.exports = {
  create, findById, findByUserId, findEbooksByUserId, findAll, countAll, updateStatus,
  updateShippingAddress, getOrderStats, getRevenueSeriesStats, getSalesAnalytics,
  createReturnRequest, findAllReturnRequests, countReturnRequests, updateReturnStatus,
  findByWaybill, addStatusLog
};