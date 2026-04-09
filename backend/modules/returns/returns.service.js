const pool = require("../../config/db");
const logger = require("../../utils/logger");
const encryption = require("../../utils/encryption");
const notificationService = require("../notification/notification.service");
const smsNotificationService = require("../../services/notificationService");

const VALID_TRANSITIONS = {
  RETURN_REQUESTED: ['RETURN_APPROVED', 'REJECTED'],
  RETURN_APPROVED: ['PICKUP_SCHEDULED', 'REJECTED'],
  PICKUP_SCHEDULED: ['IN_TRANSIT'],
  IN_TRANSIT: ['RTO_COMPLETED'],
  RTO_COMPLETED: ['pending'],
  pending: ['processing'],
  processing: ['settled', 'failed'],
  failed: ['processing', 'retrying'],
  retrying: ['settled', 'failed']
};

const statusLabels = {
  'RETURN_REQUESTED': 'Return Requested',
  'RETURN_APPROVED': 'Return Approved',
  'REJECTED': 'Return Rejected',
  'PICKUP_SCHEDULED': 'Pickup Scheduled',
  'IN_TRANSIT': 'In Transit (Return)',
  'RTO_COMPLETED': 'Return Received',
  'pending': 'Refund Pending',
  'processing': 'Refund Processing',
  'settled': 'Refund Settled',
  'failed': 'Refund Failed'
};

function validateTransition(current, next) {
  if (!VALID_TRANSITIONS[current]?.includes(next)) {
    throw new Error(`Invalid status transition: ${current} → ${next}`);
  }
}

async function createReturnRequest(orderId, userId, returnData) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verify order & ownership
    const [orderRows] = await connection.query(
      `SELECT id, status FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (orderRows.length === 0) {
      throw new Error("Order not found or access denied");
    }

    const orderStatus = orderRows[0].status;

    // 🚫 Return allowed ONLY if delivered
    if (orderStatus !== "DELIVERED") {
      throw new Error(
        "Return can only be initiated after order is delivered"
      );
    }

    // 🕒 STEP 1: 7-Day Return Validation
    const [shipmentRows] = await connection.query(
      `SELECT delivered_date FROM logistics_shipments WHERE order_id = ? AND admin_status = 'DELIVERED' LIMIT 1`,
      [orderId]
    );

    if (shipmentRows.length === 0 || !shipmentRows[0].delivered_date) {
      throw new Error("Delivery information not found for this order");
    }

    const deliveredAt = new Date(shipmentRows[0].delivered_date);
    const now = new Date();
    const diffDays = (now - deliveredAt) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      throw new Error("Return window expired (Max 7 days from delivery)");
    }

    // Check if already cancelled
    if (orderStatus === "CANCELLED") {
      throw new Error("Cannot return a cancelled order");
    }

    // Check if return already exists
    const [existingReturn] = await connection.query(
      `SELECT id FROM returns WHERE order_id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (existingReturn.length > 0) {
      throw new Error(
        "Return request already exists for this order"
      );
    }

    const [result] = await connection.query(
      `INSERT INTO returns (
        order_id,
        user_id,
        reason,
        refund_type,
        status,
        images,
        admin_notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        orderId,
        userId,
        returnData.reason,
        returnData.refund_type || "refund",
        "RETURN_REQUESTED",
        returnData.images ? JSON.stringify(returnData.images) : null,
        null,
      ]
    );

    const returnId = result.insertId;

    // bank details logic... (rest unchanged)
    if (returnData.bank_details) {
      const { account_number, ifsc_code, account_holder_name, bank_name } = returnData.bank_details;

      if (!account_number || !ifsc_code || !account_holder_name) {
        throw new Error("Incomplete bank details (account number, IFSC, and holder name required)");
      }

      const encryptedAccountNumber = encryption.encrypt(account_number);

      await connection.query(
        `INSERT INTO user_bank_details (user_id, account_number, ifsc_code, account_holder_name, bank_name)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         account_number = VALUES(account_number),
         ifsc_code = VALUES(ifsc_code),
         account_holder_name = VALUES(account_holder_name),
         bank_name = VALUES(bank_name)`,
        [userId, encryptedAccountNumber, ifsc_code, account_holder_name, bank_name]
      );
    }

    // Update order status
    await connection.query(
      `UPDATE orders SET status = 'RETURN_REQUESTED' WHERE id = ?`,
      [orderId]
    );

    // 📲 SMS Trigger
    smsNotificationService.sendReturnRequestSMS(userId, orderId).catch((err) => {
        logger.error("Failed to send return request SMS", { userId, orderId, error: err.message });
    });

    await connection.commit();
    return returnId;
  } catch (error) {
    await connection.rollback();
    logger.error("Create return request failed", {
      orderId,
      userId,
      error: error.message,
    });
    throw error;
  } finally {
    connection.release();
  }
}

async function getUserReturns(userId, filters = {}) {
  const connection = await pool.getConnection();

  try {
    let query = `
      SELECT r.*, o.total_payable_amount as total_amount, o.status as order_status,
             o.created_at as order_date
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      WHERE r.user_id = ?
    `;

    const params = [userId];

    if (filters.status) {
      query += ` AND r.status = ?`;
      params.push(filters.status);
    }

    query += ` ORDER BY r.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(filters.limit, filters.offset || 0);
    }

    const [returns] = await connection.query(query, params);
    return returns;
  } catch (error) {
    logger.error("Get user returns failed", {
      userId,
      error: error.message,
    });
    throw error;
  } finally {
    connection.release();
  }
}

