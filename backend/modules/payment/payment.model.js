const pool = require("../../config/db");

async function createPaymentSession(data) {
    const { id, user_id, checkout_session_id, amount, gateway = 'PAYU' } = data;
    await pool.query(
        `INSERT INTO payment_sessions (id, user_id, checkout_session_id, amount, gateway, status) 
         VALUES (?, ?, ?, ?, ?, 'INITIATED')`,
        [id, user_id, checkout_session_id, amount, gateway]
    );
    return findSessionById(id);
}

async function findSessionById(id, connection = pool) {
    const [rows] = await connection.query(
        `SELECT * FROM payment_sessions WHERE id = ?`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
}


async function updateSessionStatus(id, status, order_id = null, connection = pool) {
    const updateData = [status];
    let query = `UPDATE payment_sessions SET status = ?, completed_at = CASE WHEN ? IN ('PAID', 'FAILED', 'REFUNDED') THEN CURRENT_TIMESTAMP ELSE completed_at END`;
    updateData.push(status);

    if (order_id) {
        query += `, order_id = ?`;
        updateData.push(order_id);
    }

    query += ` WHERE id = ?`;
    updateData.push(id);

    await connection.query(query, updateData);
    return findSessionById(id, connection);
}



async function logPaymentEvent(data) {
    const { payment_session_id, event_type, gateway_event_id, raw_payload } = data;
    await pool.query(
        `INSERT INTO payment_events (payment_session_id, event_type, gateway_event_id, raw_payload) 
         VALUES (?, ?, ?, ?)`,
        [payment_session_id, event_type, gateway_event_id, JSON.stringify(raw_payload)]
    );
}

async function createRefund(data) {
    const { payment_session_id, order_id, amount, reason, initiated_by } = data;
    const [result] = await pool.query(
        `INSERT INTO refunds (payment_session_id, order_id, amount, reason, initiated_by, status) 
         VALUES (?, ?, ?, ?, ?, 'REQUESTED')`,
        [payment_session_id, order_id, amount, reason, initiated_by]
    );
    return result.insertId;
}

async function updateRefundStatus(id, status, gateway_refund_id = null) {
    let query = `UPDATE refunds SET status = ?, completed_at = CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END`;
    const params = [status, status];

    if (gateway_refund_id) {
        query += `, gateway_refund_id = ?`;
        params.push(gateway_refund_id);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await pool.query(query, params);
}

module.exports = {
    createPaymentSession,
    findSessionById,
    updateSessionStatus,
    logPaymentEvent,
    createRefund,
    updateRefundStatus
};