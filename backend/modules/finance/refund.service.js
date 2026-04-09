const db = require('../../config/db');
const ledgerService = require('./ledger.service');
const logger = require('../../utils/logger');
const smsNotificationService = require('../../services/notificationService');

class RefundService {
    /**
     * Request a refund for a user (manual user request or auto return)
     */
    async requestRefund(data, connection = null) {
        const executor = connection || db;
        const {
            order_id,
            user_id,
            amount,
            status = 'pending',
            reason
        } = data;

        const query = `
            INSERT INTO refunds (order_id, user_id, amount, status, reason) 
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await executor.query(query, [order_id, user_id, amount, status, reason]);
        return result.insertId;
    }

    /**
     * Admin approves a refund (pending -> approved)
     */
    async approveRefund(refundId, adminId) {
        await db.query(
            'UPDATE refunds SET status = "approved" WHERE id = ?',
            [refundId]
        );
    }

    /**
     * Admin processes a refund (approved -> processing)
     */
    async processRefund(refundId, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [refundRows] = await connection.query(
                'SELECT * FROM refunds WHERE id = ? FOR UPDATE',
                [refundId]
            );
            const refund = refundRows[0];

            if (!refund) throw new Error("Refund not found");
            if (refund.status !== 'approved') throw new Error("Refund is not in approved state");

            // 1. Move to processing
            await connection.query('UPDATE refunds SET status = "processing" WHERE id = ?', [refundId]);

            // 2. Create ledger entry
            await ledgerService.createEntry({
                order_id: refund.order_id,
                user_id: refund.user_id,
                type: 'refund',
                amount: refund.amount,
                direction: 'debit',
                status: 'processing',
                reference_id: refund.id
            }, connection);

            // 📲 SMS Trigger
            smsNotificationService.sendRefundInitiatedSMS(refund.user_id, refund.order_id, refund.amount).catch((err) => {
                logger.error("Failed to send refund initiated SMS", { userId: refund.user_id, refundId, error: err.message });
            });

            await connection.commit();
            logger.info(`Refund ${refundId} processing and ledger entry created.`);
            return refund;
        } catch (error) {
            await connection.rollback();
            logger.error(`Process refund error for ${refundId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Admin settles a refund (processing -> settled)
     */
    async settleRefund(refundId, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [refundRows] = await connection.query(
                'SELECT * FROM refunds WHERE id = ? FOR UPDATE',
                [refundId]
            );
            const refund = refundRows[0];

            if (!refund) throw new Error("Refund not found");
            if (refund.status !== 'processing') throw new Error("Refund is not in processing state");

            // 1. Update refund status
            await connection.query(
                'UPDATE refunds SET status = "settled", refund_settled_at = NOW() WHERE id = ?',
                [refundId]
            );

            // 2. Update ledger entry status
            await connection.query(
                'UPDATE ledger_entries SET status = "settled" WHERE reference_id = ? AND type = "refund"',
                [refundId]
            );

            // 📲 SMS Trigger
            smsNotificationService.sendRefundCompletedSMS(refund.user_id, refund.order_id, refund.amount).catch((err) => {
                logger.error("Failed to send refund completed SMS", { userId: refund.user_id, refundId, error: err.message });
            });

            await connection.commit();
            logger.info(`Refund ${refundId} settled successfully.`);
            return refund;
        } catch (error) {
            await connection.rollback();
            logger.error(`Settle refund error for ${refundId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Admin marks a refund as failed (processing -> failed)
     */
    async failRefund(refundId, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [refundRows] = await connection.query(
                'SELECT * FROM refunds WHERE id = ? FOR UPDATE',
                [refundId]
            );
            const refund = refundRows[0];

            if (!refund) throw new Error("Refund not found");

            // 1. Update refund status
            await connection.query('UPDATE refunds SET status = "failed" WHERE id = ?', [refundId]);

            // 2. Update ledger entry status
            await connection.query(
                'UPDATE ledger_entries SET status = "failed" WHERE reference_id = ? AND type = "refund"',
                [refundId]
            );

            await connection.commit();
            logger.warn(`Refund ${refundId} marked as FAILED.`);
            return refund;
        } catch (error) {
            await connection.rollback();
            logger.error(`Fail refund error for ${refundId}:`, error);
            throw error;
            connection.release();
        }
    }

    /**
     * Admin fetch all refunds with details (Ledger view)
     */
    async getRefundLedger(filters = {}) {
        let query = `
            SELECT r.*, 
                   u.name as user_name, u.email as user_email,
                   o.invoice_number, o.total_payable_amount as order_amount,
                   ret.status as return_status, ret.reason as return_reason
            FROM refunds r
            JOIN users u ON r.user_id = u.id
            JOIN orders o ON r.order_id = o.id
            LEFT JOIN returns ret ON r.return_id = ret.id
        `;
        const params = [];
        const whereConditions = [];

        if (filters.status && filters.status !== 'all') {
            whereConditions.push(`r.status = ?`);
            params.push(filters.status);
        }

        if (filters.order_id) {
            whereConditions.push(`r.order_id = ?`);
            params.push(filters.order_id);
        }

        if (whereConditions.length > 0) {
            query += ` WHERE ` + whereConditions.join(' AND ');
        }

        query += ` ORDER BY r.created_at DESC`;

        const limit = parseInt(filters.limit) || 10;
        const page = parseInt(filters.page) || 1;
        const offset = (page - 1) * limit;

        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM refunds r';
        if (whereConditions.length > 0) {
            countQuery += ` WHERE ` + whereConditions.join(' AND ');
        }
        const [[{ total }]] = await db.query(countQuery, params.slice(0, whereConditions.length));

        return {
            items: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getByUserId(userId, filters = {}) {
        let query = 'SELECT * FROM refunds WHERE user_id = ?';
        const params = [userId];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await db.query(query, params);
        return rows;
    }
}

module.exports = new RefundService();
