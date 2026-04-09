const pool = require("../../config/db");

async function createOrUpdate(userId, data) {
  const {
    business_name,
    business_location,
    bank_account_number,
    bank_ifsc,
    bank_name,
    pan_number,
    aadhaar_number,
    gst_number,
    govt_id_number,
    govt_id_url,
    requested_commission_rate,
    is_books_only
  } = data;

  // Check if seller info exists
  const [existing] = await pool.execute(
    `SELECT id FROM seller_info WHERE user_id = ?`,
    [userId]
  );

  if (existing.length > 0) {
    // Update existing
    await pool.execute(
      `UPDATE seller_info 
       SET business_name = ?, business_location = ?, bank_account_number = ?,
           bank_ifsc = ?, bank_name = ?, pan_number = ?, aadhaar_number = ?,
           gst_number = ?, govt_id_type = ?, govt_id_number = ?, govt_id_url = ?,
           requested_commission_rate = ?, is_books_only = ?, approval_status = 'PENDING', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        business_name,
        business_location,
        bank_account_number,
        bank_ifsc,
        bank_name,
        pan_number,
        aadhaar_number,
        gst_number || null,
        govt_id_type || null,
        govt_id_number || null,
        govt_id_url || null,
        requested_commission_rate || 10.00,
        is_books_only || false,
        userId
      ]
    );
    return await findByUserId(userId);
  } else {
    // Create new
    const [result] = await pool.execute(
      `INSERT INTO seller_info 
       (user_id, business_name, business_location, bank_account_number, 
        bank_ifsc, bank_name, pan_number, aadhaar_number, 
        gst_number, govt_id_type, govt_id_number, govt_id_url,
        requested_commission_rate, is_books_only, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        userId,
        business_name,
        business_location,
        bank_account_number,
        bank_ifsc,
        bank_name,
        pan_number,
        aadhaar_number,
        gst_number || null,
        govt_id_type || null,
        govt_id_number || null,
        govt_id_url || null,
        requested_commission_rate || 10.00,
        is_books_only || false
      ]
    );
    return await findById(result.insertId);
  }
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT si.*, u.name as user_name, u.email as user_email, u.role as user_role
     FROM seller_info si
     JOIN users u ON si.user_id = u.id
     WHERE si.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT si.*, u.name as user_name, u.email as user_email,
            sw.warehouse_name, sw.pickup_location_name, sw.address as warehouse_address,
            sw.city as warehouse_city, sw.state as warehouse_state, sw.pincode as warehouse_pincode,
            sw.phone as warehouse_phone, sw.email as warehouse_email,
            sw.return_address, sw.return_city, sw.return_state, sw.return_pincode
     FROM seller_info si
     JOIN users u ON si.user_id = u.id
     LEFT JOIN seller_warehouses sw ON si.user_id = sw.seller_id
     WHERE si.user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function getAllPending(filters = {}) {
  const { limit = 20, offset = 0 } = filters;

  const [newSellers] = await pool.query(
    `SELECT si.*, u.name as user_name, u.email as user_email, 'NEW_SELLER' as request_type
     FROM seller_info si
     JOIN users u ON si.user_id = u.id
     WHERE si.approval_status = 'PENDING'
     ORDER BY si.created_at ASC
     LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)]
  );

  const [updateRequests] = await pool.query(
    `SELECT ur.*, u.name as user_name, u.email as user_email, si.business_name as current_business_name, 'PROFILE_UPDATE' as request_type
     FROM seller_profile_update_requests ur
     JOIN users u ON ur.seller_id = u.id
     JOIN seller_info si ON ur.seller_id = si.user_id
     WHERE ur.status = 'PENDING'
     ORDER BY ur.created_at ASC
     LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)]
  );

  const formattedUpdateRequests = updateRequests.map(req => {
    let data = req.data_json;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { }
    }
    return {
      ...req,
      user_id: req.seller_id,
      business_name: (data && data.business_name) ? data.business_name : req.current_business_name,
      business_location: (data && data.business_location) ? data.business_location : null,
    };
  });

  return [...newSellers, ...formattedUpdateRequests];
}

async function countPending() {
  const [newSellersCount] = await pool.query(
    `SELECT COUNT(*) as total FROM seller_info WHERE approval_status = 'PENDING'`
  );

  const [updateRequestsCount] = await pool.query(
    `SELECT COUNT(*) as total FROM seller_profile_update_requests WHERE status = 'PENDING'`
  );

  return newSellersCount[0].total + updateRequestsCount[0].total;
}

