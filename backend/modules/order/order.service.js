const orderModel = require("./order.model");
const productModel = require("../product/product.model");
const pool = require("../../config/db");
const logger = require("../../utils/logger");
const commissionUtil = require("../commission/commission.util");
const commissionService = require("../commission/commission.service");

const checkoutService = require("../checkout/checkout.service");
const cartService = require("../cart/cart.service");
const invoiceService = require("./invoice.service");
const path = require('path');
const notificationService = require("../notification/notification.service");
const smsNotificationService = require("../../services/notificationService");
const rewardCalculatorService = require("../rewards/rewardCalculator.service");
const walletRewardService = require("../wallet/walletReward.service");
const delhiveryService = require("../logistics/delhivery.service");
const logisticsService = require("../logistics/logistics.service");

async function createOrder(userId, orderData, connection = null) {
  console.log("🔥 [OrderService] createOrder called for userId:", userId);
  const { 
    items: bodyItems, 
    shipping_address, 
    address_id,
    session_id, 
    payment_method 
  } = orderData;
  let items = bodyItems;
  let session = null;

  // 1. Resolve Items (Session takes priority)
  if (session_id) {
    session = await checkoutService.getSession(session_id, userId);
    items = session.items; 
  } else if (!items || items.length === 0) {
    throw new Error("Order must contain at least one item (or valid session)");
  }

  console.log("🔥 SESSION:", session);
  console.log("🔥 ORDER DATA:", orderData);

  // 2. Determine order type and validate shipping
  const orderType = session ? session.checkout_kind : 'PHYSICAL'; 
  const addressModel = require("../address/address.model");
  
  // 🔥 FINAL FIX: Strictly use address_id from payload, session, or metadata
  // We check both address_id and shipping_address_id for robustness
  const effectiveAddressId = address_id || orderData.shipping_address_id || session?.address_id || null;
  
  console.log("🔥 SESSION:", session);
  console.log("🔥 ORDER DATA:", orderData);
  console.log("🔥 EFFECTIVE ADDRESS ID:", effectiveAddressId);

  let address = null;
  if (effectiveAddressId) {
    // SECURITY: Use findByIdAndUser (Fix step 3)
    address = await addressModel.findByIdAndUser(effectiveAddressId, userId);
  }
  console.log("🔥 ADDRESS FROM DB:", address);

  if (!address && orderType === 'PHYSICAL') {
    throw new Error("❌ Address not found. address_id is required represented correctly.");
  }

  // Populate Snapshot Fields
  const shippingSnapshot = {};
  if (address) {
    shippingSnapshot.shipping_full_name = address.full_name;
    shippingSnapshot.shipping_phone = address.phone;
    shippingSnapshot.shipping_address_line1 = address.address_line1;
    shippingSnapshot.shipping_address_line2 = address.address_line2 || "";
    shippingSnapshot.shipping_city = address.city;
    shippingSnapshot.shipping_state = address.state;
    shippingSnapshot.shipping_postal_code = address.postal_code;
    shippingSnapshot.shipping_country = address.country || 'India';
  } else if (orderType === 'DIGITAL') {
    // Basic snapshot for digital if no address
    shippingSnapshot.shipping_full_name = "Digital Customer";
    shippingSnapshot.shipping_country = "India";
  }

  // 🔥 STRICT VALIDATION: City/State must exist in the address record
  if (orderType === 'PHYSICAL') {
    if (!shippingSnapshot.shipping_city || !shippingSnapshot.shipping_state || !shippingSnapshot.shipping_postal_code) {
      console.error("❌ INVALID ADDRESS IN DB:", shippingSnapshot);
      throw new Error(`Invalid address record: city, state, or postal_code missing for address_id ${effectiveAddressId}`);
    }
  }

  console.log("ORDER SHIPPING DATA (FINAL):", {
    shipping_address_line1: shippingSnapshot.shipping_address_line1,
    shipping_city: shippingSnapshot.shipping_city,
    shipping_state: shippingSnapshot.shipping_state,
    shipping_postal_code: shippingSnapshot.shipping_postal_code
  });

  // 3. Validate items and prepare order data
  let totalAmount = 0;
  let adminCommissionTotal = 0;
  let adminNetProfitTotal = 0;
  let sellerPayoutTotal = 0;
  const validatedItems = [];

  if (session) {
    // Session items are already validated and have commission data
    for (const item of session.items) {
      // Re-check stock for physical items only
      if (item.format !== 'EBOOK') {
        const product = await productModel.findById(item.product_id);
        if (!product || (!product.is_unlimited_stock && product.stock < item.quantity)) {
          throw new Error(`Insufficient stock for product: ${item.product_id}`);
        }
      }

      validatedItems.push({
        product_id: item.product_id,
        product_title: item.product_title,
        quantity: item.quantity,
        price: item.price,
        seller_id: item.seller_id,
        product_type_code: item.product_type_code,
        format: item.format,
        commission_percentage: item.commission_percentage,
        commission_amount: item.commission_amount,
        seller_payout: item.seller_payout,
        admin_net_profit: item.admin_net_profit,
        // Reward Snapshot
        reward_coins: item.reward_coins || 0,
        reward_rule_id: item.reward_rule_id || null,
        reward_commission_snapshot: item.reward_commission_snapshot || item.commission_percentage || 0
      });

      totalAmount += item.price * item.quantity;
      adminCommissionTotal += item.commission_amount || 0;
      adminNetProfitTotal += item.admin_net_profit || 0;
      sellerPayoutTotal += item.seller_payout || 0;
    }

    // Use session totals if available
    if (session.totals) {
      totalAmount = session.totals.gross_total;
      adminCommissionTotal = session.totals.admin_commission_total;
      adminNetProfitTotal = session.totals.admin_net_profit_total;
      sellerPayoutTotal = session.totals.seller_payout_total;
    }

    // Capture Platform Fee from session
    orderData.platform_fee = session.platform_fee || 0;
  } else {
    // Fallback flow (should be deprecated, but keeping for compatibility)
    const productIds = [...new Set(items.map(i => i.product_id))];
    const products = await productModel.findByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || !product.is_active) {
        throw new Error(`Invalid item: ${item.product_id}`);
      }

      // Only check stock for physical items
      if (product.format !== 'EBOOK' && product.stock < item.quantity) {
        throw new Error(`Insufficient stock: ${item.product_id}`);
      }

      const price = parseFloat(product.selling_price);
      const resolvedFormat = product.format === 'BOTH' ? 'PHYSICAL' : product.format; // Default to PHYSICAL for BOTH in fallback

      const commissionCalc = await commissionService.calculateCommissionAsync({
        product_id: product.id,
        seller_id: product.seller_id,
        price: price,
        quantity: item.quantity,
        product_type_code: product.product_type_code,
        format: resolvedFormat
      });

      validatedItems.push({
        product_id: product.id,
        product_title: product.title,
        quantity: item.quantity,
        price: price,
        seller_id: product.seller_id,
        product_type_code: product.product_type_code,
        format: resolvedFormat,
        commission_percentage: commissionCalc.commission_percentage,
        commission_amount: commissionCalc.commission_amount,
        seller_payout: commissionCalc.seller_payout,
        admin_net_profit: commissionCalc.admin_net_profit,
        is_unlimited_stock: product.is_unlimited_stock,
        // Reward Snapshot for fallback flow
        ...(await rewardCalculatorService.getRewardSnapshot(price, commissionCalc.commission_percentage))
      });

      totalAmount += commissionCalc.gross;
      adminCommissionTotal += commissionCalc.commission_amount;
      adminNetProfitTotal += commissionCalc.admin_net_profit;
      sellerPayoutTotal += commissionCalc.seller_payout;
    }
  }

  // 4. 🔥 Select active warehouse for logistics
  let primaryWarehouseId = null;
  if (orderType === 'PHYSICAL') {
    // Get first physical item to determine seller
    const physicalItem = validatedItems.find(i => i.format !== 'EBOOK');
    if (physicalItem) {
      const seller_id = physicalItem.seller_id;
      const [warehouseRows] = await pool.query(
        `SELECT id FROM seller_warehouses 
         WHERE seller_id = ? AND warehouse_created = 1 
         LIMIT 1`,
        [seller_id]
      );

      const selectedWarehouse = warehouseRows[0];

      if (!selectedWarehouse) {
          throw new Error("No active warehouse found for seller. Please sync warehouse with Delhivery before placing orders.");
      }
      primaryWarehouseId = selectedWarehouse.id;
    }
  }

  // 4. Calculate Final Totals including Rewards
  const couponId = session?.applied_coupon?.id || orderData.coupon_id || null;
  const couponDiscount = session?.coupon_discount || orderData.coupon_discount || 0;
  const coinDiscount = session?.coin_discount || orderData.coin_discount || 0;
  const coinsUsed = session?.applied_coins || orderData.coins_used || 0;
  const shippingCost = orderData.shipping_cost !== undefined
    ? parseFloat(orderData.shipping_cost)
    : (session ? (session.shipping_charge || 0) : 0);

  const shippingMethod = orderData.shipping_method || session?.shipping_method || "Standard Shipping";
  const estDelivery = orderData.estimated_delivery || session?.estimated_delivery || "5-7 days";

  let finalGrandTotal = 0;
  const productSubtotalFromItems = validatedItems.reduce((acc, item) => acc + (parseFloat(item.price) * parseInt(item.quantity)), 0);

  if (!isNaN(totalAmount) && totalAmount > 0) {
    if (Math.abs(totalAmount - productSubtotalFromItems) < 0.01) {
      finalGrandTotal = productSubtotalFromItems + shippingCost;
    } else if (Math.abs(totalAmount - (productSubtotalFromItems + shippingCost)) < 0.01) {
      finalGrandTotal = totalAmount;
    } else {
      logger.warn("Order total discrepancy detected, using calculated fallback", {
        sessionId: session_id,
        totalAmount,
        productSubtotal: productSubtotalFromItems,
        shippingCost
      });
      finalGrandTotal = productSubtotalFromItems + shippingCost;
    }
  } else {
    finalGrandTotal = productSubtotalFromItems + shippingCost;
  }

  finalGrandTotal = Math.max(0, finalGrandTotal - couponDiscount - coinDiscount);

  const rawPaymentMethod = orderData.payment_method || session?.payment_method || 'COD';
  const normalisedPaymentMethod =
    (rawPaymentMethod === 'online' || rawPaymentMethod === 'online_payment' || rawPaymentMethod === 'ONLINE')
      ? 'ONLINE'
      : 'COD';

  const codCharges = session?.cod_charges || 0;
  const shippingMargin = session?.shipping_margin || 0;
  const shippingBaseRate = session?.shipping_base_rate || 0;
  let platformFeeFinal = session?.platform_fee || 0;
  let shippingCostFinal = shippingCost;
  let shippingMarginFinal = shippingMargin;
  let shippingBaseRateFinal = shippingBaseRate;

  // Requirement: if total paid > 1500 then platform fee applied, shipping cost/margin = 0.
  // If <= 1500 platform fee = 0.
  if (finalGrandTotal > 1500) {
      shippingCostFinal = 0;
      shippingMarginFinal = 0;
      shippingBaseRateFinal = 0;
      // platformFee remains as is (applied)
  } else {
      platformFeeFinal = 0;
      // shipping values remain as is
  }

  // Final Net Profit = (Items Commission + COD Charges + Shipping Margin + Platform Fee) - (Coupon + Coins)
  const totalAdminNetProfit = (adminNetProfitTotal + codCharges + shippingMarginFinal + platformFeeFinal) - couponDiscount - coinDiscount;

  const order = await orderModel.create(
    {
      user_id: userId,
      total_payable_amount: finalGrandTotal,
      total_amount: finalGrandTotal,
      shipping_amount: shippingCostFinal,
      shipping_cost: shippingCostFinal,
      subtotal_amount: productSubtotalFromItems,

      // ✅ CRITICAL FIX: Ensure fields are mapped exactly to shipping_*
      shipping_full_name: shippingSnapshot.shipping_full_name,
      shipping_phone: shippingSnapshot.shipping_phone,
      shipping_address_line1: shippingSnapshot.shipping_address_line1,
      shipping_address_line2: shippingSnapshot.shipping_address_line2,
      shipping_city: shippingSnapshot.shipping_city,
      shipping_state: shippingSnapshot.shipping_state,
      shipping_postal_code: shippingSnapshot.shipping_postal_code,
      shipping_country: shippingSnapshot.shipping_country || "India",

      warehouse_id: primaryWarehouseId, // 🔥 Save selected warehouse ID
      order_type: orderType,
      status: 'PENDING', 
      shipping_method: shippingMethod,
      estimated_delivery: estDelivery,
      payment_method: normalisedPaymentMethod,
      payment_status: (normalisedPaymentMethod === 'ONLINE' || normalisedPaymentMethod === 'PREPAID') ? 'PAID' : 'PENDING',
      admin_commission_total: adminCommissionTotal,
      admin_net_profit: totalAdminNetProfit,
      shipping_margin: shippingMarginFinal,
      shipping_base_rate: shippingBaseRateFinal,
      cod_charges: codCharges,
      gateway_fee: platformFeeFinal, // Mapped to gateway_fee for now
      seller_payout_total: sellerPayoutTotal,
      coupon_id: couponId,
      coupon_discount: couponDiscount,
      coin_discount: coinDiscount,
      items_discount: orderData.items_discount || 0
    },
    validatedItems,
    connection
  );

  // LOG STATUS
  await orderModel.addStatusLog(order.id, 'PENDING', "Order placed", connection);

  if (coinsUsed > 0) {
    try {
      const walletService = require("../wallet/wallet.service");
      await walletService.redeemCoins(userId, coinsUsed);
    } catch (redeemErr) {
      logger.error("Wallet coin deduction failed during order creation", { userId, orderId: order.id, error: redeemErr.message });
    }
  }

  if (couponId) {
    try {
      const couponService = require("../coupons/coupon.service");
      await couponService.recordUsage(couponId, userId, order.id);
    } catch (couponErr) {
      logger.error("Coupon usage recording failed", { userId, orderId: order.id, couponId, error: couponErr.message });
    }
  }

  try {
    if (session) {
      try {
        if (connection) {
          await checkoutService.markSessionCompleted(session.id, connection);
        } else {
          const conn = await pool.getConnection();
          try {
            await checkoutService.markSessionCompleted(session.id, conn);
          } finally {
            conn.release();
          }
        }
      } catch (sessionErr) {
        logger.error("Session completion failed", { sessionId: session.id, error: sessionErr.message });
      }

      try {
        const userCart = await cartService.getMyCart(userId);
        if (userCart && userCart.items) {
          for (const sessionItem of items) {
            const cartItem = userCart.items.find(ci => ci.product_id == sessionItem.product_id);
            if (cartItem) {
              await cartService.removeFromCart(userId, cartItem.id);
            }
          }
        }
      } catch (err) {
        logger.warn("Cart cleanup failed", { userId, sessionId: session.id, error: err.message });
      }
    }

    try {
      const invoiceNumber = invoiceService.generateInvoiceNumber(order.id);
      await (connection || pool).query(`UPDATE orders SET invoice_number = ? WHERE id = ?`, [invoiceNumber, order.id]);
      order.invoice_number = invoiceNumber;
      order.status = 'pending';

      try {
        const sellerIds = [...new Set(validatedItems.map(i => i.seller_id))].filter(id => id);
        for (const sId of sellerIds) {
          await notificationService.sendNotification(sId, 'ORDER_PLACED', 'New Order Placed', `New Order #${order.id} has been placed. Please prepare it for shipping.`, 'ORDER', order.id);
        }
      } catch (notifyErr) {
        logger.error("Seller notification failed", { sellerIds, error: notifyErr.message });
      }

      try {
        await notificationService.sendNotification(order.user_id, 'ORDER_CONFIRMED', 'Order Confirmed', '', 'ORDER', order.id);
      } catch (notifyErr) {
        logger.error("Buyer notification failed", { orderId: order.id, error: notifyErr.message });
      }

    } catch (invoiceErr) {
      logger.error("Invoice generation failed", { orderId: order.id, error: invoiceErr.message });
    }

  } catch (err) {
    logger.error("Order post-processing critical failure", { orderId: order.id, error: err.message, stack: err.stack });
    await (connection || pool).query(`UPDATE orders SET status = 'pending' WHERE id = ?`, [order.id]);
    order.status = 'pending';
  }

  return order;
}

