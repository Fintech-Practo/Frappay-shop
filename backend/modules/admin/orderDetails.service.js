const pool = require("../../config/db");
const orderModel = require("../order/order.model");
const paymentTransactionModel = require("../payment/paymentTransaction.model");

async function getOrderDetails(orderId) {
  if (!orderId || isNaN(orderId)) {
    throw new Error("Valid order ID is required");
  }

  // Get order with buyer info
  const order = await orderModel.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Fetch Payment Transaction Details for admin
  let paymentTransaction = null;
  try {
    paymentTransaction = await paymentTransactionModel.findByOrderId(orderId);
  } catch (err) {
    console.warn(`Failed to fetch payment transaction for order ${orderId}: ${err.message}`);
  }

  // Get detailed buyer information
  const [buyerRows] = await pool.query(
    `SELECT id, name, email, location, profile_image_url 
     FROM users WHERE id = ?`,
    [order.user_id]
  );

  const buyer = buyerRows[0] || null;

  // Get detailed order items with seller info
  const [itemsRows] = await pool.query(
    `SELECT oi.*, u.name as seller_name, u.email as seller_email,
            p.title as current_product_title, p.image_url as product_image,
            p.ebook_url, p.attributes
     FROM order_items oi
     LEFT JOIN users u ON oi.seller_id = u.id
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  // Group items by seller for seller breakdown
  const sellerBreakdown = {};
  let grossTotal = 0;
  let totalCommission = 0;
  let adminNetProfit = 0;
  let sellerPayoutTotal = 0;

  itemsRows.forEach(item => {
    const sellerId = item.seller_id || 'system';
    const sellerName = item.seller_name || 'System';

    if (!sellerBreakdown[sellerId]) {
      sellerBreakdown[sellerId] = {
        seller_id: sellerId,
        seller_name: sellerName,
        seller_email: item.seller_email,
        total_sales: 0,
        total_payout: 0,
        total_commission: 0,
        items: []
      };
    }

    const itemTotal = parseFloat(item.price) * item.quantity;
    const commissionAmount = parseFloat(item.commission_amount || 0);
    const sellerPayout = parseFloat(item.seller_payout || 0);
    const adminProfit = parseFloat(item.admin_net_profit || 0);

    grossTotal += itemTotal;
    totalCommission += commissionAmount;
    adminNetProfit += adminProfit;
    sellerPayoutTotal += sellerPayout;

    sellerBreakdown[sellerId].total_sales += itemTotal;
    sellerBreakdown[sellerId].total_payout += sellerPayout;
    sellerBreakdown[sellerId].total_commission += commissionAmount;

    sellerBreakdown[sellerId].items.push({
      product_id: item.product_id,
      product_title: item.product_title || item.current_product_title,
      format: item.format,
      quantity: item.quantity,
      price: parseFloat(item.price),
      item_total: itemTotal,
      commission_percentage: parseFloat(item.commission_percentage || 0),
      commission_amount: commissionAmount,
      seller_payout: sellerPayout,
      admin_net_profit: adminProfit,
      product_image: item.product_image,
      ebook_url: item.ebook_url,
      attributes: item.attributes
    });
  });

  // Convert seller breakdown to array
  const sellerBreakdownArray = Object.values(sellerBreakdown);

  // Create timeline
  const timeline = [];

  // Order creation
  timeline.push({
    type: 'order_created',
    date: order.created_at,
    description: `Order #${order.id} created`,
    details: {
      total_amount: order.total_payable_amount,
      payment_status: order.payment_status
    }
  });

  // Invoice generation (if invoice number exists)
  if (order.invoice_number) {
    timeline.push({
      type: 'invoice_generated',
      date: order.created_at, // Assuming generated at same time as order
      description: `Invoice ${order.invoice_number} generated`,
      details: {
        invoice_number: order.invoice_number
      }
    });
  }

  // Status changes (would need to check audit logs for full history)
  if (order.status !== 'PENDING') {
    timeline.push({
      type: 'status_change',
      date: order.updated_at,
      description: `Order status changed to ${order.status}`,
      details: {
        new_status: order.status
      }
    });
  }

  // Sort timeline by date
  timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Parse shipping address if it's JSON
  let shippingAddress = order.shipping_address;
  if (typeof shippingAddress === 'string') {
    try {
      shippingAddress = JSON.parse(shippingAddress);
    } catch (e) {
      // Keep as string if parsing fails
    }
  }

  // Determine actual payment status from payment transaction if available
  let actualPaymentStatus = order.payment_status;
  if (paymentTransaction) {
    // If payment transaction exists and is SUCCESS, payment is PAID
    if (paymentTransaction.status === 'SUCCESS') {
      actualPaymentStatus = 'PAID';
    } else if (paymentTransaction.status === 'FAILED') {
      actualPaymentStatus = 'FAILED';
    } else if (paymentTransaction.status === 'PENDING') {
      actualPaymentStatus = 'PENDING';
    }
  } else if (order.payment_method === 'cod') {
    // COD orders are always PENDING until delivered
    actualPaymentStatus = 'PENDING';
  }

  // Financial breakdown
  const financials = {
    gross_total: grossTotal,
    total_commission: totalCommission,
    admin_net_profit: adminNetProfit,
    seller_payout_total: sellerPayoutTotal,
    order_total: parseFloat(order.total_payable_amount),
    payment_status: actualPaymentStatus, // Use derived payment status
    order_type: order.order_type
  };

  // Fulfillment details
  const fulfillment = {
    shipping_address: shippingAddress,
    shipment_status: order.status, // Would need separate shipment tracking table
    delivery_date: null, // Would need delivery tracking
    downloadable_items: itemsRows
      .filter(item => item.format === 'EBOOK' && item.ebook_url)
      .map(item => ({
        product_id: item.product_id,
        product_title: item.product_title || item.current_product_title,
        ebook_url: item.ebook_url,
        download_count: 0 // Would need download tracking
      }))
  };

  // STEP 7: Build the payment block for admin panel.
  // For COD orders with no gateway transaction, return a synthetic COD block
  // instead of null so the panel never shows "No payment transaction recorded".
  let paymentBlock;
  if (paymentTransaction) {
    paymentBlock = {
      id: paymentTransaction.id,
      payment_session_id: paymentTransaction.payment_session_id,
      gateway: paymentTransaction.gateway,
      gateway_transaction_id: paymentTransaction.gateway_transaction_id,
      gateway_payment_id: paymentTransaction.gateway_payment_id,
      amount: parseFloat(paymentTransaction.amount),
      status: paymentTransaction.status,
      created_at: paymentTransaction.created_at,
      raw_response: paymentTransaction.raw_response
        ? (typeof paymentTransaction.raw_response === 'string'
          ? JSON.parse(paymentTransaction.raw_response)
          : paymentTransaction.raw_response)
        : null
    };
  } else if (order.payment_method === 'COD' || order.payment_method === 'cod') {
    // Synthetic COD payment block — no gateway involved
    paymentBlock = {
      id: null,
      payment_session_id: null,
      gateway: 'COD',
      gateway_transaction_id: null,
      gateway_payment_id: null,
      amount: parseFloat(order.total_payable_amount || 0),
      status: order.payment_status || 'PENDING',
      payment_method: 'Cash on Delivery',
      cod_amount: parseFloat(order.total_payable_amount || 0),
      created_at: order.created_at,
      raw_response: null
    };
  } else {
    paymentBlock = null;
  }

  return {
    order: {
      id: order.id,
      invoice_number: order.invoice_number,
      order_date: order.created_at,
      order_type: order.order_type,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      total_amount: order.total_payable_amount,
      shipping_cost: order.shipping_cost,
      grand_total: order.grand_total,
      product_subtotal: order.product_subtotal,
      coupon_id: order.coupon_id,
      coupon_discount: order.coupon_discount,
      coin_discount: order.coin_discount,
      items_discount: order.items_discount,
      coupon: order.coupon || null,
      updated_at: order.updated_at
    },
    buyer: buyer,
    items: itemsRows.map(item => ({
      product_id: item.product_id,
      product_title: item.product_title || item.current_product_title,
      format: item.format,
      quantity: item.quantity,
      price: parseFloat(item.price),
      seller_id: item.seller_id,
      seller_name: item.seller_name,
      commission_percentage: parseFloat(item.commission_percentage || 0),
      commission_amount: parseFloat(item.commission_amount || 0),
      seller_payout: parseFloat(item.seller_payout || 0),
      admin_net_profit: parseFloat(item.admin_net_profit || 0),
      product_image: item.product_image,
      attributes: item.attributes
    })),
    seller_breakdown: sellerBreakdownArray,
    financials,
    fulfillment,
    status_history: order.status_history || [],
    shipment_tracking: order.shipments.map(s => ({
      ...s,
      tracking_history: s.tracking_history || []
    })),
    timeline: order.status_history.map(h => ({
      type: 'status_change',
      date: h.created_at,
      description: h.info || `Status changed to ${h.admin_status}`,
      details: { status: h.admin_status }
    })),
    payment: paymentBlock
  };
}

module.exports = {
  getOrderDetails
};