async function updateReturnStatus(
  returnId,
  status,
  adminNotes,
  adminId
) {
  const connection = await pool.getConnection();

  try {
    // 🔒 Concurrency Protection: Row Locking
    const [currentRows] = await connection.query(
      `SELECT status, user_id FROM returns WHERE id = ? FOR UPDATE`,
      [returnId]
    );

    if (currentRows.length === 0) {
      throw new Error("Return request not found");
    }

    const currentStatus = currentRows[0].status;
    const userId = currentRows[0].user_id;

    // 🚦 Transition Validation
    validateTransition(currentStatus, status);

    const [result] = await connection.query(
      `UPDATE returns 
       SET status = ?, admin_notes = ?, admin_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, adminNotes, adminId, returnId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Return request not found");
    }

    // Synchronize order status
    const [orderRows] = await connection.query(
      `SELECT o.id, 
              o.total_payable_amount as total_amount
       FROM orders o 
       JOIN returns r ON o.id = r.order_id 
       WHERE r.id = ?`,
      [returnId]
    );

    if (orderRows.length > 0) {
      const orderId = orderRows[0].id;
      const totalAmount = orderRows[0].total_amount;

      // Update order status if the return status is one of the return lifecycle statuses
      if (['RETURN_APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RTO_COMPLETED', 'pending', 'processing', 'settled'].includes(status)) {
        await connection.query(
          `UPDATE orders SET status = ? WHERE id = ?`,
          [status, orderId]
        );
      }

      // 🛠️ Update Refund Table Status and Timestamps
      if (['processing', 'settled', 'failed'].includes(status)) {
          let updateFields = 'status = ?, updated_at = NOW()';
          let params = [status, returnId];

          if (status === 'processing') {
              updateFields += ', refund_initiated_at = NOW()';
          } else if (status === 'settled') {
              updateFields += ', refund_settled_at = NOW()';
          }

          await connection.query(
              `UPDATE refunds SET ${updateFields} WHERE return_id = ?`,
              params
          );
      }

      // Auto-trigger Reverse Pickup when PICKUP_SCHEDULED
      if (status === "PICKUP_SCHEDULED") {
        const orderModel = require("../order/order.model");
        const delhiveryService = require("../logistics/delhivery.service");
        const order = await orderModel.findById(orderId, connection);

        if (order) {
          try {
            const rvpResponse = await delhiveryService.createReversePickup(order);
            const rvpPkg = rvpResponse?.packages?.[0] || rvpResponse?.data?.packages?.[0];

            if (rvpPkg && rvpPkg.waybill) {
              await connection.query(
                `UPDATE returns SET awb_number = ?, reverse_pickup_id = ?, tracking_url = ? WHERE id = ?`,
                [
                  rvpPkg.waybill,
                  rvpPkg.client_fl_id || rvpPkg.upload_wbn,
                  `https://www.delhivery.com/track/package/${rvpPkg.waybill}`,
                  returnId
                ]
              );
              logger.info(`Reverse pickup created for return ${returnId}, AWB: ${rvpPkg.waybill}`);
            }
          } catch (rvpErr) {
            logger.error(`Reverse pickup creation failed for return ${returnId}`, { error: rvpErr.message });
          }
        }
      }

      // 🔧 STEP 4: Initiate Refund Entry on RTO_COMPLETED (IDEMPOTENT)
      if (status === "RTO_COMPLETED") {
        const [existingRefund] = await connection.query(
          `SELECT id FROM refunds WHERE return_id = ?`, [returnId]
        );

        if (existingRefund.length === 0) {
          const expectedSettlement = new Date();
          expectedSettlement.setDate(expectedSettlement.getDate() + 15);

          await connection.query(
            `INSERT INTO refunds (return_id, order_id, user_id, amount, status, rto_completed_at, expected_settlement)
             VALUES (?, ?, ?, ?, 'pending', NOW(), ?)`,
            [returnId, orderId, userId, totalAmount, expectedSettlement]
          );
          logger.info(`Refund pending entry created for return ${returnId}. SLA: ${expectedSettlement.toISOString().split('T')[0]}`);
        } else {
            logger.info(`Idempotency: Refund entry already exists for return ${returnId}`);
        }
      }

      if (statusLabels[status]) {
          await notificationService.sendNotification(
              userId,
              'ORDER',
              'Return Update',
              `${statusLabels[status]} for Order #${orderId}`,
              'ORDER',
              orderId
          );

          // 📲 SMS Triggers
          if (status === 'RETURN_APPROVED') {
              smsNotificationService.sendReturnApprovedSMS(userId, orderId).catch(() => {});
          } else if (status === 'REJECTED') {
              smsNotificationService.sendReturnRejectedSMS(userId, orderId).catch(() => {});
          } else if (status === 'REFUND_SETTLED' || status === 'settled') {
              // Note: refund.service handles settled SMS, but we can add a fallback here if needed
          }
      }
    }

    const auditService = require("../audit/audit.service");
    await auditService.logAction({
      action: "UPDATE_RETURN",
      module: "ORDER",
      entityType: "RETURN",
      entityId: returnId,
      performedBy: adminId,
      newValues: { status, adminNotes }
    });

    await connection.commit();
    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    logger.error("Update return status failed", {
      returnId,
      status,
      adminId,
      error: error.message,
    });
    throw error;
  } finally {
    connection.release();
  }
}

