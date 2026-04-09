const pool = require("../../config/db");

async function findByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.gender, DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as date_of_birth, u.password_hash, u.role, u.is_active, u.is_email_verified, u.is_phone_verified,
            u.profile_image_url, u.address_id, u.location, u.preferences, u.created_at, u.updated_at,
            a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country, a.full_name as address_full_name, a.phone as address_phone
     FROM users u
     LEFT JOIN addresses a ON u.address_id = a.id
     WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
}

async function findByPhone(phone) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.gender, DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as date_of_birth, u.password_hash, u.role, u.is_active, u.is_email_verified, u.is_phone_verified,
            u.profile_image_url, u.address_id, u.location, u.preferences, u.created_at, u.updated_at,
            a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country, a.full_name as address_full_name, a.phone as address_phone
     FROM users u
     LEFT JOIN addresses a ON u.address_id = a.id
     WHERE u.phone = ?`,
    [phone]
  );
  return rows[0] || null;
}

async function findById(id) {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.gender, DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as date_of_birth, u.password_hash, u.role, u.is_active, u.is_email_verified, 
              u.profile_image_url, u.address_id, u.location, u.preferences, u.created_at, u.updated_at,
              a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country, a.full_name as address_full_name, a.phone as address_phone,
              si.business_name, si.business_location, si.gst_number, si.pan_number, si.kyc_status, si.is_kyc_verified
       FROM users u
       LEFT JOIN addresses a ON u.address_id = a.id
       LEFT JOIN seller_info si ON u.id = si.user_id
       WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const user = rows[0];
    
    // Structure seller info if present
    if (user.role === 'SELLER') {
      user.seller_info = {
        business_name: user.business_name,
        business_location: user.business_location,
        gst_number: user.gst_number,
        pan_number: user.pan_number,
        kyc_status: user.kyc_status,
        is_kyc_verified: user.is_kyc_verified
      };
    }

    return user;
  } catch (error) {
    console.error("Error in findById (user):", error);
    throw error;
  }
}

async function createUser(data) {
  const { name, email, phone = null, passwordHash = null, role = "USER", isEmailVerified = false, isPhoneVerified = false } = data;

  const [result] = await pool.execute(
    `INSERT INTO users (name, email, phone, password_hash, role, is_active, is_email_verified, is_phone_verified) 
     VALUES (?, ?, ?, ?, ?, true, ?, ?)`,
    [name, email, phone, passwordHash, role, isEmailVerified, isPhoneVerified]
  );

  const user = await findById(result.insertId);
  return user;
}

async function updateEmailVerificationStatus(email, verified = true) {
  await pool.execute(
    `UPDATE users 
     SET is_email_verified = ? 
     WHERE email = ?`,
    [verified, email]
  );
  return await findByEmail(email);
}

async function listAll(filters = {}) {
  const { limit = 20, offset = 0, role, is_active, search } = filters;
  let query = `SELECT id, name, email, role, is_active, created_at FROM users WHERE 1=1`;
  const params = [];

  if (role) {
    query += ` AND role = ?`;
    params.push(role);
  }

  if (is_active !== undefined) {
    query += ` AND is_active = ?`;
    params.push(is_active === 'true' || is_active === true);
  }

  if (search) {
    query += ` AND (name LIKE ? OR email LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  return rows;
}

