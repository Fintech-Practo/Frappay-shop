const pool = require("../../config/db");

const DEFAULT_MARGIN = 20;

/**
 * Fetch dynamic shipping margin from DB based on order amount
 */
async function getDynamicMargin(orderAmount) {
    if (Number(orderAmount) > 1500) return 0;
    try {
        const [rules] = await pool.query(
            `SELECT margin_amount, margin_type 
             FROM shipping_margin_rules 
             WHERE ? BETWEEN min_order_amount AND max_order_amount 
             AND is_active = 1 
             LIMIT 1`,
            [orderAmount || 0]
        );

        if (rules.length > 0) {
            const rule = rules[0];
            if (rule.margin_type === 'percentage') {
                return ((orderAmount || 0) * parseFloat(rule.margin_amount)) / 100;
            } else {
                return parseFloat(rule.margin_amount);
            }
        }
    } catch (e) {
        console.error("Failed to fetch dynamic margin, using fallback.", e);
    }
    return DEFAULT_MARGIN;
}

module.exports = {
    getDynamicMargin
};