async function getReturnAnalytics(filters = {}) {
  const connection = await pool.getConnection();

  try {
    const [analytics] = await connection.query(`
      SELECT 
        COUNT(*) as total_returns,
        COUNT(CASE WHEN status = 'RETURN_REQUESTED' THEN 1 END) as pending_returns,
        COUNT(CASE WHEN status = 'RETURN_APPROVED' THEN 1 END) as approved_returns,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_returns,
        COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as completed_returns,
        SUM(CASE WHEN status = 'REFUNDED' THEN o.total_payable_amount ELSE 0 END) as total_refunded
      FROM returns r
      JOIN orders o ON r.order_id = o.id
    `);

    return analytics[0];
  } catch (error) {
    logger.error("Get return analytics failed", {
      error: error.message,
    });
    throw error;
  } finally {
    connection.release();
  }
}

async function getAllReturns(filters = {}) {
  const connection = await pool.getConnection();

  try {
    let query = `
      SELECT r.*, o.total_payable_amount as total_amount, u.name as user_name, u.email as user_email,
             bd.account_number, bd.ifsc_code, bd.account_holder_name, bd.bank_name
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN user_bank_details bd ON r.user_id = bd.user_id
    `;

    const params = [];
    const whereConditions = [];

    if (filters.status) {
      whereConditions.push(`r.status = ?`);
      params.push(filters.status);
    }

    if (filters.order_id) {
        whereConditions.push(`r.order_id = ?`);
        params.push(filters.order_id);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ');
    }

    query += ` ORDER BY r.created_at DESC`;

    const limit = parseInt(filters.limit) || 20;
    const offset = parseInt(filters.offset) || 0;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [returns] = await connection.query(query, params);

    // Decrypt bank details for admin view
    return returns.map(item => {
        if (item.account_number) {
            try {
                item.account_number = encryption.decrypt(item.account_number);
            } catch (e) {
                logger.warn(`Failed to decrypt account number for return ${item.id}`, { error: e.message });
            }
        }
        return item;
    });
  } catch (error) {
    logger.error("Get all returns failed", { error: error.message });
    throw error;
  } finally {
    connection.release();
  }
}

