const db = require("../../config/db");
const rewardService = require("../rewards/reward.service");

class WalletService {

    /* ------------------------------
        Helper Functions
    --------------------------------*/

    async coinsToRupees(coins) {
        return rewardService.getCoinsValue(coins);
    }

    async calculateEarnCoins(productCommission, amount) {
        return rewardService.calculateCoins(productCommission, amount);
    }

    async getWallet(userId) {
        const [rows] = await db.query(
            "SELECT * FROM user_wallets WHERE user_id = ? LIMIT 1",
            [userId]
        );

        let wallet = rows[0];

        if (!wallet) {
            const [result] = await db.query(
                "INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_redeemed) VALUES (?, 0, 0, 0)",
                [userId]
            );

            const [newRows] = await db.query(
                "SELECT * FROM user_wallets WHERE id = ?",
                [result.insertId]
            );
            wallet = newRows[0];
        }

        return wallet;
    }

    async getTransactions(userId) {
        const [rows] = await db.query(
            "SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        );
        return rows;
    }

    /* ------------------------------
        Redeem Coins
    --------------------------------*/

    async redeemCoins(userId, coins) {
        if (coins <= 0) {
            throw new Error("Invalid coin amount");
        }

        const walletRewardService = require("./walletReward.service");
        const canRedeem = await walletRewardService.canRedeem(userId, coins);
        if (!canRedeem) {
            throw new Error("Insufficient redeemable coins");
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Lock the wallet row to prevent race conditions
            const [rows] = await conn.query(
                "SELECT id, coin_balance FROM user_wallets WHERE user_id = ? FOR UPDATE",
                [userId]
            );

            const wallet = rows[0];
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            // Hard guard: never allow balance to go negative
            if (wallet.coin_balance < coins) {
                throw new Error("Insufficient coin balance");
            }

            const discountValue = await this.coinsToRupees(coins);

            // Atomically deduct with a DB-level guard (won't execute if balance < coins)
            const [result] = await conn.query(
                "UPDATE user_wallets SET coin_balance = coin_balance - ?, total_redeemed = total_redeemed + ?, updated_at = NOW() WHERE user_id = ? AND coin_balance >= ?",
                [coins, coins, userId, coins]
            );

            if (result.affectedRows === 0) {
                throw new Error("Coin deduction failed: insufficient balance");
            }

            // Insert transaction record
            await conn.query(
                "INSERT INTO wallet_transactions (user_id, coins, type, description, status) VALUES (?, ?, 'redeem', 'Coins redeemed during checkout', 'completed')",
                [userId, -coins]
            );

            await conn.commit();
            return {
                coins_used: coins,
                discount_value: discountValue
            };

        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    /* ------------------------------
        Add Coins After Delivery
    --------------------------------*/

    async addCoinsAfterDelivery(userId, orderId, productCommission, amount) {
        const coins = await this.calculateEarnCoins(productCommission, amount);
        if (coins <= 0) return 0;

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                "SELECT * FROM user_wallets WHERE user_id = ? FOR UPDATE",
                [userId]
            );

            let wallet = rows[0];

            if (!wallet) {
                await conn.query(
                    "INSERT INTO user_wallets (user_id, coin_balance, total_earned) VALUES (?, ?, ?)",
                    [userId, coins, coins]
                );
            } else {
                // Use GREATEST(0, ...) as extra safety although adding should never go negative
                await conn.query(
                    "UPDATE user_wallets SET coin_balance = GREATEST(0, coin_balance + ?), total_earned = total_earned + ? WHERE user_id = ?",
                    [coins, coins, userId]
                );
            }

            await conn.query(
                "INSERT INTO wallet_transactions (user_id, order_id, coins, type, description) VALUES (?, ?, ?, 'earn', 'Reward coins for delivered order')",
                [userId, orderId, coins]
            );

            await conn.commit();
            return coins;

        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }
}

module.exports = new WalletService();