const db = require('../../config/db');

class LedgerService {
    /**
     * Create a new ledger entry
     * @param {Object} data - { order_id, user_id, seller_id, type, amount, direction, status, reference_id }
     * @param {Object} connection - Optional database connection/transaction
     */
    async createEntry(data, connection = null) {
        const executor = connection || db;
        const {
            order_id = null,
            user_id = null,
            seller_id = null,
            type,
            amount,
            direction,
            status = 'pending',
            reference_id = null
        } = data;

        const query = `
            INSERT INTO ledger_entries 
            (order_id, user_id, seller_id, type, amount, direction, status, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await executor.query(query, [
            order_id,
            user_id,
            seller_id,
            type,
            amount,
            direction,
            status,
            reference_id
        ]);

        return result.insertId;
    }

    async getByOrderId(orderId) {
        const [rows] = await db.query('SELECT * FROM ledger_entries WHERE order_id = ?', [orderId]);
        return rows;
    }

    async getBySellerId(sellerId, filters = {}) {
        let query = 'SELECT * FROM ledger_entries WHERE seller_id = ?';
        const params = [sellerId];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await db.query(query, params);
        return rows;
    }

    /**
     * Get aggregated financial report for all orders
     * @param {Object} filters - { page, limit, seller_name }
     */
    async getOrderLedger(filters = {}) {
    const { page = 1, limit = 10, seller_name = "" } = filters;
    const offset = (page - 1) * limit;

    let query = `
        SELECT 
            o.id,
            o.id as order_id,
            o.total_payable_amount,
            o.payment_method,
            o.seller_payout_total,
            CASE WHEN o.total_payable_amount > 1500 THEN 0 ELSE o.shipping_amount END as shipping_amount,
            CASE WHEN o.total_payable_amount > 1500 THEN 0 ELSE o.shipping_cost END as shipping_cost,
            o.shipping_base_rate as base_cost,
            CASE WHEN o.total_payable_amount > 1500 THEN 0 ELSE o.shipping_margin END as shipping_margin,
            o.cod_charges,
            CASE WHEN o.total_payable_amount > 1500 THEN o.gateway_fee ELSE 0 END as platform_fee,
            o.coupon_discount,
            o.coin_discount as reward_discount,
            o.admin_commission_total as admin_commission,
            o.admin_net_profit as net_profit,
            o.created_at,
            MAX(ls.admin_status) as shipping_status,
            MAX(ls.pickup_date) as shipped_at,
            MAX(ls.delivered_date) as delivered_at,
            GROUP_CONCAT(DISTINCT u_seller.name) as seller_names
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.order_id
        INNER JOIN users u_seller ON oi.seller_id = u_seller.id
        LEFT JOIN logistics_shipments ls ON o.id = ls.order_id
    `;

    const params = [];

    // ✅ CRITICAL FIX: FILTER BEFORE GROUPING
    if (seller_name && seller_name.trim() !== "") {
        query += ` WHERE u_seller.name LIKE ? `;
        params.push(`%${seller_name}%`);
    }

    query += `
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(query, params);

    // ✅ COUNT QUERY (MATCH SAME LOGIC)
    let countQuery = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.order_id
        INNER JOIN users u_seller ON oi.seller_id = u_seller.id
    `;

    const countParams = [];

    if (seller_name && seller_name.trim() !== "") {
        countQuery += ` WHERE u_seller.name LIKE ? `;
        countParams.push(`%${seller_name}%`);
    }

    const [[{ total }]] = await db.query(countQuery, countParams);

    return {
        data: rows,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
}
}

module.exports = new LedgerService();