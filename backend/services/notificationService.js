const { sendWithRetry } = require("./smsService");
const templates = require("../config/smsTemplates");
const db = require("../config/db");
const logger = require("../utils/logger");
const notificationService = require("../modules/notification/notification.service");

/**
 * Utility: Fetch user phone and name from DB by userId if not directly available.
 */
async function getUserDetails(userId) {
  try {
    const [rows] = await db.query(
      "SELECT id, name, phone FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    return rows[0] || null;
  } catch (e) {
    logger.warn("Failed to fetch user for SMS", { userId, error: e.message });
    return null;
  }
}

/**
 * OTP SMS
 */
const sendOtpSMS = async (phone, otp, userId = null, purpose = 'REGISTRATION') => {
  // Select correct template based on purpose
  const isReset = purpose === 'PASSWORD_RESET' || purpose === 'RESET_OTP' || purpose === 'PASSWORD_RESET_OTP';
  const isChange = purpose === 'CHANGE_PASSWORD' || purpose === 'ADD_PASSWORD';
  
  const templateId = isReset ? templates.PASSWORD_RESET : templates.OTP;
  
  // eventType must match keys in config/smsTemplateStrings.js
  let eventType = 'OTP';
  if (isReset) eventType = 'PASSWORD_RESET';
  else if (isChange) eventType = 'PASSWORD_RESET'; // fallback to reset template for all security codes if special ones not available
  
  const result = await sendWithRetry({
    phone,
    templateId: templateId,
    variables: { OTP: otp },
    eventType: eventType
  });

  // Optional: Sync OTP attempt to system notifications if userId is known
  if (userId) {
    await notificationService.sendNotification(
      userId,
      'SYSTEM',
      isReset ? 'Password Reset Code' : 'Security Code Sent',
      `An OTP has been sent to your registered mobile number ${phone.slice(-4).padStart(phone.length, '*')}.`,
      'SYSTEM',
      null
    ).catch(e => logger.warn("Failed to sync OTP notification", { userId, error: e.message }));
  }

  return result;
};

/**
 * Order Placed SMS
 */
const sendOrderPlacedSMS = async (userId, orderId, amount) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  // 1. Send SMS
  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.ORDER_PLACED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
      AMOUNT: String(amount),
      LINK: `${process.env.FRONTEND_URL}/profile/orders/${orderId}`,
    },
    orderId,
    eventType: "ORDER_PLACED",
  });

  // 2. Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'ORDER_CONFIRMED',
    'Order Confirmed!',
    `🎉 Your order #${orderId} for ₹${amount} has been successfully placed. SMS sent to ${user.phone}.`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for ORDER_PLACED", { orderId, error: e.message }));

  return result;
};

/**
 * Order Shipped SMS
 */
const sendOrderShippedSMS = async (userId, orderId) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.ORDER_SHIPPED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
      TRACKING_LINK: `${process.env.DELHIVERY_TRACKING_URL || 'https://www.delhivery.com/track/package/'}${orderId}`,
    },
    orderId,
    eventType: "ORDER_SHIPPED",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'ORDER_SHIPPED',
    'Order Shipped!',
    `🚚 Great news! Order #${orderId} has been shipped and is on its way.`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for ORDER_SHIPPED", { orderId, error: e.message }));

  return result;
};

/**
 * Out for Delivery SMS
 */
const sendOutForDeliverySMS = async (userId, orderId, amount = "____") => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.OUT_FOR_DELIVERY,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
      AMOUNT: String(amount),
    },
    orderId,
    eventType: "OUT_FOR_DELIVERY",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'ORDER_OUT_FOR_DELIVERY',
    'Out for Delivery!',
    `🏃 Your order #${orderId} is out for delivery today!`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for OUT_FOR_DELIVERY", { orderId, error: e.message }));

  return result;
};

/**
 * Order Delivered SMS
 */
