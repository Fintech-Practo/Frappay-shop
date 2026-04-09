const pool = require("../../config/db");
const logger = require('../../utils/logger');

const TABLE_NAME = 'payment_transactions';

/**
 * Creates a new payment transaction record
 * @param {Object} data - Transaction data
 * @param {Object} [connection] - Optional DB connection for transaction
 */
async function createTransaction(data, connection = pool) {
    const {
        payment_session_id,
        order_id,
        gateway = 'PAYU',
        gateway_transaction_id,
        gateway_payment_id = null,
        amount,
        status,
        raw_response
    } = data;

    try {
        const [result] = await connection.query(
            `INSERT INTO ${TABLE_NAME} 
            (payment_session_id, order_id, gateway, gateway_transaction_id, gateway_payment_id, amount, status, raw_response) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payment_session_id,
                order_id,
                gateway,
                gateway_transaction_id,
                gateway_payment_id,
                amount,
                status,
                JSON.stringify(raw_response)
            ]
        );
        return result.insertId;
    } catch (error) {
        logger.error(`Error creating payment transaction: ${error.message}`, { stack: error.stack });
        throw error;
    }
}

/**
 * Find transaction by order ID
 * @param {number} orderId 
 */
async function findByOrderId(orderId) {
    const [rows] = await pool.query(
        `SELECT * FROM ${TABLE_NAME} WHERE order_id = ?`,
        [orderId]
    );
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Find transaction by Payment Session ID (txnid)
 * @param {string} sessionId 
 */
async function findByPaymentSessionId(sessionId) {
    const [rows] = await pool.query(
        `SELECT * FROM ${TABLE_NAME} WHERE payment_session_id = ?`,
        [sessionId]
    );
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Update transaction status
 * @param {number} id 
 * @param {string} status 
 */
async function updateStatus(id, status) {
    await pool.query(
        `UPDATE ${TABLE_NAME} SET status = ? WHERE id = ?`,
        [status, id]
    );
}

module.exports = {
    createTransaction,
    findByOrderId,
    findByPaymentSessionId,
    updateStatus
};
