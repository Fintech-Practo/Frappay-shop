const pool = require("../../config/db"); // mysql2/promise pool
const notificationService = require("../notification/notification.service");
const logger = require("../../utils/logger");

async function createTicket({
    user_id,
    email,
    subject,
    message,
    priority = "MEDIUM",
}) {
    const safeSubject = subject?.trim() || "Support Request";

    const [result] = await pool.execute(
        `
    INSERT INTO support_tickets (user_id, email, subject, message, priority, status)
    VALUES (?, ?, ?, ?, ?, 'OPEN')
    `,
        [user_id ?? null, email ?? null, safeSubject, message, priority]
    );

    const ticketId = result.insertId;

    if (user_id) {
        notificationService.sendNotification(
            user_id,
            'SUPPORT_TICKET_CREATED',
            'Support Ticket Created',
            `Your support ticket #${ticketId} ("${safeSubject}") has been created. We will get back to you soon.`,
            'SYSTEM',
            ticketId
        ).catch(err => logger.warn("Failed to send support ticket notification", { user_id, ticketId, error: err.message }));
    }

    return ticketId;
}

async function getTicketById(ticketId) {
    const [rows] = await pool.execute(
        `
    SELECT 
      id, user_id, email, subject, message, status, priority,
      assigned_to, resolution, resolved_at, created_at, updated_at
    FROM support_tickets
    WHERE id = ?
    `,
        [ticketId]
    );

    return rows[0] || null;
}

async function listTickets({ status, priority, role, search, limit = 20, offset = 0 }) {
   let sql = `
    SELECT 
      st.id, st.user_id, st.email, st.subject, st.message, st.status, st.priority,
      st.assigned_to, st.created_at, st.updated_at, st.resolved_at,
      u.role AS user_role
    FROM support_tickets st
    LEFT JOIN users u ON st.user_id = u.id
    WHERE 1=1
`;
    const params = [];

    if (status) {
        sql += `  AND st.status = ?`;
        params.push(status);
    }
     if (role) {
        sql += `AND u.role = ?`;
        params.push(role);
    }

    if (priority) {
        sql += ` AND st.priority = ?`;
        params.push(priority);
    }

    if (search) {
        sql += ` AND (st.email LIKE ? OR st.subject LIKE ? OR st.message LIKE ?)`;
        const like = `%${search}%`;
        params.push(like, like, like);
    }

    sql += ` ORDER BY st.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    return rows;
}

async function listTicketsForUser(userId, { limit = 20, offset = 0 }) {
    const [rows] = await pool.query(
        `
    SELECT id, subject, status, priority, created_at, updated_at, resolved_at
    FROM support_tickets
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        [userId, Number(limit), Number(offset)]
    );

    return rows;
}

async function updateTicket(ticketId, { status, resolution, assigned_to, priority }) {
    const ticket = await getTicketById(ticketId);
    if (!ticket) return null;

    // resolved_at should be set only when resolved/closed
    const shouldResolve = status === "RESOLVED" || status === "CLOSED";

    await pool.execute(
        `
    UPDATE support_tickets
    SET 
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assigned_to = COALESCE(?, assigned_to),
      resolution = COALESCE(?, resolution),
      resolved_at = CASE 
        WHEN ? = 1 THEN COALESCE(resolved_at, CURRENT_TIMESTAMP)
        ELSE NULL
      END
    WHERE id = ?
    `,
        [
            status ?? null,
            priority ?? null,
            assigned_to ?? null,
            resolution ?? null,
            shouldResolve ? 1 : 0,
            ticketId,
        ]
    );

    if (ticket.user_id && status && status !== ticket.status) {
        notificationService.sendNotification(
            ticket.user_id,
            'SUPPORT_TICKET_UPDATED',
            'Support Ticket Update',
            `Your support ticket #${ticketId} status has been updated to "${status}".`,
            'SYSTEM',
            ticketId
        ).catch(err => logger.warn("Failed to send support ticket status update", { user_id: ticket.user_id, ticketId, error: err.message }));
    }

    return getTicketById(ticketId);
}

module.exports = {
    createTicket,
    getTicketById,
    listTickets,
    listTicketsForUser,
    updateTicket,
};