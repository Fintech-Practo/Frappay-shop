const pool = require("../../config/db");

async function create(data) {
  const { cart_id, product_id, quantity, type = "CART", purchase_format = null } = data;

  // Check if item already exists with same type AND purchase_format
  const [existing] = await pool.execute(
    `SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND type = ? AND (purchase_format = ? OR (purchase_format IS NULL AND ? IS NULL))`,
    [cart_id, product_id, type, purchase_format, purchase_format]
  );

  if (existing.length > 0) {
    // If it's a digital item, don't increment quantity, keep it at 1
    const isDigital = purchase_format === 'EBOOK' || purchase_format === 'DIGITAL';
    if (isDigital) {
      return await findById(existing[0].id);
    }

    // Update quantity if exists
    await pool.execute(
      `UPDATE cart_items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [quantity, existing[0].id]
    );
    return await findById(existing[0].id);
  }

  // Create new item
  const [result] = await pool.execute(
    `INSERT INTO cart_items (cart_id, product_id, quantity, type, purchase_format) 
     VALUES (?, ?, ?, ?, ?)`,
    [cart_id, product_id, quantity, type, purchase_format]
  );

  return await findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ci.*, p.title, p.selling_price as price, p.image_url, p.stock, p.is_active, p.format, p.product_type_code
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByCartId(cartId, filters = {}) {
  let query = `SELECT ci.*, p.title, p.selling_price as price, p.image_url, p.stock, p.is_active, p.format, p.product_type_code
               FROM cart_items ci
               LEFT JOIN products p ON ci.product_id = p.id
               WHERE ci.cart_id = ?`;
  const params = [cartId];

  if (filters.type) {
    query += ` AND ci.type = ?`;
    params.push(filters.type);
  }

  query += ` ORDER BY ci.created_at DESC`;

  try {
    const [rows] = await pool.execute(query, params);
    return rows || [];
  } catch (error) {
    console.error("Error in findByCartId:", error);
    throw error;
  }
}

async function updateQuantity(id, quantity) {
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    await remove(id);
    return null;
  }

  await pool.execute(
    `UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [quantity, id]
  );

  return await findById(id);
}

async function updateType(id, type) {
  await pool.execute(
    `UPDATE cart_items SET type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [type, id]
  );

  return await findById(id);
}

async function remove(id) {
  await pool.execute(`DELETE FROM cart_items WHERE id = ?`, [id]);

  return true;
}


async function removeByCartIdAndProductId(cartId, productId, type = null, purchase_format = null) {

  let query = `DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`;
  const params = [cartId, productId];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }

  if (purchase_format) {
    query += ` AND purchase_format = ?`;
    params.push(purchase_format);
  }

  await pool.execute(query, params);
  return true;
}

//NOT MUCH IS BEING USED 
async function getFavoritesByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT ci.*, p.title, p.selling_price as price, p.image_url, p.stock, p.is_active
     FROM cart_items ci
     JOIN carts c ON ci.cart_id = c.id
     JOIN products p ON ci.product_id = p.id
     WHERE c.user_id = ? AND ci.type = 'FAVORITE'
     ORDER BY ci.created_at DESC`,
    [userId]
  );
  return rows;
}

//NOT YET SOLVED JUST FOR TESTING 
async function getRecommendationData(userId) {
  // Get user's favorite product types/genres for recommendations
  const [rows] = await pool.execute(
    `SELECT 
      ci.type,
      p.id as product_id,
      p.title,
      p.selling_price as price,
      ci.quantity,
      ci.created_at
     FROM cart_items ci
     JOIN carts c ON ci.cart_id = c.id
     JOIN products p ON ci.product_id = p.id
     WHERE c.user_id = ? AND ci.type IN ('FAVORITE', 'WISHLIST')
     ORDER BY ci.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  create,
  findById,
  findByCartId,
  updateQuantity,
  updateType,
  remove,
  removeByCartIdAndProductId,
  getFavoritesByUserId,
  getRecommendationData
};

