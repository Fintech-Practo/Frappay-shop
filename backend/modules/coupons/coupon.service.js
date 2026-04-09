const db = require("../../config/db");
const couponService = require("../coupons/coupon.service");

class CouponService {

    async createCoupon(data, adminId) {

        const [existing] = await db.query(
            "SELECT id FROM coupons WHERE code = ? LIMIT 1",
            [data.code]
        );

        if (existing.length > 0) {
            throw new Error("Coupon code already exists");
        }

        // If this is set as a welcome coupon, unmark any previous welcome coupons
        if (data.is_welcome) {
            await db.query("UPDATE coupons SET is_welcome = 0 WHERE is_welcome = 1");
        }

        const [result] = await db.query(
            `INSERT INTO coupons 
            (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, per_user_limit, start_date, expiry_date, created_by_type, created_by_id, is_welcome)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.code,
                data.description,
                data.discount_type,
                data.discount_value,
                data.min_order_value,
                data.max_discount,
                data.usage_limit,
                data.per_user_limit || 1,
                data.start_date,
                data.expiry_date || null,
                "admin",
                adminId,
                data.is_welcome ? 1 : 0
            ]
        );
      

        const [coupon] = await db.query(
            "SELECT * FROM coupons WHERE id = ?",
            [result.insertId]
        );

        return coupon[0];
    }
      async getCouponUsageDetails(code) {

    const [rows] = await db.query(`
        SELECT 
            cu.id,
            cu.created_at as used_at,
            cu.order_id,
            u.name as user_name,
            o.total_amount,
            c.code,
            c.discount_type,
            c.discount_value
        FROM coupon_usages cu
        JOIN users u ON cu.user_id = u.id
        JOIN orders o ON cu.order_id = o.id
        JOIN coupons c ON cu.coupon_id = c.id
        WHERE c.code = ?
        ORDER BY cu.created_at DESC
    `, [code]);

    return rows;
}


   async getAllCoupons() {

    const [rows] = await db.query(`
        SELECT 
            c.*,
            COUNT(u.id) as total_used
        FROM coupons c
        LEFT JOIN coupon_usages u 
            ON c.id = u.coupon_id
        GROUP BY c.id
        ORDER BY c.created_at DESC
    `);

    return rows;
}


    async toggleCouponStatus(id) {

        const [rows] = await db.query(
            "SELECT id, is_active FROM coupons WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            throw new Error("Coupon not found");
        }

        const coupon = rows[0];

        await db.query(
            "UPDATE coupons SET is_active = ? WHERE id = ?",
            [!coupon.is_active, id]
        );

        return { message: "Coupon status updated" };
    }


    async validateCoupon(code, orderValue, userId) {
        const [rows] = await db.query(
            "SELECT * FROM coupons WHERE code = ? AND is_active = 1 LIMIT 1",
            [code]
        );

        if (rows.length === 0) {
            throw new Error("Invalid or inactive coupon code");
        }

        const coupon = rows[0];
        const now = new Date();

        // Expiry check
        if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
            throw new Error("Coupon has expired");
        }

        // Start date check
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            throw new Error("Coupon is not yet active");
        }

        // Min order value check
        if (orderValue < coupon.min_order_value) {
            throw new Error(`Minimum order value of ₹${coupon.min_order_value} required`);
        }

        // Global usage limit check
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            throw new Error("Coupon usage limit reached");
        }

        // Check per user usage
        const [usageRows] = await db.query(
            `SELECT COUNT(id) as count 
             FROM coupon_usages 
             WHERE coupon_id = ? AND user_id = ?`,
            [coupon.id, userId]
        );

        if (usageRows[0].count >= (coupon.per_user_limit || 1)) {
            throw new Error("You have already reached the usage limit for this coupon");
        }

        const discountAmount = this.calculateDiscount(coupon, orderValue);

        return {
            id: coupon.id,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discountAmount
        };
    }


    calculateDiscount(coupon, orderValue) {

        let discount = 0;

        if (coupon.discount_type === "flat") {
            discount = coupon.discount_value;
        }

        if (coupon.discount_type === "percentage") {
            discount = (orderValue * coupon.discount_value) / 100;

            if (coupon.max_discount && discount > coupon.max_discount) {
                discount = coupon.max_discount;
            }
        }

        return Math.min(discount, orderValue);
    }

    async recordUsage(couponId, userId, orderId) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Insert Usage Record
            await conn.query(
                "INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES (?, ?, ?)",
                [couponId, userId, orderId]
            );

            // 2. Increment used_count in coupons table
            await conn.query(
                "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?",
                [couponId]
            );

            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    async getWelcomeCoupon() {
        const [rows] = await db.query(
            "SELECT * FROM coupons WHERE is_welcome = 1 AND is_active = 1 LIMIT 1"
        );
        return rows[0] || null;
    }
}

module.exports = new CouponService();