const sendDeliveredSMS = async (userId, orderId) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.DELIVERED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
    },
    orderId,
    eventType: "DELIVERED",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'ORDER_DELIVERED',
    'Order Delivered!',
    `✅ Your order #${orderId} has been successfully delivered. Enjoy your books!`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for DELIVERED", { orderId, error: e.message }));

  return result;
};

/**
 * Return Request Received SMS
 */
const sendReturnRequestSMS = async (userId, orderId) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.RETURN_REQUEST,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
    },
    orderId,
    eventType: "RETURN_REQUEST",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'ORDER_RETURN_REQUEST',
    'Return Requested',
    `🔄 We've received your return request for order #${orderId}. We will review it shortly.`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for RETURN_REQUEST", { orderId, error: e.message }));

  return result;
};

/**
 * Return Approved SMS
 */
const sendReturnApprovedSMS = async (userId, orderId) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.RETURN_APPROVED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
    },
    orderId,
    eventType: "RETURN_APPROVED",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'ORDER_RETURN_APPROVED',
    'Return Approved',
    `✅ Your return request for order #${orderId} has been approved.`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for RETURN_APPROVED", { orderId, error: e.message }));

  return result;
};

/**
 * Return Rejected SMS
 */
const sendReturnRejectedSMS = async (userId, orderId, reason) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.RETURN_REJECTED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
      REASON: reason || "Quality check policy",
    },
    orderId,
    eventType: "RETURN_REJECTED",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'ORDER_RETURN_REJECTED',
    'Return Rejected',
    `❌ Your return request for order #${orderId} was rejected. Reason: ${reason}`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for RETURN_REJECTED", { orderId, error: e.message }));

  return result;
};

/**
 * Refund Initiated SMS
 */
const sendRefundInitiatedSMS = async (userId, orderId, amount) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.REFUND_INITIATED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
      AMOUNT: String(amount),
    },
    orderId,
    eventType: "REFUND_INITIATED",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'REFUND_INITIATED',
    'Refund Processing',
    `💰 A refund of ₹${amount} for order #${orderId} has been initiated.`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for REFUND_INITIATED", { orderId, error: e.message }));

  return result;
};

/**
 * Refund Completed (Settled) SMS
 */
const sendRefundCompletedSMS = async (userId, orderId, amount) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.REFUND_COMPLETED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
      AMOUNT: String(amount),
    },
    orderId,
    eventType: "REFUND_COMPLETED",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'REFUND_SETTLED',
    'Refund Completed',
    `✅ Your refund of ₹${amount} for order #${orderId} has been successfully settled to your account.`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for REFUND_COMPLETED", { orderId, error: e.message }));

  return result;
};

/**
 * Payment Failed SMS
 */
const sendPaymentFailedSMS = async (userId, orderId) => {
  const user = await getUserDetails(userId);
  if (!user?.phone) return;

  const result = await sendWithRetry({
    phone: user.phone,
    templateId: templates.PAYMENT_FAILED,
    variables: {
      NAME: user.name || "Customer",
      ORDER_ID: String(orderId),
      PAYMENT_LINK: `${process.env.FRONTEND_URL}/checkout/retry/${orderId}`,
    },
    orderId,
    eventType: "PAYMENT_FAILED",
  });

  // Sync with Web Notification
  await notificationService.sendNotification(
    userId,
    'PAYMENT_FAILED',
    'Payment Failed',
    `⚠️ Payment for your order #${orderId} failed. Please retry to avoid cancellation.`,
    'ORDER',
    orderId
  ).catch(e => logger.warn("Failed to sync web notification for PAYMENT_FAILED", { orderId, error: e.message }));

  return result;
};

module.exports = {
  sendOtpSMS,
  sendOrderPlacedSMS,
  sendOrderShippedSMS,
  sendOutForDeliverySMS,
  sendDeliveredSMS,
  sendReturnRequestSMS,
  sendReturnApprovedSMS,
  sendReturnRejectedSMS,
  sendRefundInitiatedSMS,
  sendRefundCompletedSMS,
  sendPaymentFailedSMS,
};