const pool = require("../../config/db");
const productModel = require("../product/product.model");
const crypto = require("crypto");
const commissionUtil = require("../commission/commission.util");
const commissionService = require("../commission/commission.service");
const couponService = require("../coupons/coupon.service");
const walletService = require("../wallet/wallet.service");
const walletRewardService = require("../wallet/walletReward.service");
const rewardCalculatorService = require("../rewards/rewardCalculator.service");

// 10 minutes expiry
const SESSION_EXPIRY_MS = 10 * 60 * 1000;

async function createSession(userId, items, type = 'buynow', sessionMetadata = {}) {
    if (!items || items.length === 0) {
        throw new Error("No items provided for checkout session");
    }

    // 1. Fetch latest prices and validate stock
    const productIds = [...new Set(items.map(i => i.product_id))];
    const products = await productModel.findByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    let subtotal = 0;
    let adminCommissionTotal = 0;
    let gatewayFeeTotal = 0;
    let adminNetProfitTotal = 0;
    let sellerPayoutTotal = 0;
    const validatedItems = [];
    const itemFormats = [];

    for (const item of items) {
        const product = productMap.get(item.product_id);

        if (!product) {
            throw new Error(`Product not found: ID ${item.product_id}`);
        }

        if (!product.is_active) {
            throw new Error(`Product is unavailable: ${product.title}`);
        }

        let resolvedFormat;
        try {
            resolvedFormat = commissionUtil.resolvePurchaseFormat({
                product_format: product.format,
                purchase_format: item.purchase_format
            });
        } catch (err) {
            throw new Error(`Format resolution failed for ${product.title}: ${err.message}`);
        }

        const isDigital = commissionUtil.isDigitalFormat(resolvedFormat);

        if (!isDigital && !product.is_unlimited_stock && product.stock < item.quantity) {
            throw new Error(`Insufficient stock for: ${product.title}`);
        }

        const price = parseFloat(product.selling_price);
        const commissionCalc = await commissionService.calculateCommissionAsync({
            product_id: product.id,
            seller_id: product.seller_id,
            price: price,
            quantity: item.quantity,
            product_type_code: product.product_type_code,
            format: resolvedFormat
        });

        const lineSubtotal = commissionCalc.gross;
        subtotal += lineSubtotal;
        adminCommissionTotal += commissionCalc.commission_amount;
        gatewayFeeTotal += commissionCalc.gateway_fee;
        adminNetProfitTotal += commissionCalc.admin_net_profit;
        sellerPayoutTotal += commissionCalc.seller_payout;

        validatedItems.push({
            product_id: product.id,
            product_title: product.title,
            image_url: product.image_url,
            seller_id: product.seller_id,
            quantity: item.quantity,
            price: price,
            subtotal: lineSubtotal,
            product_type_code: product.product_type_code,
            format: resolvedFormat,
            commission_percentage: commissionCalc.commission_percentage,
            commission_amount: commissionCalc.commission_amount,
            seller_payout: commissionCalc.seller_payout,
            admin_net_profit: commissionCalc.admin_net_profit,
            is_unlimited_stock: product.is_unlimited_stock,
            // Reward Snapshot
            ...(await rewardCalculatorService.getRewardSnapshot(price, commissionCalc.commission_percentage))
        });

        itemFormats.push(resolvedFormat);
    }

    const hasDigital = itemFormats.some(f => f === 'EBOOK');
    const hasPhysical = itemFormats.some(f => f === 'PHYSICAL');

    if (hasDigital && hasPhysical) {
        throw new Error("Digital and physical items cannot be purchased together. Please checkout separately.");
    }

    const checkout_kind = hasDigital ? 'DIGITAL' : 'PHYSICAL';
    
    // 1.5 Minimum Order Value (MOV) Check (₹100) - Physical Only
    if (checkout_kind === 'PHYSICAL' && subtotal < 100) {
        throw new Error("Minimum order value for physical products is ₹100. Please add more items to your cart.");
    }

    const env = require("../../config/env");
    const platform_fee = checkout_kind === 'PHYSICAL' ? (env.platformFee || 0) : 0;

    // 2. Automated Welcome Coupon for First Order
    let autoCoupon = null;
    const [orders] = await pool.query("SELECT id FROM orders WHERE user_id = ? LIMIT 1", [userId]);
    if (orders.length === 0) {
        try {
            let welcomeCouponData = await couponService.getWelcomeCoupon();
            // Fallback to "WELCOME5" if no coupon is specifically marked as welcome in the DB
            if (!welcomeCouponData) {
                try {
                    const fallback = await couponService.validateCoupon("WELCOME5", subtotal, userId);
                    if (fallback) autoCoupon = fallback;
                } catch (e) { /* ignore */ }
            } else {
                const welcomeCoupon = await couponService.validateCoupon(welcomeCouponData.code, subtotal, userId);
                if (welcomeCoupon) {
                    autoCoupon = welcomeCoupon;
                }
            }
        } catch (e) {
            // Ignore if welcome coupon doesn't exist or isn't applicable
        }
    }

    // 3. Normalise and persist payment_method in session snapshot
    // STEP 1 FIX: payment_method is now part of every checkout session
    const rawPaymentMethod = sessionMetadata.payment_method || 'COD';
    const payment_method = rawPaymentMethod.toUpperCase() === 'ONLINE' ||
        rawPaymentMethod === 'online' ||
        rawPaymentMethod === 'online_payment'
        ? 'ONLINE'
        : 'COD';

    // 4. Generate Session Data
    const sessionId = crypto.randomUUID();
    const sessionData = {
        items: validatedItems,
        subtotal: subtotal,
        platform_fee: platform_fee,
        total_amount: subtotal + platform_fee, // This will be updated with shipping/coupons/coins
        type: type,
        checkout_kind: checkout_kind,
        // ---- PAYMENT METHOD PERSISTED ----
        payment_method: payment_method,
        // ----------------------------------
        applied_coupon: autoCoupon,
        applied_coins: 0,
        coin_discount: 0,
        coupon_discount: autoCoupon ? autoCoupon.discountAmount : 0,
        shipping_charge: 0,
        totals: {
            gross_total: (subtotal - (autoCoupon ? autoCoupon.discountAmount : 0)) + platform_fee,
            subtotal: subtotal,
            admin_commission_total: adminCommissionTotal,
            gateway_fee_total: gatewayFeeTotal,
            admin_net_profit_total: adminNetProfitTotal,
            seller_payout_total: sellerPayoutTotal
        },
        source: sessionMetadata.source || (type === 'buynow' ? 'product_details' : 'cart'),
        ...(sessionMetadata.product_id && { product_id: sessionMetadata.product_id }),
        ...(sessionMetadata.product_url && { product_url: sessionMetadata.product_url }),
        // 🔥 NEW: Capture address_id if provided at session start
        address_id: sessionMetadata.address_id || null
    };

    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    await pool.query(
        `INSERT INTO checkout_sessions (id, user_id, session_data, expires_at, status) VALUES (?, ?, ?, ?, ?)`,
        [sessionId, userId, JSON.stringify(sessionData), expiresAt, 'ACTIVE']
    );

    return {
        sessionId,
        expiresAt,
        ...sessionData
    };
}