async function approve(userId, adminId, commissionRate = null) {
  const sellerRepo = require("./seller.repository");

  // Check for profile update request first
  const [updateRequests] = await pool.execute(
    `SELECT * FROM seller_profile_update_requests WHERE seller_id = ? AND status = 'PENDING'`,
    [userId]
  );

  if (updateRequests.length > 0) {
    const request = updateRequests[0];
    let data = request.data_json;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update seller_info with new data
      const infoUpdates = [];
      const infoValues = [];
      if (data.business_name) { infoUpdates.push('business_name = ?'); infoValues.push(data.business_name); }
      if (data.business_location) { infoUpdates.push('business_location = ?'); infoValues.push(data.business_location); }
      if (infoUpdates.length > 0) {
        infoValues.push(userId);
        await connection.execute(`UPDATE seller_info SET ${infoUpdates.join(', ')} WHERE user_id = ?`, infoValues);
      }

      // 2. Update seller_warehouses with new data
      const whUpdates = [];
      const whValues = [];
      if (data.warehouse_name) { whUpdates.push('warehouse_name = ?', 'pickup_location_name = ?'); whValues.push(data.warehouse_name, data.warehouse_name); }
      if (data.warehouse_address) { whUpdates.push('address = ?'); whValues.push(data.warehouse_address); }
      if (data.warehouse_city) { whUpdates.push('city = ?'); whValues.push(data.warehouse_city); }
      if (data.warehouse_state) { whUpdates.push('state = ?'); whValues.push(data.warehouse_state); }
      if (data.warehouse_pincode) { whUpdates.push('pincode = ?'); whValues.push(data.warehouse_pincode); }
      if (data.warehouse_phone) { whUpdates.push('phone = ?'); whValues.push(data.warehouse_phone); }
      if (data.warehouse_email) { whUpdates.push('email = ?'); whValues.push(data.warehouse_email); }
      
      // Return details
      if (data.return_address) { whUpdates.push('return_address = ?'); whValues.push(data.return_address); }
      if (data.return_city) { whUpdates.push('return_city = ?'); whValues.push(data.return_city); }
      if (data.return_state) { whUpdates.push('return_state = ?'); whValues.push(data.return_state); }
      if (data.return_pincode) { whUpdates.push('return_pincode = ?'); whValues.push(data.return_pincode); }

      if (whUpdates.length > 0) {
        whValues.push(userId);
        await connection.execute(`UPDATE seller_warehouses SET ${whUpdates.join(', ')} WHERE seller_id = ?`, whValues);
      }

      // Update request status
      await connection.execute(
        `UPDATE seller_profile_update_requests SET status = 'APPROVED', admin_remarks = NULL WHERE id = ?`,
        [request.id]
      );

      await connection.commit();
      return await findByUserId(userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get requested rate from seller_info if not provided
    let finalRate = commissionRate;
    if (finalRate === null) {
      const [si] = await connection.execute(
        `SELECT requested_commission_rate FROM seller_info WHERE user_id = ?`,
        [userId]
      );
      if (si.length > 0) {
        finalRate = si[0].requested_commission_rate;
      }
    }

    // 2. Update seller_info
    await connection.execute(
      `UPDATE seller_info 
       SET approval_status = 'APPROVED', 
           approved_by = ?, 
           approved_at = CURRENT_TIMESTAMP,
           rejection_reason = NULL,
           kyc_status = 'approved',
           is_kyc_verified = TRUE
       WHERE user_id = ?`,
      [adminId, userId]
    );

    // 3. Initialize/Update seller analytics with final commission rate
    await sellerRepo.findOrCreateAnalytics(userId, finalRate);

    // 4. Update user role to SELLER
    await connection.execute(
      `UPDATE users SET role = 'SELLER' WHERE id = ?`,
      [userId]
    );

    await connection.commit();
    return await findByUserId(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reject(userId, adminId, reason) {
  // Check for profile update request first
  const [updateRequests] = await pool.execute(
    `SELECT * FROM seller_profile_update_requests WHERE seller_id = ? AND status = 'PENDING'`,
    [userId]
  );

  if (updateRequests.length > 0) {
    const request = updateRequests[0];
    await pool.execute(
      `UPDATE seller_profile_update_requests 
       SET status = 'REJECTED', 
           admin_remarks = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, request.id]
    );
    return await findByUserId(userId);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Update seller_info
    await connection.execute(
      `UPDATE seller_info 
       SET approval_status = 'REJECTED', 
           approved_by = ?, 
           approved_at = CURRENT_TIMESTAMP,
           rejection_reason = ?,
           kyc_status = 'rejected',
           is_kyc_verified = FALSE
       WHERE user_id = ?`,
      [adminId, reason, userId]
    );

    await connection.commit();
    return await findByUserId(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createOrUpdate,
  findById,
  findByUserId,
  getAllPending,
  countPending,
  approve,
  reject
};