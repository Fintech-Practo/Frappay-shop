const pool = require("../../config/db");

async function create(data) {
  const { review_id, user_id, comment } = data;

  const [result] = await pool.execute(
    `INSERT INTO review_comments (review_id, user_id, comment, status)
     VALUES (?, ?, ?, 'PENDING')`,
    [review_id, user_id, comment]
  );

  return await findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT c.*, u.name as user_name, u.profile_image_url as user_image
     FROM review_comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByReviewId(reviewId) {
  const [rows] = await pool.execute(
    `SELECT c.*, u.name as user_name, u.profile_image_url as user_image
     FROM review_comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.review_id = ? AND c.status = 'APPROVED'
     ORDER BY c.created_at ASC`,
    [reviewId]
  );
  return rows;
}

async function moderate(id, moderatorId, status) {
  await pool.execute(
    `UPDATE review_comments 
     SET status = ?, moderated_by = ?, moderated_at = NOW()
     WHERE id = ?`,
    [status, moderatorId, id]
  );

  return await findById(id);
}

async function deleteComment(id, userId) {
  const [result] = await pool.execute(
    `DELETE FROM review_comments WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  create,
  findById,
  findByReviewId,
  moderate,
  deleteComment,
};