async function getUserRefunds(rawUserId, filters = {}) {
    const connection = await pool.getConnection();
    try {
        const userId = Number(rawUserId);
        let query = `
            SELECT 
                ret.id as return_id,
                r.id as refund_id,
                o.id as order_id,
                o.invoice_number,
                COALESCE(r.amount, o.total_payable_amount) as amount,
                o.total_payable_amount as original_amount,
                COALESCE(r.status, ret.status) as status,
                COALESCE(ret.reason, r.reason) as reason,
                ret.created_at as created_at,
                COALESCE(r.updated_at, ret.updated_at) as updated_at,
                r.expected_settlement,
                r.refund_initiated_at,
                r.refund_settled_at,
                r.rto_completed_at,
                r.gateway_refund_id
            FROM returns ret
            JOIN orders o ON ret.order_id = o.id
            LEFT JOIN refunds r ON ret.id = r.return_id
            WHERE ret.user_id = ?

            UNION

            SELECT 
                null as return_id,
                r.id as refund_id,
                o.id as order_id,
                o.invoice_number,
                r.amount as amount,
                o.total_payable_amount as original_amount,
                r.status as status,
                r.reason as reason,
                r.created_at as created_at,
                r.updated_at as updated_at,
                r.expected_settlement,
                r.refund_initiated_at,
                r.refund_settled_at,
                r.rto_completed_at,
                r.gateway_refund_id
            FROM refunds r
            JOIN orders o ON r.order_id = o.id
            WHERE r.user_id = ? AND r.return_id IS NULL
        `;
        const params = [userId, userId];

        // Apply filters (need to be careful with UNION)
        // For simplicity and correctness, we wrap the UNION in a subquery
        let finalQuery = `SELECT * FROM (${query}) as settlements WHERE 1=1`;
        const finalParams = [userId, userId];

        if (filters.status && filters.status !== 'all') {
            finalQuery += ` AND status = ?`;
            finalParams.push(filters.status);
        }

        if (filters.type && filters.type !== 'all') {
            if (filters.type.toLowerCase() === 'return') {
                finalQuery += ` AND return_id IS NOT NULL`;
            } else if (filters.type.toLowerCase() === 'cancellation') {
                finalQuery += ` AND return_id IS NULL`;
            }
        }

        finalQuery += ` ORDER BY created_at DESC`;

        // Pagination
        const limit = parseInt(filters.limit) || 10;
        const page = parseInt(filters.page) || 1;
        const offset = (page - 1) * limit;

        finalQuery += ` LIMIT ? OFFSET ?`;
        finalParams.push(limit, offset);

        const [settlements] = await connection.query(finalQuery, finalParams);
        
        // Get total count
        let countQuery = `
            SELECT COUNT(*) as count FROM (
                SELECT ret.id FROM returns ret WHERE ret.user_id = ?
                UNION
                SELECT r.id FROM refunds r WHERE r.user_id = ? AND r.return_id IS NULL
            ) as total
        `;
        const [countResult] = await connection.query(countQuery, [userId, userId]);
        const totalCount = countResult[0].count;

        return {
            items: settlements,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        };
    } catch (error) {
        logger.error("Get user refunds failed", { userId, error: error.message });
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
  createReturnRequest,
  getUserReturns,
  updateReturnStatus,
  getReturnAnalytics,
  getAllReturns,
  getUserRefunds
};