const db = require('../../config/db');
const logger = require('../../utils/logger');
const cron = require('node-cron');

class AnalyticsScheduler {
    constructor() {
        this.scheduleJobs();
    }

    scheduleJobs() {
        // Run every day at midnight
        cron.schedule('0 0 * * *', async () => {
            logger.info('Running daily analytics aggregation job');
            await this.aggregateDailyStats();
        });

        // Run immediately on startup (for demo/dev purposes)
        // In production, you might want to check if today's stats exist first
        this.aggregateDailyStats();
    }

    async aggregateDailyStats(targetDate = new Date()) {
        try {
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            const dateStr = startOfDay.toISOString().split('T')[0];

            // Fetch raw data for the day
            const [orders] = await db.execute(
                `SELECT * FROM orders WHERE created_at BETWEEN ? AND ? AND status != 'CANCELLED'`,
                [startOfDay, endOfDay]
            );

            const [users] = await db.execute(
                `SELECT * FROM users WHERE created_at BETWEEN ? AND ? AND role = 'USER'`,
                [startOfDay, endOfDay]
            );

            const [activeUsers] = await db.execute(
                `SELECT COUNT(DISTINCT user_id) as count FROM orders WHERE created_at >= DATE_SUB(?, INTERVAL 30 DAY)`,
                [endOfDay]
            );

            // --- 1. Basic Metrics ---
            const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
            const totalOrders = orders.length;
            const newUsers = users.length;
            const activeUserCount = activeUsers[0].count; // Simplified active user metric

            // --- 2. Advanced Metrics ---

            // Calculate Gross Profit (Revenue - Commission)
            // This assumes we can calculate commission. If commission is separate, we'd fetch it.
            // For now, let's use the logic: total_amount - seller_payout_total (if available) or estimate
            // Based on schema, orders has 'admin_net_profit'
            const grossProfit = orders.reduce((sum, order) => sum + Number(order.admin_net_profit || 0), 0);

            // Calculate Cart Abandonment
            // Cart items created today vs Orders created today by unique users
            const [cartsInfo] = await db.execute(
                `SELECT COUNT(DISTINCT user_id) as cart_users FROM carts WHERE updated_at BETWEEN ? AND ?`,
                [startOfDay, endOfDay]
            );
            const [orderUsers] = await db.execute(
                `SELECT COUNT(DISTINCT user_id) as order_users FROM orders WHERE created_at BETWEEN ? AND ?`,
                [startOfDay, endOfDay]
            );

            const distinctCartUsers = cartsInfo[0].cart_users || 0;
            const distinctOrderUsers = orderUsers[0].order_users || 0;
            let abandonmentRate = 0;
            if (distinctCartUsers > 0) {
                abandonmentRate = ((distinctCartUsers - distinctOrderUsers) / distinctCartUsers) * 100;
                if (abandonmentRate < 0) abandonmentRate = 0; // Should not happen but safety check
            }

            // Upsert into analytics_daily_stats
            await db.execute(`
        INSERT INTO analytics_daily_stats 
        (date, total_revenue, total_orders, active_users, new_users, gross_profit, cart_abandonment_rate, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        total_revenue = VALUES(total_revenue),
        total_orders = VALUES(total_orders),
        active_users = VALUES(active_users),
        new_users = VALUES(new_users),
        gross_profit = VALUES(gross_profit),
        cart_abandonment_rate = VALUES(cart_abandonment_rate),
        updated_at = NOW()
      `, [dateStr, totalRevenue, totalOrders, activeUserCount, newUsers, grossProfit, abandonmentRate]);

            logger.info(`Daily analytics gathered for ${dateStr}`);

        } catch (error) {
            logger.error('Error aggregating daily stats:', error);
        }
    }
}

module.exports = new AnalyticsScheduler();