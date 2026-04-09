const pool = require("../../config/db");

class RewardRuleService {
    async createRule(ruleData) {
        const { min_commission, max_commission, coins_per_100, active } = ruleData;
        const [result] = await pool.query(
            "INSERT INTO reward_coin_rules (min_commission, max_commission, coins_per_100, active) VALUES (?, ?, ?, ?)",
            [min_commission, max_commission, coins_per_100, active !== undefined ? active : true]
        );
        return { id: result.insertId, ...ruleData };
    }

    async listRules() {
        const [rows] = await pool.query("SELECT * FROM reward_coin_rules ORDER BY min_commission ASC");
        return rows;
    }

    async updateRule(id, ruleData) {
        const { min_commission, max_commission, coins_per_100, active } = ruleData;
        await pool.query(
            "UPDATE reward_coin_rules SET min_commission = ?, max_commission = ?, coins_per_100 = ?, active = ? WHERE id = ?",
            [min_commission, max_commission, coins_per_100, active, id]
        );
        return { id, ...ruleData };
    }

    async toggleStatus(id, active) {
        await pool.query("UPDATE reward_coin_rules SET active = ? WHERE id = ?", [active, id]);
        return { id, active };
    }

    async deleteRule(id) {
        await pool.query("DELETE FROM reward_coin_rules WHERE id = ?", [id]);
        return { id, deleted: true };
    }
}

module.exports = new RewardRuleService();
