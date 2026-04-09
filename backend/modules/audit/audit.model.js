const pool = require("../../config/db");

async function createLog(logData) {
    const {
        requestId,
        sessionId,
        action,
        module,
        entityType,
        entityId,
        performedBy,
        performedRole,
        severity = 'INFO',
        ipAddress,
        userAgent,
        oldValues,
        newValues,
        message
    } = logData;

    // Check for exact action duplication within 1 second
    const [existingLogs] = await pool.query(
        `SELECT id FROM audit_logs 
         WHERE action = ? AND entity_type = ? AND entity_id = ? AND performed_by = ? 
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 SECOND)`,
        [action, entityType || null, entityId || null, performedBy || null]
    );

    if (existingLogs.length > 0) {
        return existingLogs[0].id;
    }

    const [result] = await pool.execute(
        `INSERT INTO audit_logs (
            request_id, session_id, action, module, entity_type, entity_id, 
            performed_by, performed_role, severity, ip_address, user_agent, 
            old_values, new_values, message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            requestId || null,
            sessionId || null,
            action,
            module,
            entityType || null,
            entityId || null,
            performedBy || null,
            performedRole || null,
            severity,
            ipAddress || null,
            userAgent || null,
            oldValues ? JSON.stringify(oldValues) : null,
            newValues ? JSON.stringify(newValues) : null,
            message || null
        ]
    );

    return result.insertId;
}

async function listLogs(filters = {}) {
    let query = `
        SELECT l.*, u.name as admin_name, u.email as admin_email
        FROM audit_logs l
        LEFT JOIN users u ON l.performed_by = u.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.module) {
        query += ` AND l.module = ?`;
        params.push(filters.module);
    }
    if (filters.action) {
        query += ` AND l.action = ?`;
        params.push(filters.action);
    }
    if (filters.entityType) {
        query += ` AND l.entity_type = ?`;
        params.push(filters.entityType);
    }
    if (filters.performedBy) {
        query += ` AND l.performed_by = ?`;
        params.push(filters.performedBy);
    }
    if (filters.severity) {
        query += ` AND l.severity = ?`;
        params.push(filters.severity);
    }
    if (filters.startDate) {
        query += ` AND l.created_at >= ?`;
        params.push(filters.startDate);
    }
    if (filters.endDate) {
        query += ` AND l.created_at <= ?`;
        params.push(filters.endDate);
    }

    query += ` ORDER BY l.created_at DESC`;

    // Pagination
    const limit = parseInt(filters.limit) || 50;
    const offset = parseInt(filters.offset) || 0;
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);

    // Parse JSON
    return rows.map(row => ({
        ...row,
        old_values: typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values,
        new_values: typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values
    }));
}

module.exports = {
    createLog,
    listLogs
};
