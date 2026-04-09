const cron = require('node-cron');
const db = require('../config/db');
const logger = require('../utils/logger');
const refundService = require('../modules/payment/refund.service');
const notificationService = require('../modules/notification/notification.service');

/**
 * Job 1: Retry Failed Refunds (Every 30 minutes)
 * Retries refunds that are in FAILED or RETRYING status and have less than 3 attempts.
 */
const retryFailedRefunds = cron.schedule('*/30 * * * *', async () => {
    logger.info('Running cron job: retryFailedRefunds');
    
    try {
        const [failedRefunds] = await db.query(
            `SELECT id, order_id, retry_count 
             FROM refunds 
             WHERE status IN ('failed', 'retrying') 
             AND retry_count < 3`
        );

        if (failedRefunds.length === 0) {
            logger.info('No failed refunds to retry.');
            return;
        }

        for (const refund of failedRefunds) {
            try {
                logger.info(`Retrying refund ${refund.id} for order ${refund.order_id} (Attempt ${refund.retry_count + 1})`);
                
                // Update status to retrying before processing
                await db.query(
                    "UPDATE refunds SET status = 'retrying' WHERE id = ?",
                    [refund.id]
                );

                await refundService.processRefund(refund.order_id); 
                
                logger.info(`Successfully retried refund ${refund.id}`);
            } catch (retryErr) {
                logger.error(`Retry attempt ${refund.retry_count + 1} failed for refund ${refund.id}`, { error: retryErr.message });
                // Note: increment occurs inside processRefund for failures
            }
        }
    } catch (err) {
        logger.error('Error in retryFailedRefunds cron job', { error: err.message });
    }
});

/**
 * Job 2: SLA Monitoring (Daily at 9:00 AM)
 * Identifies refunds that have been pending/processing for more than 15 days since RTO completion.
 */
const monitorRefundSLA = cron.schedule('0 9 * * *', async () => {
    logger.info('Running cron job: monitorRefundSLA');

    try {
        const [delayedRefunds] = await db.query(
            `SELECT r.id, r.order_id, r.user_id, r.amount, r.rto_completed_at, u.name as user_name
             FROM refunds r
             JOIN users u ON r.user_id = u.id
             WHERE r.status NOT IN ('SETTLED', 'COMPLETED')
             AND DATEDIFF(NOW(), r.rto_completed_at) > 15`
        );

        if (delayedRefunds.length === 0) {
            logger.info('No delayed refunds detected.');
            return;
        }

        for (const refund of delayedRefunds) {
            const delayDays = Math.floor((new Date() - new Date(refund.rto_completed_at)) / (86400000));
            
            logger.warn(`SLA BREACH: Refund ${refund.id} for Order #${refund.order_id} is delayed by ${delayDays} days!`);

            // Alert admin (System Notification)
            const [admins] = await db.query("SELECT id FROM users WHERE role = 'ADMIN'");
            for (const admin of admins) {
                await notificationService.sendNotification(
                    admin.id,
                    'SYSTEM',
                    'SLA Breach Alert',
                    `CRITICAL: Refund for Order #${refund.order_id} (User: ${refund.user_name}) is delayed by ${delayDays} days. Action required!`,
                    'ORDER',
                    refund.order_id
                );
            }
        }
    } catch (err) {
        logger.error('Error in monitorRefundSLA cron job', { error: err.message });
    }
});

module.exports = {
    retryFailedRefunds,
    monitorRefundSLA
};
