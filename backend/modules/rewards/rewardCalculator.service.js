const pool = require("../../config/db");

class RewardCalculatorService {
    /**
     * Find rule where commission falls within range and rule is active
     */
    async findRule(commission) {
        try {
            const [rows] = await pool.query(
                "SELECT * FROM reward_coin_rules WHERE ? >= min_commission AND ? <= max_commission AND active = true LIMIT 1",
                [commission, commission]
            );
            return rows[0] || null;
        } catch (err) {
            console.error("Error finding reward rule:", err);
            return null;
        }
    }

    /**
     * Calculate reward coins based on price and commission
     * coins = floor(price / 100) * coins_per_100
     */
    async calculateCoins(price, commission) {
        let rule = await this.findRule(commission);

        // If no specific rule for this commission, try global commission
        if (!rule) {
            const [globalRows] = await pool.query("SELECT percentage FROM commission_settings WHERE type = 'GLOBAL' LIMIT 1");
            const globalComm = globalRows.length > 0 ? globalRows[0].percentage : 10;
            rule = await this.findRule(globalComm);
        }

        if (!rule) return 0;

        const baseUnits = Math.floor(price / 100);
        return baseUnits * rule.coins_per_100;
    }

    /**
     * Get estimated coins for product display
     * @param {number} price - Product selling price
     * @param {number} commission - Seller commission percentage
     * @returns {Object} - Result with coins and rule identifier
     */
    async getEstimate(price, commission) {
        let rule = await this.findRule(commission);

        // Fallback to global commission
        if (!rule) {
            const [globalRows] = await pool.query("SELECT percentage FROM commission_settings WHERE type = 'GLOBAL' LIMIT 1");
            const globalComm = globalRows.length > 0 ? globalRows[0].percentage : 10;
            rule = await this.findRule(globalComm);
        }

        if (!rule) return { coins: 0, rule_id: null };

        const coins = Math.floor(price / 100) * rule.coins_per_100;
        return {
            coins,
            rule_id: rule.id,
            coins_per_100: rule.coins_per_100
        };
    }

    /**
     * Get reward snapshot for order placement
     */
    async getRewardSnapshot(price, commission) {
        let rule = await this.findRule(commission);

        // Fallback
        if (!rule) {
            const [globalRows] = await pool.query("SELECT percentage FROM commission_settings WHERE type = 'GLOBAL' LIMIT 1");
            const globalComm = globalRows.length > 0 ? globalRows[0].percentage : 10;
            rule = await this.findRule(globalComm);
        }

        if (!rule) return null;

        const coins = Math.floor(price / 100) * rule.coins_per_100;
        return {
            reward_coins: coins,
            reward_rule_id: rule.id,
            reward_commission_snapshot: commission || 0 // Store actual commission if possible
        };
    }
}

module.exports = new RewardCalculatorService();
