const db = require("../../config/db");

class RewardService {

    async getActiveRules() {
        try {
            const [rows] = await db.query(
                "SELECT * FROM reward_rules WHERE active = 1 ORDER BY created_at DESC LIMIT 1"
            );

            const rules = rows[0];

            // Fallback default rules
            return rules || {
                min_commission_percent: 15,
                coins_per_100: 5,
                coin_value: 0.05,
                max_coins_per_order_percent: 20
            };
        } catch (err) {
            console.error("Failed to fetch reward rules", err);
            return {
                min_commission_percent: 15,
                coins_per_100: 5,
                coin_value: 0.05,
                max_coins_per_order_percent: 20
            };
        }
    }

    /**
     * Calculate potential coins reward for a product/orderValue
     * Based on seller commission safety layer
     */
    async calculateCoins(productCommission, orderValue) {
        const rules = await this.getActiveRules();

        if (Number(productCommission) < Number(rules.min_commission_percent)) {
            return 0;
        }

        // Each ₹100 gives X coins
        const coins = Math.floor(orderValue / 100) * rules.coins_per_100;
        return coins;
    }

    /**
     * Calculate value of coins in Rupees
     */
    async getCoinsValue(coins) {
        const rules = await this.getActiveRules();
        return coins * Number(rules.coin_value);
    }

    /**
     * Check if product is eligible for coupon/coins
     */
    async isEligibleForPromotions(productCommission) {
        const rules = await this.getActiveRules();
        return Number(productCommission) >= Number(rules.min_commission_percent);
    }

}

module.exports = new RewardService();
