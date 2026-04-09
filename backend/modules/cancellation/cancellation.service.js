const cancellationModel = require("./cancellation.model");
const orderModel = require("../order/order.model");
const pool = require("../../config/db");

async function requestCancellation(userId, data) {
  const { order_id, reason } = data;

  const order = await orderModel.findById(order_id);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.user_id !== userId) {
    throw new Error("You can cancel only your own order");
  }

  const cancellableStatuses = [
    "PLACED",
    "CONFIRMED",
    "PROCESSING"
  ];

  const orderStatus = order.status.toUpperCase();

  if (!cancellableStatuses.includes(orderStatus)) {
    throw new Error(`Order cannot be cancelled once it is ${order.status}`);
  }

  const existing = await cancellationModel.findByOrderId(order_id);

  if (existing.find(c => c.status === "PENDING")) {
    throw new Error("Cancellation already requested");
  }

  const cancellation = await cancellationModel.create({
    order_id,
    reason,
    requested_by: userId
  });

  // mark order
  await pool.execute(
    `UPDATE orders SET status = 'CANCELLATION_REQUESTED' WHERE id = ?`,
    [order_id]
  );

  return cancellation;
}

async function getMyCancellations(userId) {
  return await cancellationModel.findByUserId(userId);
}

async function getCancellationById(cancellationId, userId, userRole) {
  const cancellation = await cancellationModel.findById(cancellationId);

  if (!cancellation) {
    throw new Error("Cancellation not found");
  }

  if (userRole !== "ADMIN" && cancellation.requested_by !== userId) {
    throw new Error("Access denied");
  }

  return cancellation;
}

async function getAllCancellations(filters = {}, userRole) {
  if (userRole !== "ADMIN") {
    throw new Error("Access denied. Admin only");
  }

  return await cancellationModel.findAll(filters);
}

async function updateCancellationStatus(
  cancellationId,
  status,
  processedBy,
  userRole
) {
  if (userRole !== "ADMIN") {
    throw new Error("Access denied. Admin only");
  }

  const cancellation = await cancellationModel.findById(cancellationId);
  if (!cancellation) {
    throw new Error("Cancellation not found");
  }

  if (cancellation.status !== "PENDING") {
    throw new Error(
      `Cannot update cancellation. Current status: ${cancellation.status}`
    );
  }

  const validStatuses = ["APPROVED", "REJECTED"];
  if (!validStatuses.includes(status)) {
    throw new Error(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // 🚫 Prevent approval if order already shipped
  if (
    ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
      cancellation.order_status
    )
  ) {
    throw new Error(
      `Cannot approve cancellation. Order already ${cancellation.order_status}`
    );
  }

  if (status === "APPROVED") {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await cancellationModel.updateStatus(
        cancellationId,
        "APPROVED",
        processedBy
      );

      const order = await orderModel.findById(cancellation.order_id);

      if (order && order.items) {
        // 🔥 LOGISTICS SYNC: Try to cancel shipment in Delhivery if any
        try {
          const logisticsService = require("../logistics/logistics.service");
          await logisticsService.cancelOrderShipment(cancellation.order_id);
          logger.info(`Synchronized logistics cancellation for order ${cancellation.order_id}`);
        } catch (logErr) {
          logger.error(`Logistics cancellation sync failed for order ${cancellation.order_id}`, { error: logErr.message });
          // We continue anyway as the server-side cancellation is more important
        }

        // Restore stock for physical items
        for (const item of order.items) {
          if (item.format !== "EBOOK") {
            await connection.execute(
              `UPDATE products SET stock = stock + ? WHERE id = ?`,
              [item.quantity, item.product_id]
            );
          }
        }

        // Cancel the order
        await connection.execute(
          `UPDATE orders SET status = 'CANCELLED' WHERE id = ?`,
          [cancellation.order_id]
        );

        // Auto Refund Integration
        const paymentService = require("../payment/payment.service");
        const orderPaymentId = order.payment?.gateway_transaction_id;

        if (orderPaymentId && order.payment?.gateway === 'PAYU') {
          try {
            await paymentService.initiatePayURefund({
              payu_payment_id: orderPaymentId,
              amount: order.total_amount,
              refund_id: `CANCEL_${order.id}_${Date.now()}`
            });
            logger.info(`Auto-refund initiated for cancelled order ${order.id}`);
          } catch (refundErr) {
            logger.error(`Auto-refund failed for cancelled order ${order.id}`, { error: refundErr.message });
            // We don't rollback if refund fails, but we should log it.
          }
        }
      }

      await cancellationModel.updateStatus(
        cancellationId,
        "PROCESSED",
        processedBy
      );

      await connection.commit();
      return await cancellationModel.findById(cancellationId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // If rejected
  return await cancellationModel.updateStatus(
    cancellationId,
    "REJECTED",
    processedBy
  );
}

async function getCancellationStats(userId = null, userRole = null) {
  if (userId && userRole !== "ADMIN") {
    return await cancellationModel.getStats(userId);
  }

  if (userRole === "ADMIN") {
    return await cancellationModel.getStats();
  }

  throw new Error("Access denied");
}

module.exports = {
  requestCancellation,
  getMyCancellations,
  getCancellationById,
  getAllCancellations,
  updateCancellationStatus,
  getCancellationStats,
};