const pool = require("../../config/db");

/**
 * Create a new notification
 * @param {Object} data - { userId, type, title, message, metadata, relatedEntityType, relatedEntityId }
 */
async function create(data) {
    const {
        userId,
        type,
        title,
        message,
        metadata,
        relatedEntityType,
        relatedEntityId
    } = data;

    const [result] = await pool.execute(
        `INSERT INTO notifications 
        (user_id, type, title, message, metadata, related_entity_type, related_entity_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            type,
            title,
            message,
            metadata ? JSON.stringify(metadata) : null, // 🔥 STRINGIFY before saving
            relatedEntityType,
            relatedEntityId
        ]
    );

    return result.insertId;
}

/**
 * Get notifications for a user with order details
 * @param {number} userId 
 * @param {number} limit 
 */
async function getByUserId(userId, limit = 50, offset = 0) {
    const [rows] = await pool.query(
        `
        SELECT
            n.*,
            o.id as order_id,
            o.total_payable_amount,
            GROUP_CONCAT(oi.product_title SEPARATOR ', ') as products
        FROM notifications n
        LEFT JOIN orders o
            ON n.related_entity_id = o.id
            AND n.related_entity_type='ORDER'
        LEFT JOIN order_items oi
            ON oi.order_id = o.id
        WHERE n.user_id = ?
        GROUP BY n.id
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
        `,
        [userId, parseInt(limit), parseInt(offset)]
    );
    
    // Parse metadata JSON for each notification safely
    return rows.map(n => {
        try {
            n.metadata = typeof n.metadata === "string"
                ? JSON.parse(n.metadata)
                : n.metadata || {};
        } catch (e) {
            console.error(`Failed to parse metadata for notification: ${n.id}`, n.metadata);
            n.metadata = {}; // fallback
        }
        return n;
    });
}

/**
 * Mark a notification as read
 * @param {number} id 
 * @param {number} userId 
 */
async function markAsRead(id, userId) {
    const [result] = await pool.execute(
        `UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?`,
        [id, userId]
    );
    return result.affectedRows > 0;
}

/**
 * Mark all notifications as read for a user
 * @param {number} userId 
 */
async function markAllAsRead(userId) {
    const [result] = await pool.execute(
        `UPDATE notifications SET is_read = true WHERE user_id = ?`,
        [userId]
    );
    return result.affectedRows;
}

/**
 * Get unread count
 * @param {number} userId 
 */
async function getUnreadCount(userId) {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false`,
        [userId]
    );
    return rows[0].count;
}

/**
 * Get total count
 * @param {number} userId 
 */
async function getTotalCount(userId) {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ?`,
        [userId]
    );
    return rows[0].count;
}

/**
 * Delete old notifications (older than 30 days)
 */
async function deleteOldNotifications() {
    try {
        await pool.execute(`DELETE FROM notifications WHERE created_at < NOW() - INTERVAL 30 DAY`);
    } catch (e) {
        console.error("Failed to delete old notifications:", e);
    }
}

module.exports = {
    create,
    getByUserId,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    getTotalCount,
    deleteOldNotifications
};
