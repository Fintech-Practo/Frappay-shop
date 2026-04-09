const db = require("../../config/db");
const crypto = require('crypto');
const axios = require('axios');
const env = require("../../config/env");
const logger = require("../../utils/logger");
const { sendRefundInitiatedSMS, sendRefundCompletedSMS } = require("../../services/notificationService");

async function processRefund(orderId) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Idempotency Check & Selection
        const [refundRows] = await connection.query(
            "SELECT id, status, amount FROM refunds WHERE order_id = ? AND status != 'settled' FOR UPDATE",
            [orderId]
        );

        if (!refundRows.length) {
            logger.info(`Refund processing skipped: No active/pending refund record for order ${orderId}`);
            await connection.rollback();
            return;
        }

        const refundRecord = refundRows[0];

        const [rows] = await connection.query(
            "SELECT id as order_id, total_payable_amount as total_amount, payment_method, (SELECT gateway_transaction_id FROM payment_transactions WHERE order_id = ? AND status = 'SUCCESS' AND gateway = 'PAYU' LIMIT 1) as mihpayid, (SELECT payment_session_id FROM payment_transactions WHERE order_id = ? AND status = 'SUCCESS' AND gateway = 'PAYU' LIMIT 1) as txnid FROM orders WHERE id = ?",
            [orderId, orderId, orderId]
        );

        if (!rows.length) {
            throw new Error(`Order ${orderId} not found during refund processing`);
        }

        const order = rows[0];

        // 2. Gateway / Method Logic
        if (order.payment_method === 'COD') {
            const refundId = `COD_REF_${Date.now()}`;
            
            await connection.query(
                `UPDATE orders 
                 SET refund_status = 'REFUND_SETTLED',
                     payment_status = 'REFUNDED',
                     refund_id = ?,
                     return_status = 'REFUND_SETTLED'
                 WHERE id = ?`,
                [refundId, orderId]
            );

            await connection.query(
                `UPDATE refunds 
                 SET status = 'settled', refund_settled_at = NOW(), gateway_refund_id = ? 
                 WHERE id = ?`,
                [refundId, refundRecord.id]
            );

            await connection.query(`UPDATE returns SET status = 'REFUND_SETTLED' WHERE order_id = ?`, [orderId]);
            
            await connection.commit();
            logger.info(`COD refund marked successfully for order ${orderId}. Refund ID: ${refundId}`);

            // Fire-and-forget SMS
            sendRefundCompletedSMS(refundRecord.user_id || null, orderId, refundRecord.amount).catch(() => {});
            return;
        }

        // Online Refund Logic (PayU)
        if (!order.mihpayid) {
            throw new Error(`Refund failed: No successful PayU payment transaction found for order ${orderId}`);
        }

        await connection.query(`UPDATE refunds SET status = 'processing' WHERE id = ?`, [refundRecord.id]);
        // Fire-and-forget SMS
        sendRefundInitiatedSMS(refundRecord.user_id, orderId, refundRecord.amount).catch(() => {});

        const key = env.payu.merchantKey;
        const salt = env.payu.merchantSalt;
        const command = "cancel_refund_transaction";
        const var1 = order.mihpayid;
        const var2 = order.txnid; 
        const var3 = parseFloat(order.total_amount).toFixed(2);

        const hashString = `${key}|${command}|${var1}|${salt}`;
        const hash = crypto.createHash('sha512').update(hashString).digest('hex');

        const formParams = new URLSearchParams();
        formParams.append('key', key);
        formParams.append('command', command);
        formParams.append('hash', hash);
        formParams.append('var1', var1);
        formParams.append('var2', var2);
        formParams.append('var3', var3);

        const baseUrl = env.payu.isProduction
            ? 'https://info.payu.in/merchant/postservice.php?form=2'
            : 'https://test.payu.in/merchant/postservice.php?form=2';

        const response = await axios.post(baseUrl, formParams.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const responseData = response.data;

        if (responseData && responseData.status === 1) {
            const refundId = responseData.request_id || responseData.mihpayid || `PRU_${Date.now()}`;

            await connection.query(
                `UPDATE orders SET refund_status = 'REFUND_SETTLED', payment_status = 'REFUNDED', refund_id = ?, return_status = 'REFUND_SETTLED' WHERE id = ?`,
                [refundId, orderId]
            );

            await connection.query(
                `UPDATE refunds SET status = 'settled', refund_settled_at = NOW(), gateway_refund_id = ? WHERE id = ?`,
                [refundId, refundRecord.id]
            );

            await connection.query(`UPDATE returns SET status = 'REFUND_SETTLED' WHERE order_id = ?`, [orderId]);

            await connection.commit();
            logger.info(`PayU refund processed successfully for order ${orderId}. Refund ID: ${refundId}`);

            // Fire-and-forget SMS
            sendRefundCompletedSMS(null, orderId, refundRecord.amount).catch(() => {});
        } else {
            // Failed refund status update for retry mechanism
            await connection.query(
                `UPDATE refunds SET status = 'failed', retry_count = retry_count + 1 WHERE id = ?`,
                [refundRecord.id]
            );
            await connection.commit();
            logger.error(`PayU Refund failed for order ${orderId}`, responseData);
            throw new Error(`PayU API Error: ${responseData.msg || 'Refund Failed'}`);
        }
    } catch (e) {
        if (connection) await connection.rollback();
        logger.error(`Error processing refund for order ${orderId}`, { error: e.message });
        throw e;
    } finally {
        if (connection) connection.release();
    }
}

module.exports = { processRefund };