async function getSession(sessionId, userId) {
    const [rows] = await pool.query(
        `SELECT * FROM checkout_sessions WHERE id = ?`,
        [sessionId]
    );

    if (rows.length === 0) {
        throw new Error("Session not found");
    }

    const session = rows[0];

    if (session.user_id !== userId) {
        throw new Error("Access denied to this checkout session");
    }

    if (new Date() > new Date(session.expires_at)) {
        throw new Error("Checkout session expired");
    }

    if (session.status !== 'ACTIVE' && session.status !== 'PENDING') {
        throw new Error("Checkout session is already completed or invalid");
    }

    let sessionData = session.session_data;
    if (typeof sessionData === 'string') {
        try {
            sessionData = JSON.parse(sessionData);
        } catch (err) {
            sessionData = {};
        }
    }

    return {
        id: session.id,
        status: session.status,
        ...sessionData,
        expiresAt: session.expires_at
    };
}

async function applyCoupon(sessionId, couponCode, userId) {
    const session = await getSession(sessionId, userId);

    // Validate coupon
    const couponResult = await couponService.validateCoupon(couponCode, session.subtotal, userId);

    session.applied_coupon = couponResult;
    session.coupon_discount = couponResult.discountAmount;

    return await updateCalculatedTotals(sessionId, session, userId);
}

