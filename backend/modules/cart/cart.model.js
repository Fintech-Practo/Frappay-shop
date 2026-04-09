const pool = require("../../config/db");

async function findOrCreateByUserId(userId) {
  try {
    // Try to find existing cart
    const [existing] = await pool.execute(
      `SELECT * FROM carts WHERE user_id = ?`,
      [userId]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    // Try to insert (ignore if exists to handle race condition)
    await pool.execute(
      `INSERT IGNORE INTO carts (user_id) VALUES (?)`,
      [userId]
    );

    // Select again - guaranteed to exist now
    const [cart] = await pool.execute(
      `SELECT * FROM carts WHERE user_id = ?`,
      [userId]
    );

    if (cart.length === 0) {
      throw new Error("Failed to create or retrieve cart");
    }

    return cart[0];
  } catch (error) {
    console.error("Error in findOrCreateByUserId:", error);
    throw error;
  }
}

async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM carts WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function clearCart(cartId) {
  await pool.execute(
    `DELETE FROM cart_items WHERE cart_id = ?`,
    [cartId]
  );
  return true;
}

module.exports = {
  findOrCreateByUserId,
  findByUserId,
  clearCart
};

