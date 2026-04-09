const payoutService = require('./payout.service');
const refundService = require('./refund.service');
const ledgerService = require('./ledger.service');
const response = require('../../utils/response');
const logger = require('../../utils/logger');
const db = require('../../config/db');

class FinanceController {
    // Run migrations via API (internal or admin only)
    async runMigration(req, res) {
        const connection = await db.getConnection();
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS ledger_entries (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT DEFAULT NULL,
                    user_id INT DEFAULT NULL,
                    seller_id INT DEFAULT NULL,
                    type ENUM ('order_payment','seller_payout','refund','commission') NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    direction ENUM ('credit','debit') NOT NULL,
                    status ENUM ('pending','processing','settled') DEFAULT 'pending',
                    reference_id VARCHAR(100) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX idx_order (order_id),
                    INDEX idx_user (user_id),
                    INDEX idx_seller (seller_id),
                    INDEX idx_type (type),
                    INDEX idx_status (status)
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS payouts (
                    id VARCHAR(100) PRIMARY KEY,
                    seller_id INT NOT NULL,
                    order_id INT NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    status ENUM ('pending','processing','settled') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP NULL DEFAULT NULL,
                    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    INDEX idx_seller (seller_id),
                    INDEX idx_order (order_id),
                    INDEX idx_status (status)
                )
            `);

            try {
                await connection.query(`ALTER TABLE refunds MODIFY COLUMN status ENUM('pending','approved', 'processing', 'failed', 'settled') DEFAULT 'pending'`);
                await connection.query(`ALTER TABLE refunds ADD COLUMN IF NOT EXISTS reason TEXT AFTER status`);
                await connection.query(`ALTER TABLE refunds ADD COLUMN IF NOT EXISTS gateway_refund_id VARCHAR(100) DEFAULT NULL AFTER refund_settled_at`);
            } catch (err) {
                 logger.warn('Finance migration individual table update note: ' + err.message);
            }

            // 5. Add updated_at to payouts if missing
            await db.query(`
              ALTER TABLE payouts 
              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `).catch(err => console.log('updated_at might already exist or IF NOT EXISTS not supported, skipping...'));

            // 6. Add 'retrying' to refunds status ENUM if missing
            await db.query(`
              ALTER TABLE refunds 
              MODIFY COLUMN status ENUM('pending','approved','processing','failed','settled','retrying') DEFAULT 'pending'
            `).catch(err => console.log('Refunds status update failed or already updated, skipping...'));

            return response.success(res, null, "Finance tables migrated successfully");
        } catch (error) {
            logger.error('Finance migration failed:', error);
            return response.error(res, "Finance migration failed: " + error.message, 500);
        } finally {
            connection.release();
        }
    }

    async processPayout(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const data = await payoutService.processPayout(id, adminId);
            return response.success(res, data, "Payout processing initiated");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async settlePayout(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const data = await payoutService.settlePayout(id, adminId);
            return response.success(res, data, "Payout settled successfully");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async failPayout(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const data = await payoutService.failPayout(id, adminId);
            return response.success(res, data, "Payout marked as failed");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async approveRefund(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            await refundService.approveRefund(id, adminId);
            return response.success(res, null, "Refund approved");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async processRefund(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const data = await refundService.processRefund(id, adminId);
            return response.success(res, data, "Refund processing initiated");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async settleRefund(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const data = await refundService.settleRefund(id, adminId);
            return response.success(res, data, "Refund settled successfully");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async failRefund(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const data = await refundService.failRefund(id, adminId);
            return response.success(res, data, "Refund marked as failed");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async getSellerPayouts(req, res) {
        try {
            const sellerId = req.user.userId;
            const { status, page, limit } = req.query;
            const data = await payoutService.getBySellerId(sellerId, { status, page, limit });
            return response.success(res, data, "Seller payouts fetched");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async getUserRefunds(req, res) {
        try {
            const userId = req.user.userId;
            const { status } = req.query;
            const data = await refundService.getByUserId(userId, { status });
            return response.success(res, data, "User refunds fetched");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async getLedgerEntries(req, res) {
        try {
            const { order_id, seller_id } = req.query;
            let data;
            if (order_id) {
                data = await ledgerService.getByOrderId(order_id);
            } else if (seller_id) {
                data = await ledgerService.getBySellerId(seller_id);
            } else {
                return response.error(res, "Missing order_id or seller_id", 400);
            }
            return response.success(res, data, "Ledger entries fetched");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async getOrderLedger(req, res) {
        try {
            const { page = 1, limit = 10, format } = req.query;
            
            // If exporting ALL for CSV, we might want to increase limit or handle differently
            const filters = { 
                page: format === 'csv' ? 1 : Number(page), 
                limit: format === 'csv' ? 1000 : Number(limit) 
            };

            const data = await ledgerService.getOrderLedger(filters);

            if (format === 'csv') {
                const csvData = convertToCSV(data.data);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=order_ledger.csv');
                return res.status(200).send(csvData);
            }

            return response.success(res, data, "Order ledger fetched");
        } catch (error) {
            logger.error('Error in getOrderLedger:', error);
            return response.error(res, error.message, 500);
        }
    }

    async getPayoutLedger(req, res) {
        try {
            const { page = 1, limit = 10, status, seller_id, format } = req.query;
            const filters = {
                status,
                seller_id,
                page: format === 'csv' ? 1 : Number(page),
                limit: format === 'csv' ? 1000 : Number(limit)
            };
            const data = await payoutService.getPayoutLedger(filters);

            if (format === 'csv') {
                const csvData = convertToCSV(data.data);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=payout_ledger.csv');
                return res.status(200).send(csvData);
            }

            return response.success(res, data, "Payout ledger fetched");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async getRefundLedger(req, res) {
        try {
            const { page = 1, limit = 10, status, order_id, format } = req.query;
            const filters = {
                status,
                order_id,
                page: format === 'csv' ? 1 : Number(page),
                limit: format === 'csv' ? 1000 : Number(limit)
            };
            const data = await refundService.getRefundLedger(filters);

            if (format === 'csv') {
                const csvData = convertToCSV(data.items);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=refund_ledger.csv');
                return res.status(200).send(csvData);
            }

            return response.success(res, data, "Refund ledger fetched");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }

    async updatePayout(req, res) {
        try {
            const { id } = req.params;
            const { status, transaction_id } = req.body;
            const adminId = req.user.userId;
            const result = await payoutService.updatePayout(id, { status, transaction_id }, adminId);
            return response.success(res, result, "Payout updated successfully");
        } catch (error) {
            return response.error(res, error.message, 500);
        }
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).filter(k => k !== 'pagination').join(',');
    const rows = data.map(row => {
        return Object.keys(row).filter(k => k !== 'pagination').map(key => {
            let value = row[key];
            // Handle objects/arrays (like seller_names)
            if (value !== null && typeof value === 'object') {
                value = JSON.stringify(value);
            }
            const strValue = String(value || '');
            if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        }).join(',');
    });
    return [headers, ...rows].join('\n');
}

module.exports = new FinanceController();
