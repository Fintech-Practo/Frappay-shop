const db = require("../../config/db");
const rewardService = require("../rewards/reward.service");
const walletService = require("../wallet/wallet.service");
const couponService = require("../coupons/coupon.service");

class PromotionService {

    /**
     * Calculate final price for checkout
     * Includes commission safety layer check
     */
    async calculateCheckoutTotal(cartItems, cartTotal, couponId, coinsToUse, userId) {

        let couponDiscount = 0;
        let coinDiscount = 0;
        let availablePromotions = true;

        // 1. Commission Safety Layer Check
        // If any product in cart has commission < 15%, disable promotions for the WHOLE order 
        for (const item of cartItems) {
            const isEligible = await rewardService.isEligibleForPromotions(item.seller_commission);
            if (!isEligible) {
                availablePromotions = false;
                break;
            }
        }

        if (!availablePromotions) {
            return {
                baseTotal: cartTotal,
                couponDiscount: 0,
                coinDiscount: 0,
                finalTotal: cartTotal,
                appliedPromotions: false,
                reason: "Commission below threshold for some products"
            };
        }

        // 2. Coupon Logic
        if (couponId && userId) {
            try {
                const coupon = await db("coupons").where({ id: couponId, is_active: 1 }).first();
                if (coupon) {
                    couponDiscount = couponService.calculateDiscount(coupon, cartTotal);
                }
            } catch (err) {
                console.error("Coupon calculation failed", err);
            }
        }

        // 3. Coin Redemption Logic
        if (coinsToUse && userId) {
            const rules = await rewardService.getActiveRules();
            const coinValue = await rewardService.getCoinsValue(coinsToUse);

            // Max 20% order value safety
            const maxCoinDiscount = cartTotal * (rules.max_coins_per_order_percent / 100);
            coinDiscount = Math.min(coinValue, maxCoinDiscount);
        }

        const finalAmount = cartTotal - couponDiscount - coinDiscount;

        return {
            baseTotal: cartTotal,
            couponDiscount,
            coinDiscount,
            finalTotal: Math.max(finalAmount, 0),
            appliedPromotions: true
        };
    }

}

module.exports = new PromotionService();