async function applyCoins(sessionId, coins, userId) {
    if (coins > 0 && coins < 20) {
        throw new Error("Minimum 20 coins required to redeem.");
    }

    const session = await getSession(sessionId, userId);

    const isRedeemable = await walletRewardService.canRedeem(userId, coins);
    if (!isRedeemable) {
        throw new Error("Insufficient redeemable coins in wallet. Note: coins are locked for 45 days after delivery.");
    }

    const coinValue = await walletRewardService.coinsToRupees(coins);

    // Safety: Coins cannot exceed remaining balance after coupon
    const remainingAfterCoupon = session.subtotal - (session.coupon_discount || 0);
    const activeCoinDiscount = Math.min(coinValue, remainingAfterCoupon);

    session.applied_coins = coins;
    session.coin_discount = activeCoinDiscount;

    return await updateCalculatedTotals(sessionId, session, userId);
}

async function updateCalculatedTotals(sessionId, sessionData, userId) {
    const subtotal = parseFloat(sessionData.subtotal);
    const couponDisc = parseFloat(sessionData.coupon_discount || 0);
    const coinDisc = parseFloat(sessionData.coin_discount || 0);
    const shipping = parseFloat(sessionData.shipping_charge || 0);
    const platformFee = parseFloat(sessionData.platform_fee || 0);

    // Final Flow: (Subtotal - Coupon - Coins) + Shipping + Platform Fee
    const finalPayable = Math.max(0, (subtotal - couponDisc - coinDisc)) + shipping + platformFee;

    sessionData.totals.gross_total = finalPayable;
    sessionData.total_amount = finalPayable;

    await pool.query(
        "UPDATE checkout_sessions SET session_data = ? WHERE id = ?",
        [JSON.stringify(sessionData), sessionId]
    );

    return sessionData;
}

async function updateSessionShipping(sessionId, shippingData) {
    const [rows] = await pool.query("SELECT session_data, user_id FROM checkout_sessions WHERE id = ?", [sessionId]);
    if (rows.length === 0) throw new Error("Session not found");

    let data = rows[0].session_data;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { data = {}; }
    }

    data.shipping_method = shippingData.courier_name;
    data.shipping_charge = parseFloat(shippingData.total_charge) || 0;
    data.shipping_margin = parseFloat(shippingData.margin) || 0;
    data.shipping_base_rate = parseFloat(shippingData.base_rate) || 0;
    data.cod_charges = parseFloat(shippingData.cod_charges) || 0;
    data.estimated_delivery = shippingData.estimated_delivery_days;
    
    // 🔥 NEW: Persist structured address data if provided during this step
    if (shippingData.address_id) {
        data.address_id = shippingData.address_id;
        console.log(`🔥 [Checkout] Saving address_id to session ${sessionId}:`, data.address_id);
    }
    if (shippingData.city) data.city = shippingData.city;
    if (shippingData.state) data.state = shippingData.state;
    if (shippingData.postal_code) data.postal_code = shippingData.postal_code;

    return await updateCalculatedTotals(sessionId, data, rows[0].user_id);
}

async function updateSessionAddress(sessionId, shippingAddress) {
    const [rows] = await pool.query("SELECT session_data, user_id FROM checkout_sessions WHERE id = ?", [sessionId]);
    if (rows.length === 0) throw new Error("Session not found");

    let data = rows[0].session_data;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { data = {}; }
    }

    let finalAddress = shippingAddress;
    if (typeof finalAddress === 'string' && finalAddress.trim().startsWith('{')) {
        try { finalAddress = JSON.parse(finalAddress); } catch (e) { /* ignore */ }
    }

    data.shipping_address = finalAddress;

    // 🔥 PERSIST address_id for robust order creation
    if (typeof finalAddress === 'object' && finalAddress !== null) {
        data.address_id = finalAddress.id || finalAddress.address_id || data.address_id;
    }

    await pool.query(
        "UPDATE checkout_sessions SET session_data = ? WHERE id = ?",
        [JSON.stringify(data), sessionId]
    );

    return data;
}

async function updateSessionStatus(sessionId, status, connection = null) {
    const dbClient = connection || pool;
    await dbClient.query(
        `UPDATE checkout_sessions SET status = ? WHERE id = ?`,
        [status, sessionId]
    );
}

// Alias used by order.service.js
async function markSessionCompleted(sessionId, connection = null) {
    return updateSessionStatus(sessionId, 'COMPLETED', connection);
}

module.exports = {
    createSession,
    getSession,
    applyCoupon,
    applyCoins,
    updateSessionShipping,
    updateSessionAddress,
    updateSessionStatus,
    markSessionCompleted
};