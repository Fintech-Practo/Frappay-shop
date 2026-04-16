const pool = require("../../config/db");
const logger = require("../../utils/logger");

class WalletRewardService {
    /**
     * Credit coins for an order item after delivery
     * @param {number} orderId 
     * @param {number} userId 
     */
    async creditOrderRewards(orderId, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Get all items for this order that have reward coins and haven't been credited yet
            const [items] = await connection.query(
                "SELECT id, reward_coins, product_title FROM order_items WHERE order_id = ? AND reward_coins > 0 AND reward_unlock_at IS NULL",
                [orderId]
            );

            if (items.length === 0) {
                await connection.rollback();
                connection.release();
                return;
            }

            const now = new Date();
            const unlockAt = new Date();
            unlockAt.setMonth(unlockAt.getMonth() + 3); // 3 months expiry
            for (const item of items) {
                // 2. Insert into wallet_transactions
                await connection.query(
                    `INSERT INTO wallet_transactions 
                    (user_id, order_id, coins, type, description, status, unlock_at) 
                    VALUES (?, ?, ?, 'earn', ?, 'unlocked', ?)`,
                    [
                        userId,
                        orderId,
                        item.reward_coins,
                        `Reward for ${item.product_title}`,
                        unlockAt
                    ]
                );

                // 3. Mark the order item as reward-processed (store unlock_at)
                await connection.query(
                    "UPDATE order_items SET reward_unlock_at = ? WHERE id = ?",
                    [unlockAt, item.id]
                );
            }

            // 4. Update user's wallet (ensure it exists first)
            const [walletRows] = await connection.query(
                "SELECT id FROM user_wallets WHERE user_id = ?",
                [userId]
            );

            const rewardTotal = items.reduce((sum, item) => sum + item.reward_coins, 0);

            if (walletRows.length === 0) {
                await connection.query(
                    "INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_redeemed) VALUES (?, ?, ?, 0)",
                    [userId, rewardTotal, rewardTotal]
                );
            } else {
                await connection.query(
                    "UPDATE user_wallets SET coin_balance = GREATEST(0, coin_balance + ?), total_earned = total_earned + ? WHERE user_id = ?",
                    [rewardTotal, rewardTotal, userId]
                );
            }

            await connection.commit();
            logger.info("Order rewards credited. Expire in 45 days.", { orderId, userId, itemsCount: items.length, totalCoins: rewardTotal });
        } catch (err) {
            await connection.rollback();
            logger.error("Failed to credit order rewards", { orderId, error: err.message });
            throw err;
        } finally {
            connection.release();
        }
    }

    async getRedeemableBalance(userId) {
        try {
            // Read directly from user_wallets.coin_balance — this is the authoritative balance
            const [rows] = await pool.query(
                "SELECT GREATEST(0, coin_balance) as balance FROM user_wallets WHERE user_id = ?",
                [userId]
            );

            if (!rows || rows.length === 0) return 0;
            return Math.max(0, Number(rows[0].balance) || 0);
        } catch (err) {
            logger.error("Error fetching redeemable balance", { userId, error: err.message });
            return 0;
        }
    }

    /**
     * Convert coins to currency value
     * 20 coins = ₹1
     */
    async coinsToRupees(coins) {
        const rewardService = require("../rewards/reward.service");
        return rewardService.getCoinsValue(coins);
    }

    /**
     * Validate if amount of coins can be redeemed
     */
    async canRedeem(userId, coinsToRedeem) {
        const available = await this.getRedeemableBalance(userId);
        return available >= coinsToRedeem;
    }
}

module.exports = new WalletRewardService();