async function getMyOrders(userId, filters = {}) {
  return await orderModel.findByUserId(userId, filters);
}

async function getMyEbooks(userId) {
  return await orderModel.findEbooksByUserId(userId);
}

async function getOrderById(orderId, userId, userRole) {
  const order = await orderModel.findById(orderId);
  if (!order) throw new Error("Order not found");

  if (userRole !== "ADMIN" && Number(order.user_id) !== Number(userId)) {
    if (userRole === "SELLER") {
      const isSellerOrder = order.items.some(item => 
        Number(item.seller_id) === Number(userId) || 
        (item.seller_id === null && Number(item.product_seller_id) === Number(userId))
      );
      if (!isSellerOrder) throw new Error("Access denied");
    } else {
      throw new Error("Access denied");
    }
  }
  return order;
}

async function getAllOrders(filters = {}, userRole) {
  if (userRole !== "ADMIN") throw new Error("Access denied. Admin only");
  return await orderModel.findAll(filters);
}

const allowedTransitions = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "RETURNED"],
  COMPLETED: [],
  CANCELLED: [],
  RETURNED: ["COMPLETED"] // Case where RTO is manually marked as completed if needed
};

function isTransitionAllowed(currentStatus, nextStatus) {
  const allowed = allowedTransitions[currentStatus.toUpperCase()];
  return allowed && allowed.includes(nextStatus.toUpperCase());
}


