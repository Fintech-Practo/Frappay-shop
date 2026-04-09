const pool = require("../../config/db");
const commissionUtil = require("./commission.util");

const DEFAULT_GLOBAL_COMMISSION = 15.00;

/**
 * Get the effective commission rate for a product and seller
 * Hierarchy: Product Commission > Seller Commission > Global Commission
 * @param {number} productId
 * @param {number} sellerId
 * @returns {Promise<number>} Commission percentage
 */
async function getEffectiveCommissionRate(productId, sellerId) {
    const connection = await pool.getConnection();
    try {
        // 1. Check Product Override
        const [productRows] = await connection.query(
            "SELECT commission_percentage, product_type_code FROM products WHERE id = ?",
            [productId]
        );

        if (productRows.length > 0 && productRows[0].commission_percentage !== null) {
            return parseFloat(productRows[0].commission_percentage);
        }

        const productTypeCode = productRows.length > 0 ? productRows[0].product_type_code : null;

        // 2. Check Seller Override
        const [sellerRows] = await connection.query(
            "SELECT admin_commission_percentage FROM seller_analytics WHERE seller_id = ?",
            [sellerId]
        );

        if (sellerRows.length > 0 && sellerRows[0].admin_commission_percentage !== null) {
            return parseFloat(sellerRows[0].admin_commission_percentage);
        }

        // 3. Check Product Type Default
        if (productTypeCode) {
            const [typeRows] = await connection.query(
                "SELECT percentage FROM commission_settings WHERE type = ? AND is_active = TRUE LIMIT 1",
                [productTypeCode]
            );

            if (typeRows.length > 0) {
                return parseFloat(typeRows[0].percentage);
            }
        }

        // 4. Check Global Default
        const [globalRows] = await connection.query(
            "SELECT percentage FROM commission_settings WHERE type = 'GLOBAL' AND is_active = TRUE LIMIT 1"
        );

        if (globalRows.length > 0) {
            return parseFloat(globalRows[0].percentage);
        }

        return DEFAULT_GLOBAL_COMMISSION;
    } finally {
        connection.release();
    }
}

/**
 * Calculate commission financials asynchronously
 * @param {Object} item - { product_id, seller_id, price, quantity, product_type_code, format }
 */
async function calculateCommissionAsync(item) {
    const { product_id, seller_id, price, quantity } = item;

    // Get dynamic rate
    const commissionPercentage = await getEffectiveCommissionRate(product_id, seller_id);

    const gross = parseFloat(price) * parseInt(quantity);
    const commissionAmount = (gross * commissionPercentage) / 100;
    const sellerPayout = gross - commissionAmount;

    // Gateway fee removed
    const adminNetProfit = commissionAmount;

    return {
        gross: parseFloat(gross.toFixed(2)),
        commission_percentage: parseFloat(commissionPercentage.toFixed(2)),
        commission_amount: parseFloat(commissionAmount.toFixed(2)),
        seller_payout: parseFloat(sellerPayout.toFixed(2)),
        admin_net_profit: parseFloat(adminNetProfit.toFixed(2))
    };
}

module.exports = {
    getEffectiveCommissionRate,
    calculateCommissionAsync
};