async function countAll(filters = {}) {
  const { role, is_active, search } = filters;
  let query = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
  const params = [];

  if (role) {
    query += ` AND role = ?`;
    params.push(role);
  }

  if (is_active !== undefined) {
    query += ` AND is_active = ?`;
    params.push(is_active === 'true' || is_active === true);
  }

  if (search) {
    query += ` AND (name LIKE ? OR email LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
}

async function disableUser(userId, reason, adminId) {
  const [result] = await pool.execute(
    `UPDATE users 
     SET is_active = false 
     WHERE id = ?`,
    [userId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return await findById(userId);
}

async function enableUser(userId, reason, adminId) {
  const [result] = await pool.execute(
    `UPDATE users 
     SET is_active = true 
     WHERE id = ?`,
    [userId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return await findById(userId);
}

async function updateName(userId, name) {
  await pool.execute(
    `UPDATE users 
     SET name = ? 
     WHERE id = ?`,
    [name, userId]
  );

  return await findById(userId);
}

async function updateProfile(userId, data) {
  const allowedFields = ['name', 'address_id', 'location', 'profile_image_url', 'phone', 'gender', 'date_of_birth'];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) {
    return await findById(userId);
  }

  values.push(userId);
  await pool.execute(
    `UPDATE users 
     SET ${updates.join(', ')} 
     WHERE id = ?`,
    values
  );

  return await findById(userId);
}

async function updatePreferences(userId, preferences) {
  const preferencesJson = JSON.stringify(preferences);
  await pool.execute(
    `UPDATE users 
     SET preferences = ? 
     WHERE id = ?`,
    [preferencesJson, userId]
  );

  return await findById(userId);
}

async function getPreferences(userId) {
  const user = await findById(userId);
  if (!user) return null;

  try {
    return user.preferences ? JSON.parse(user.preferences) : null;
  } catch (e) {
    return null;
  }
}

async function getUserStats() {
  const [rows] = await pool.execute(
    `SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'SELLER' THEN 1 END) as total_sellers,
      COUNT(CASE WHEN role = 'USER' THEN 1 END) as total_customers,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL 1 DAY THEN 1 END) as new_users_today
     FROM users`
  );
  return rows[0];
}

async function updatePassword(userId, passwordHash) {
  await pool.execute(
    `UPDATE users 
     SET password_hash = ? 
     WHERE id = ?`,
    [passwordHash, userId]
  );
}

async function deleteUser(userId) {
  await pool.execute(
    `DELETE FROM users WHERE id = ?`,
    [userId]
  );
}

async function getUserActivity(userId, filters = {}) {
  if (!userId) {
    // Admin call - get all user activity
    const [rows] = await pool.execute(
      `SELECT 
        'user_login' as type,
        u.id as activity_id,
        u.created_at as activity_date,
        u.email as details,
        u.is_active as status
       FROM users u
       
       UNION ALL
       
       SELECT 
        'order' as type,
        o.id as activity_id,
        o.created_at as activity_date,
        CONCAT('Order #', o.id) as details,
        o.status as status
       FROM orders o
       
       ORDER BY activity_date DESC
       LIMIT 100`
    );
    return rows;
  }

  // Individual user activity
  const [rows] = await pool.execute(
    `SELECT 
      'order' as type,
      o.id as activity_id,
      o.created_at as activity_date,
      o.total_payable_amount as details,
      o.status as status
     FROM orders o 
     WHERE o.user_id = ?
     
     UNION ALL
     
     SELECT 
      'review' as type,
      r.id as activity_id,
      r.created_at as activity_date,
      r.rating as details,
      r.status as status
     FROM reviews r 
     WHERE r.user_id = ?
     
     ORDER BY activity_date DESC
     LIMIT 50`,
    [userId, userId]
  );
  return rows;
}

module.exports = {
  findByEmail,
  findByPhone,
  findById,
  createUser,
  listAll,
  countAll,
  disableUser,
  enableUser,
  updateName,
  updateProfile,
  updatePreferences,
  getPreferences,
  updateEmailVerificationStatus,
  getUserStats,
  getUserGrowthStats,
  updatePassword,
  deleteUser,
  getUserActivity
};

async function getUserGrowthStats(range = '6m') {
  let condition = '';
  let groupBy = '';
  let dateFormat = '';

  switch (range) {
    case 'today':
      condition = `created_at >= CURDATE()`;
      groupBy = `DATE_FORMAT(created_at, '%H:00')`;
      dateFormat = `DATE_FORMAT(created_at, '%H:00')`;
      break;
    case '30d':
      condition = `created_at >= NOW() - INTERVAL 30 DAY`;
      groupBy = `DATE_FORMAT(created_at, '%Y-%m-%d')`;
      dateFormat = `DATE_FORMAT(created_at, '%b %d')`;
      break;
    case '60d':
      condition = `created_at >= NOW() - INTERVAL 60 DAY`;
      groupBy = `DATE_FORMAT(created_at, '%Y-%m-%d')`;
      dateFormat = `DATE_FORMAT(created_at, '%b %d')`;
      break;
    case '6m':
    default:
      condition = `created_at >= NOW() - INTERVAL 6 MONTH`;
      groupBy = `DATE_FORMAT(created_at, '%Y-%m')`;
      dateFormat = `DATE_FORMAT(created_at, '%b')`;
      break;
  }

  const [rows] = await pool.execute(
    `SELECT 
      ${dateFormat} as label,
      COUNT(*) as value
     FROM users 
     WHERE ${condition}
     GROUP BY ${groupBy}, ${dateFormat}
     ORDER BY ${groupBy} ASC`
  );
  return rows;
}