async function updateOrderStatus(orderId, status, userRole, userId = null, connection = null) {
  if (userRole !== "ADMIN" && userRole !== "SELLER") {
    throw new Error("Access denied. Admin or Seller only");
  }

  const normalizedStatus = status.toUpperCase();
  const order = await orderModel.findById(orderId, connection);
  if (!order) throw new Error("Order not found");

  // State Transition Validation
  if (!isTransitionAllowed(order.status, normalizedStatus)) {
    throw new Error(`Invalid status transition: ${order.status} -> ${normalizedStatus}`);
  }

  // Role Logic: Sellers can only update their own orders (logic handled partially below for packing)
  
  // Default status update for others (CONFIRMED, READY_TO_SHIP, etc)
  await orderModel.updateStatus(orderId, normalizedStatus, null, connection);

  const updatedOrder = await orderModel.findById(orderId, connection);

  const getStatusMessage = async (orderId, status) => {
    const productNames = await notificationService.getOrderProductNames(orderId);
    const baseMessages = {
      CONFIRMED: `✅ Your order "${productNames}" has been confirmed.`,
      READY_TO_SHIP: `📦 Your order "${productNames}" has been packed and is ready for shipping.`,
      SHIPPED: `🚚 Your order "${productNames}" has been shipped! It's on its way to you. AWB: ${updatedOrder.awb_number}`,
      IN_TRANSIT: `🚚 Your order "${productNames}" is in transit.`,
      DELIVERED: `✅ Your order "${productNames}" has been delivered. Enjoy your purchase!`,
      CANCELLED: `❌ Your order "${productNames}" has been cancelled.`,
      RTO: `⚠️ Your order "${productNames}" is being returned to seller.`,
    };
    return baseMessages[status.toUpperCase()] || `Your order "${productNames}" status has been updated to ${status}.`;
  };

  if (updatedOrder) {
    try {
      const notificationType = `ORDER_${status}`;
      await notificationService.sendNotification(updatedOrder.user_id, notificationType, 'Order Status Update', '', 'ORDER', orderId);
    } catch (notifyErr) {
      logger.error("Buyer status notification failed", { orderId, status, error: notifyErr.message });
    }
  }

    try {
      await smsNotificationService.sendOrderStatusSMS(updatedOrder.user_id, updatedOrder, normalizedStatus);
    } catch (smsErr) {
      logger.error("Buyer status SMS failed", { orderId, status: normalizedStatus, error: smsErr.message });
    }
    
  if (status === 'DELIVERED') {
    try {
      await walletRewardService.creditOrderRewards(orderId, updatedOrder.user_id);
    } catch (rewardErr) {
      logger.error("Failed to credit reward coins after delivery", { orderId, error: rewardErr.message });
    }
    try {
      await pool.query(`UPDATE orders SET payment_status = 'PAID' WHERE id = ? AND payment_method = 'COD' AND payment_status != 'PAID'`, [orderId]);
    } catch (codErr) {
      logger.error("Failed to update COD payment_status on delivery", { orderId, error: codErr.message });
    }
  }

  return updatedOrder;
}

