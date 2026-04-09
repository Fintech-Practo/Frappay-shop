const pool = require("../../config/db");

async function create(data) {
  const { order_id, reason, requested_by } = data;

  const [result] = await pool.execute(
    `INSERT INTO cancellations (order_id, reason, requested_by, status) 
     VALUES (?, ?, ?, 'PENDING')`,
    [order_id, reason, requested_by]
  );

  return await findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT c.*, 
            o.user_id as order_user_id, o.status as order_status, o.total_payable_amount as total_amount,
            u1.name as requested_by_name, u1.email as requested_by_email,
            u2.name as processed_by_name
     FROM cancellations c
     JOIN orders o ON c.order_id = o.id
     JOIN users u1 ON c.requested_by = u1.id
     LEFT JOIN users u2 ON c.processed_by = u2.id
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByOrderId(orderId) {
  const [rows] = await pool.execute(
    `SELECT c.*, 
            o.user_id as order_user_id, o.status as order_status,
            u1.name as requested_by_name,
            u2.name as processed_by_name
     FROM cancellations c
     JOIN orders o ON c.order_id = o.id
     JOIN users u1 ON c.requested_by = u1.id
     LEFT JOIN users u2 ON c.processed_by = u2.id
     WHERE c.order_id = ?
     ORDER BY c.created_at DESC`,
    [orderId]
  );
  return rows;
}

async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT c.*, 
            o.user_id as order_user_id, o.status as order_status, o.total_payable_amount as total_amount,
            u1.name as requested_by_name
     FROM cancellations c
     JOIN orders o ON c.order_id = o.id
     JOIN users u1 ON c.requested_by = u1.id
     WHERE c.requested_by = ?
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return rows;
}

async function findAll(filters = {}) {
  let query = `SELECT c.*, 
                      o.user_id as order_user_id, o.status as order_status, o.total_payable_amount as total_amount,
                      u1.name as requested_by_name, u1.email as requested_by_email,
                      u2.name as processed_by_name
               FROM cancellations c
               JOIN orders o ON c.order_id = o.id
               JOIN users u1 ON c.requested_by = u1.id
               LEFT JOIN users u2 ON c.processed_by = u2.id
               WHERE 1=1`;
  const params = [];

  if (filters.status) {
    query += ` AND c.status = ?`;
    params.push(filters.status);
  }

  if (filters.order_id) {
    query += ` AND c.order_id = ?`;
    params.push(filters.order_id);
  }

  query += ` ORDER BY c.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);

    if (filters.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }

  const [rows] = await pool.execute(query, params);
  return rows;
}

async function updateStatus(id, status, processedBy = null) {
  const updates = [`status = ?`];
  const params = [status];

  if (processedBy) {
    updates.push(`processed_by = ?`);
    params.push(processedBy);
  }

  params.push(id);

  await pool.execute(
    `UPDATE cancellations SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );

  return await findById(id);
}

async function getStats(userId = null) {
  let query = `SELECT 
    COUNT(*) as total_cancellations,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_cancellations,
    COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_cancellations,
    COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_cancellations
    FROM cancellations`;

  const params = [];
  if (userId) {
    query += ` WHERE requested_by = ?`;
    params.push(userId);
  }

  const [rows] = await pool.execute(query, params);
  return rows[0];
}

module.exports = {
  create,
  findById,
  findByOrderId,
  findByUserId,
  findAll,
  updateStatus,
  getStats
};

