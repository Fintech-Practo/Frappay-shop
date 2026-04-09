const pool = require("../../config/db");

// Helper function to convert database boolean values
function convertBooleans(address) {
  if (!address) return address;
  return {
    ...address,
    is_default: Boolean(address.is_default)
  };
}

// Helper function to convert array of addresses
function convertBooleanArray(addresses) {
  return addresses.map(convertBooleans);
}

async function create(userId, data) {
  const { label, full_name, phone, address_line1, address_line2, city, state, postal_code, country = "India", is_default = false } = data;

  // If this is set as default, unset other defaults
  if (is_default) {
    await pool.query(
      `UPDATE addresses SET is_default = false WHERE user_id = ?`,
      [userId]
    );
  }

  const [result] = await pool.query(
    `INSERT INTO addresses (user_id, label, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, label || null, full_name, phone || null, address_line1, address_line2 || null, city, state, postal_code, country, is_default]
  );

  return await findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT * FROM addresses WHERE id = ?`,
    [id]
  );
  return convertBooleans(rows[0]) || null;
}

async function findByIdAndUser(id, userId) {
    const [rows] = await pool.query(
      `SELECT * FROM addresses WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return convertBooleans(rows[0]) || null;
  }

async function findByUserId(userId) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return convertBooleanArray(rows) || [];
  } catch (error) {
    console.error("Error in findByUserId (address):", error);
    throw error;
  }
}

async function update(id, userId, data) {
  const allowedFields = ['label', 'full_name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'is_default'];
  const updates = [];
  const values = [];

  // If setting as default, unset other defaults
  if (data.is_default === true) {
    await pool.query(
      `UPDATE addresses SET is_default = false WHERE user_id = ? AND id != ?`,
      [userId, id]
    );
  }

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) {
    return await findById(id);
  }

  values.push(id, userId);
  await pool.query(
    `UPDATE addresses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  return await findById(id);
}

async function remove(id, userId) {
  const [result] = await pool.query(
    `DELETE FROM addresses WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

async function setDefault(id, userId) {
  // Unset all other defaults
  await pool.query(
    `UPDATE addresses SET is_default = false WHERE user_id = ?`,
    [userId]
  );

  // Set this as default
  const [result] = await pool.query(
    `UPDATE addresses SET is_default = true WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  create,
  findById,
  findByIdAndUser,
  findByUserId,
  update,
  remove,
  setDefault,
};