async function cancelOrder(orderId, userId, userRole) {
  const order = await orderModel.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (userRole !== "ADMIN" && order.user_id !== userId) throw new Error("Access denied");
  if (order.status === "DELIVERED") throw new Error("Cannot cancel a delivered order");

  if (order.status === "shipped") {
    logger.info(`Order ${orderId} is already shipped. Marking as RTO.`);
    await pool.query("UPDATE orders SET status = 'shipped', shipment_status = 'RTO_INITIATED' WHERE id = ?", [orderId]);
    return await orderModel.findById(orderId);
  }

  if (order.status === "CONFIRMED") {
    logger.info(`Order ${orderId} is confirmed and possibly ready for shipping. Checking logistics.`);
  }

  if (order.status === "cancelled") throw new Error("Order is already cancelled");

  // 🔥 LOGISTICS SYNC: Centralized cancellation for all shipments
  try {
    await logisticsService.cancelOrderShipment(orderId);
    logger.info(`Logistics sync completed for cancelled order ${orderId}`);
  } catch (logErr) {
    logger.error(`Logistics cancellation failed for order ${orderId}`, { error: logErr.message });
    // We continue with DB cancellation even if API call fails
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of order.items) {
      if (item.format !== "EBOOK") {
        await connection.execute(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.quantity, item.product_id]);
      }
    }
    await connection.execute(`UPDATE orders SET status = 'cancelled', shipment_status = 'CANCELLED', invoice_url = NULL WHERE id = ?`, [orderId]);
    await connection.commit();
    return await orderModel.findById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrderStats(userRole) {
  if (userRole !== "ADMIN") throw new Error("Access denied. Admin only");
  return await orderModel.getOrderStats();
}

