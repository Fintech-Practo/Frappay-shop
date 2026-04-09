const ledgerService = require('./ledger.service');
const payoutService = require('./payout.service');
const db = require('../../config/db');
const logger = require('../../utils/logger');

class FinanceService {
    /**
     * Handle financial recording for a successful order payment
     * @param {Object} order - The created order object
     * @param {Array} items - The order items with individual payouts/commissions
     * @param {Object} connection - Transaction connection
     */
    async handleOrderPayment(order, items, connection) {
        try {
            // 1. Record total payment received by platform (Credit Ledger)
            await ledgerService.createEntry({
                order_id: order.id,
                user_id: order.user_id,
                type: 'order_payment',
                amount: order.total_payable_amount,
                direction: 'credit',
                status: 'settled', // Money is already in gateway
                reference_id: order.payment_session_id // Link to payment
            }, connection);

            // 2. Record individual seller payouts (Pending Payouts)
            // Group by seller for payout records
            const sellerPayouts = new Map();
            items.forEach(item => {
                if (item.seller_id) {
                    const current = sellerPayouts.get(item.seller_id) || 0;
                    sellerPayouts.set(item.seller_id, current + Number(item.seller_payout || 0));
                }
            });

            for (const [sellerId, amount] of sellerPayouts.entries()) {
                if (amount > 0) {
                    const payoutId = `pay_${order.id}_${sellerId}_${Date.now()}`;
                    await payoutService.createPayout({
                        id: payoutId,
                        seller_id: sellerId,
                        order_id: order.id,
                        amount: amount,
                        status: 'pending'
                    }, connection);
                }
            }

            // 3. Record Admin Commission (Credit Ledger)
            if (order.admin_commission_total > 0) {
                await ledgerService.createEntry({
                    order_id: order.id,
                    type: 'commission',
                    amount: order.admin_commission_total,
                    direction: 'credit',
                    status: 'settled'
                }, connection);
            }

            logger.info(`Finance records initialized for order ${order.id}`);
        } catch (error) {
            logger.error(`Finance handling failed for order ${order.id}:`, error);
            throw error;
        }
    }
}

module.exports = new FinanceService();
