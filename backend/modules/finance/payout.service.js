const db = require('../../config/db');
const ledgerService = require('./ledger.service');
const logger = require('../../utils/logger');

class PayoutService {
    /**
     * Create a pending payout for a seller
     * @param {Object} data - { id, seller_id, order_id, amount, due_date }
     */
    async createPayout(data, connection = null) {
        const executor = connection || db;
        const {
            id,
            seller_id,
            order_id,
            amount,
            status = 'pending',
            due_date = null
        } = data;

        const query = `
            INSERT INTO payouts (id, seller_id, order_id, amount, status, due_date) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await executor.query(query, [id, seller_id, order_id, amount, status, due_date]);
    }

    /**
     * Set/Update due date for a payout (called when order is delivered)
     */
    async setDueDate(orderId, deliveredAt, connection = null) {
        const executor = connection || db;
        const dueDate = new Date(deliveredAt);
        dueDate.setDate(dueDate.getDate() + 15); // 15 days logic

        await executor.query(
            'UPDATE payouts SET due_date = ? WHERE order_id = ? AND due_date IS NULL',
            [dueDate, orderId]
        );
        logger.info(`Due date set for order ${orderId} payouts: ${dueDate}`);
    }

    /**
     * Get all payouts for admin ledger with pagination and filters
     */
    async getPayoutLedger(filters = {}) {
    const { page = 1, limit = 10, status, seller_id, seller_name = "" } = filters;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            p.*,
            u.name as seller_name,
            o.created_at as order_at,
            o.total_payable_amount as order_total
        FROM payouts p
        JOIN users u ON p.seller_id = u.id
        JOIN orders o ON p.order_id = o.id
        WHERE o.status = 'DELIVERED'
    `;

    const params = [];

    if (status) {
        query += ' AND p.status = ?';
        params.push(status);
    }

    if (seller_id) {
        query += ' AND p.seller_id = ?';
        params.push(seller_id);
    }

    // ✅ 🔥 ADD THIS (MAIN FIX)
    if (seller_name && seller_name.trim() !== "") {
        query += ' AND u.name LIKE ?';
        params.push(`%${seller_name}%`);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(query, params);

    // ✅ FIX COUNT QUERY ALSO (IMPORTANT)
    let countQuery = `
        SELECT COUNT(*) as count
        FROM payouts p
        JOIN users u ON p.seller_id = u.id
        JOIN orders o ON p.order_id = o.id
        WHERE o.status = 'DELIVERED'
    `;

    const countParams = [];

    if (status) {
        countQuery += ' AND p.status = ?';
        countParams.push(status);
    }

    if (seller_id) {
        countQuery += ' AND p.seller_id = ?';
        countParams.push(seller_id);
    }

    if (seller_name && seller_name.trim() !== "") {
        countQuery += ' AND u.name LIKE ?';
        countParams.push(`%${seller_name}%`);
    }

    const [[{ count }]] = await db.query(countQuery, countParams);

    return {
        data: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit)
        }
    };
}

    /**
     * Manual update of payout status and transaction ID
     */
    async updatePayout(payoutId, data, adminId) {
        const { status, transaction_id } = data;
        
        const [existing] = await db.query('SELECT * FROM payouts WHERE id = ?', [payoutId]);
        if (existing.length === 0) throw new Error("Payout not found");
        
        const payout = existing[0];
        let updateQuery = 'UPDATE payouts SET updated_at = NOW()';
        const params = [];

        if (status) {
            // Logic: Payout can only be settled if due_date has passed
            if (status === 'settled') {
                if (!payout.due_date) {
                    throw new Error("Payout cannot be settled because the order has not been delivered yet.");
                }
                const now = new Date();
                const dueDate = new Date(payout.due_date);
                if (now < dueDate) {
                    const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                    throw new Error(`Payout is still in escrow. It can be settled on ${dueDate.toLocaleDateString()} (${daysRemaining} days remaining).`);
                }
            }
            updateQuery += ', status = ?';
            params.push(status);
            
            if (status === 'settled') {
                updateQuery += ', settled_at = NOW()';
            }
        }

        if (transaction_id !== undefined) {
            updateQuery += ', transaction_id = ?';
            params.push(transaction_id);
        }

        updateQuery += ' WHERE id = ?';
        params.push(payoutId);

        await db.query(updateQuery, params);
        
        // If settled, ensure ledger is updated too
        if (status === 'settled') {
            await db.query(
                'UPDATE ledger_entries SET status = "settled" WHERE reference_id = ? AND type = "seller_payout"',
                [payoutId]
            );
        } else if (status === 'failed') {
            await db.query(
                'UPDATE ledger_entries SET status = "failed" WHERE reference_id = ? AND type = "seller_payout"',
                [payoutId]
            );
        }

        logger.info(`Payout ${payoutId} updated by Admin ${adminId}`);
        return { success: true };
    }

    /**
     * Admin processes a payout (pending -> processing)
     */
    async processPayout(payoutId, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [payoutRows] = await connection.query(
                'SELECT * FROM payouts WHERE id = ? FOR UPDATE',
                [payoutId]
            );
            const payout = payoutRows[0];

            if (!payout) throw new Error("Payout not found");
            if (payout.status !== 'pending') throw new Error("Payout already processed or settled");

            // 1. Move to processing
            await connection.query(
                'UPDATE payouts SET status = "processing", processed_at = NOW() WHERE id = ?',
                [payoutId]
            );

            // 2. Create ledger entry
            await ledgerService.createEntry({
                order_id: payout.order_id,
                seller_id: payout.seller_id,
                type: 'seller_payout',
                amount: payout.amount,
                direction: 'debit',
                status: 'processing',
                reference_id: payout.id
            }, connection);

            await connection.commit();
            logger.info(`Payout ${payoutId} processed and ledger entry created.`);
            return payout;
        } catch (error) {
            await connection.rollback();
            logger.error(`Process payout error for ${payoutId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Admin settles a payout (processing -> settled)
     */
    async settlePayout(payoutId, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [payoutRows] = await connection.query(
                'SELECT * FROM payouts WHERE id = ? FOR UPDATE',
                [payoutId]
            );
            const payout = payoutRows[0];

            if (!payout) throw new Error("Payout not found");
            
            // Check due date - 15-day escrow enforcement
            if (!payout.due_date) {
                throw new Error("Payout cannot be settled/processed because the order has not been delivered yet.");
            }
            const now = new Date();
            if (now < new Date(payout.due_date)) {
                const dueDate = new Date(payout.due_date);
                const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                throw new Error(`Payout is still in escrow. It can be settled after ${dueDate.toLocaleDateString()} (${daysRemaining} days remaining).`);
            }

            if (payout.status !== 'processing') throw new Error("Payout is not in processing state");

            // 1. Update payout status
            await connection.query('UPDATE payouts SET status = "settled", settled_at = NOW() WHERE id = ?', [payoutId]);

            // 2. Update ledger entry status
            await connection.query(
                'UPDATE ledger_entries SET status = "settled" WHERE reference_id = ? AND type = "seller_payout"',
                [payoutId]
            );

            await connection.commit();
            logger.info(`Payout ${payoutId} settled successfully.`);
            return payout;
        } catch (error) {
            await connection.rollback();
            logger.error(`Settle payout error for ${payoutId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Admin marks a payout as failed (processing -> failed)
     */
    async failPayout(payoutId, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [payoutRows] = await connection.query(
                'SELECT * FROM payouts WHERE id = ? FOR UPDATE',
                [payoutId]
            );
            const payout = payoutRows[0];

            if (!payout) throw new Error("Payout not found");

            // 1. Update payout status
            await connection.query('UPDATE payouts SET status = "failed" WHERE id = ?', [payoutId]);

            // 2. Update ledger entry status
            await connection.query(
                'UPDATE ledger_entries SET status = "failed" WHERE reference_id = ? AND type = "seller_payout"',
                [payoutId]
            );

            await connection.commit();
            logger.warn(`Payout ${payoutId} marked as FAILED.`);
            return payout;
        } catch (error) {
            await connection.rollback();
            logger.error(`Fail payout error for ${payoutId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async getBySellerId(sellerId, filters = {}) {
        const { status, page, limit } = filters;
        
        let query = 'SELECT * FROM payouts WHERE seller_id = ?';
        const params = [sellerId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        // Add pagination if provided
        if (page && limit) {
            const offset = (page - 1) * limit;
            query += ' LIMIT ? OFFSET ?';
            params.push(Number(limit), Number(offset));
            
            // Get total count for pagination metadata
            let countQuery = 'SELECT COUNT(*) as count FROM payouts WHERE seller_id = ?';
            const countParams = [sellerId];
            if (status) {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }
            
            const [rows] = await db.query(query, params);
            const [totalRows] = await db.query(countQuery, countParams);
            
            return {
                data: rows,
                pagination: {
                    total: totalRows[0].count,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(totalRows[0].count / limit)
                }
            };
        } else {
            // Backward compatibility
            const [rows] = await db.query(query, params);
            return rows;
        }
    }
}

module.exports = new PayoutService();