async function updateInvoiceUrl(orderId, url) {
  await pool.query(`UPDATE orders SET invoice_url = ? WHERE id = ?`, [url, orderId]);
}

async function requestReturn(orderId, userId, reason, bankDetails = {}) {
  const order = await getOrderById(orderId, userId, 'USER');
  
  if (order.status !== 'DELIVERED') {
    throw new Error("Only delivered orders can be returned");
  }

  // 7-Day Return Window Enforcement
  const deliveryDate = order.delivered_date || (order.shipments && order.shipments[0]?.delivered_date) || order.updated_at;
  if (deliveryDate) {
    const deliveryTime = new Date(deliveryDate).getTime();
    const currentTime = new Date().getTime();
    const diffDays = (currentTime - deliveryTime) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 7) {
      throw new Error("Return window has expired. Returns are only allowed within 7 days of delivery.");
    }
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error("Please provide a valid reason for the return (minimum 5 characters).");
  }

  const [existing] = await pool.query("SELECT id FROM order_returns WHERE order_id = ?", [orderId]);
  if (existing.length > 0) throw new Error("Return has already been requested for this order");

  const logisticsProvider = require("../logistics/logistics.provider");
  try {
    if (typeof logisticsProvider.createReversePickup === 'function') {
      await logisticsProvider.createReversePickup(order);
    }
    await pool.query(`UPDATE orders SET status = 'RETURN_REQUESTED', return_status = 'RETURN_REQUESTED' WHERE id = ?`, [orderId]);
  } catch (err) {
    logger.error("Failed to schedule reverse pickup", { error: err.message, stack: err.stack });
    throw new Error(`Failed to schedule reverse pickup: ${err.message}`);
  }

  await orderModel.updateReturnStatus(orderId, 'RETURN_REQUESTED', 'Return initiated by user');
  return await orderModel.createReturnRequest({ order_id: orderId, user_id: userId, reason, ...bankDetails });
}

