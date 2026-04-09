const pool = require("../../config/db");

async function create(reviewData) {
  const { user_id, product_id, rating, comment } = reviewData;
  const [result] = await pool.query(
    `INSERT INTO reviews (user_id, product_id, rating, comment, status) VALUES (?, ?, ?, ?, 'APPROVED')`,
    [user_id, product_id, rating, comment]
  );

  // Update product rating
  await updateProductRating(product_id);

  return await findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT r.*, u.name as user_name, u.profile_image_url 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.id = ?`,
    [id]
  );
  return rows[0];
}

async function findByIdAndUser(id, userId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.name as user_name, u.profile_image_url 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.id = ? AND r.user_id = ?`,
    [id, userId]
  );
  return rows[0];
}

async function findByProductId(productId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.name as user_name, u.profile_image_url 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.product_id = ? 
     ORDER BY r.created_at DESC`,
    [productId]
  );
  return rows;
}

async function findByUserId(userId, filters = {}) {
  let query = `
    SELECT r.*, p.title as product_title, p.image_url as product_image
    FROM reviews r 
    JOIN products p ON r.product_id = p.id 
    WHERE r.user_id = ?
  `;

  const params = [userId];

  if (filters.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
  }

  if (filters.offset) {
    query += ` OFFSET ?`;
    params.push(filters.offset);
  }

  query += ` ORDER BY r.created_at DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
}

async function findAll(searchQuery = "", filters = {}) {
  let query = `
    SELECT r.*, u.name as user_name, u.profile_image_url 
    FROM reviews r 
    JOIN users u ON r.user_id = u.id 
  `;

  const params = [];
  const whereConditions = [];

  if (searchQuery) {
    whereConditions.push(`u.name LIKE ?`);
    params.push(`%${searchQuery}%`);
  }

  if (filters.rating) {
    whereConditions.push(`r.rating = ?`);
    params.push(filters.rating);
  }

  if (filters.status) {
    whereConditions.push(`r.status = ?`);
    params.push(filters.status);
  }

  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  query += ` ORDER BY r.created_at DESC`;

  // Add pagination
  const limit = parseInt(filters.limit) || 10;
  const offset = parseInt(filters.offset) || 0;

  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  try {
    const [rows] = await pool.query(query, params);
    const totalItems = await countAll(searchQuery, filters);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      reviews: rows,
      totalItems,
      totalPages,
      currentPage: Math.floor(offset / limit) + 1
    };
  } catch (error) {
    console.error("Error in reviewModel.findAll:", error);
    throw error;
  }
}

async function countAll(searchQuery = "", filters = {}) {
  let query = `SELECT COUNT(*) as total FROM reviews r JOIN users u ON r.user_id = u.id`;
  const params = [];
  const whereConditions = [];

  if (searchQuery) {
    whereConditions.push(`u.name LIKE ?`);
    params.push(`%${searchQuery}%`);
  }

  if (filters.rating) {
    whereConditions.push(`r.rating = ?`);
    params.push(filters.rating);
  }

  if (filters.status) {
    whereConditions.push(`r.status = ?`);
    params.push(filters.status);
  }

  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
}

async function updateProductRating(productId) {
  const [rows] = await pool.query(
    `SELECT AVG(rating) as avg_rating, COUNT(*) as count 
     FROM reviews 
     WHERE product_id = ?`,
    [productId]
  );

  const avgRating = rows[0].avg_rating || 0;
  const count = rows[0].count || 0;

  await pool.query(
    `UPDATE products SET rating = ?, review_count = ? WHERE id = ?`,
    [avgRating, count, productId]
  );
}

async function userHasReviewed(userId, productId) {
  const [rows] = await pool.query(
    `SELECT id FROM reviews WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return rows.length > 0;
}

async function findPending() {
  const [rows] = await pool.query(
    `SELECT r.*, u.name as user_name, u.profile_image_url 
     FROM reviews r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.status = 'PENDING' 
     ORDER BY r.created_at ASC`
  );
  return rows;
}

async function moderate(id, moderatorId, status, reason) {
  await pool.query(
    `UPDATE reviews 
     SET status = ?, moderated_by = ?, moderated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [status, moderatorId, id]
  );
  return await findById(id);
}

async function deleteReview(id) {
  // First get the review to know which product to update later
  const review = await findById(id);
  if (!review) return false;

  await pool.query(`DELETE FROM reviews WHERE id = ?`, [id]);

  // Update product rating after deletion
  await updateProductRating(review.product_id);

  return true;
}

async function updateReview(id, updateData) {
  const { rating, comment } = updateData;
  const updates = [];
  const values = [];

  if (rating !== undefined) {
    updates.push('rating = ?');
    values.push(rating);
  }

  if (comment !== undefined) {
    updates.push('comment = ?');
    values.push(comment);
  }

  if (updates.length === 0) {
    return await findById(id);
  }

  values.push(id);
  await pool.query(
    `UPDATE reviews 
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    values
  );

  const updatedReview = await findById(id);
  await updateProductRating(updatedReview.product_id);

  return updatedReview;
}

module.exports = {
  create,
  findById,
  findByIdAndUser,
  findByProductId,
  findByUserId,
  findAll,
  countAll,
  userHasReviewed,
  findPending,
  moderate,
  deleteReview,
  updateReview
};