async function getReturnRequests(filters = {}) {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const returns = await orderModel.findAllReturnRequests({ ...filters, limit, offset });
  const totalItems = await orderModel.countReturnRequests(filters);
  const totalPages = Math.ceil(totalItems / limit);

  return { data: returns, pagination: { totalItems, totalPages, currentPage: page, limit } };
}

async function updateReturnStatus(orderId, status, adminRemarks) {
  // Sync Status with 8-stage lifecycle
  // 1. RETURN_REQUESTED
  // 2. RETURN_APPROVED
  // 3. PICKUP_SCHEDULED
  // 4. IN_TRANSIT
  // 5. RTO_COMPLETED
  // 6. REFUND_PENDING
  // 7. REFUND_PROCESSING
  // 8. REFUND_SETTLED

  let finalStatus = status;
  let triggerRefund = false;

  if (status === 'RTO_COMPLETED') {
    finalStatus = 'REFUND_PENDING';
    triggerRefund = true;
  }

  const result = await orderModel.updateReturnStatus(orderId, finalStatus, adminRemarks, finalStatus);
  
  if (triggerRefund || finalStatus === 'REFUND_PENDING') {
    try {
      const refundService = require("../payment/refund.service");
      // Trigger processing
      await orderModel.updateReturnStatus(orderId, 'REFUND_PROCESSING', 'Automated refund initiated');
      await refundService.processRefund(orderId);
      logger.info(`Refund processed for order ${orderId}`);
    } catch (err) {
      logger.error(`Refund failed for order ${orderId}`, { error: err.message });
      await orderModel.updateReturnStatus(orderId, 'REFUND_FAILED', `Refund failed: ${err.message}`);
    }
  }
  
  return result;
}

module.exports = {
  createOrder,
  getMyOrders,
  getMyEbooks,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  updateInvoiceUrl,
  requestReturn,
  getReturnRequests,
  updateReturnStatus
};
