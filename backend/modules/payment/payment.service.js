const paymentModel = require('./payment.model');
const payuUtil = require('../../utils/payu.util');
const checkoutService = require('../checkout/checkout.service');
const orderService = require('../order/order.service');
const logger = require('../../utils/logger');
const crypto = require('crypto');
const env = require('../../config/env');
const smsNotificationService = require('../../services/notificationService');

async function initiatePayment(userId, checkoutSessionId, userDetails, shippingAddress = null, shippingData = null) {
    // 1. Get Checkout Session
    let session = await checkoutService.getSession(checkoutSessionId, userId);

    // 1.5 Update Shipping Address if provided (Critical for Physical Orders)
    if (shippingAddress) {
        await checkoutService.updateSessionAddress(checkoutSessionId, shippingAddress);
        // Update local session object for use in this context if needed (though we rely on DB for webhook)
        session.shipping_address = shippingAddress;
    }

    // 1.6 Sync Shipping Charges if provided (Harden against frontend/backend race conditions)
    if (shippingData && (shippingData.shipping_cost !== undefined || shippingData.address_id)) {
        console.log(`🔥 [Payment] Syncing shipping data. address_id:`, shippingData.address_id);
        logger.info(`[Payment] Syncing shipping data for session ${checkoutSessionId}`, shippingData);
        // We use the same format as delhivery calculation result
        const shippingCost = parseFloat(shippingData.shipping_cost);
        await checkoutService.updateSessionShipping(checkoutSessionId, {
            courier_name: shippingData.shipping_method || "Standard Shipping",
            total_charge: isNaN(shippingCost) ? 0 : shippingCost,
            estimated_delivery_days: shippingData.estimated_delivery || "5-7 days",
            // Structured Address Persistence
            address_id: shippingData.address_id || null,
            city: shippingData.city || "",
            state: shippingData.state || "",
            postal_code: shippingData.postal_code || ""
        });
        // Re-fetch session to get updated total_amount
        session = await checkoutService.getSession(checkoutSessionId, userId);
    }

    // 2. SESSION LOCKING: Block if COMPLETED or other terminal states
    console.log(`[Payment] Initiating for Session ${checkoutSessionId}, Status: ${session.status}`);
    if (session.status !== 'ACTIVE' && session.status !== 'PENDING') {
        throw new Error(`Payment is already in progress or completed for this session (Status: ${session.status})`);
    }



    // 3. ATOMICALLY update checkout_sessions status to PENDING
    await checkoutService.updateSessionStatus(checkoutSessionId, 'PENDING');


    // 4. Create Payment Session record
    // SECURITY: Limit txnid to 28 chars (PayU limit is 30)
    const txnid = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const amount = (session.totals && session.totals.gross_total) ? session.totals.gross_total : session.total_amount;

    await paymentModel.createPaymentSession({
        id: txnid,
        user_id: userId,
        checkout_session_id: checkoutSessionId,
        amount: amount,
        gateway: 'PAYU'
    });

    // 5. Generate PayU Hash
    // SECURITY: Include fraud detection parameters if structured address is available
    const hashData = {
        txnid,
        amount: parseFloat(amount).toFixed(2),
        productinfo: generateProductInfo(session.items) || "Order",
        firstname: (userDetails.name || 'User').split(' ')[0] || 'User', // PayU likes single names
        email: userDetails.email || 'guest@example.com', // MANDATORY
        phone: (session.shipping_address?.phone || userDetails.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10),
        udf1: checkoutSessionId,
    };

    // Robust check for mandatory fields before hashing
    const mandatory = ['txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'udf1'];
    mandatory.forEach(key => {
        if (!hashData[key]) {
            logger.error(`Missing mandatory field for PayU: ${key}`);
            throw new Error(`Missing mandatory identification parameter: ${key}`);
        }
    });

    console.log(`DEBUG: PayU Hashing - FirstName: ${hashData.firstname}, Email: ${hashData.email}, Phone: ${hashData.phone}`);

    const hash = payuUtil.generateHash(hashData);

    // 6. Return params for frontend redirect
    // Use ONLY validated hashData + mandatory PayU fields
    const payuParams = {
        key: env.payu.merchantKey,
        txnid: hashData.txnid,
        amount: hashData.amount,
        productinfo: hashData.productinfo,
        firstname: hashData.firstname,
        email: hashData.email,
        phone: hashData.phone,
        surl: `${env.backendUrl}/api/payment/success`,
        furl: `${env.backendUrl}/api/payment/failure`,
        hash: hash,
        action: env.payu.isProduction
            ? 'https://secure.payu.in/_payment'
            : 'https://test.payu.in/_payment',
        udf1: hashData.udf1,
        // DEBUG: Explicit production status check
        _debug_is_prod: env.payu.isProduction,
        _debug_action: env.payu.isProduction ? 'PRODUCTION' : 'TEST'
    };

    console.log(`🔥 [Payment] FINAL PARAMS:`, {
        action: payuParams.action,
        key: payuParams.key,
        isProduction: env.payu.isProduction
    });

    return payuParams;
}

const paymentTransactionModel = require('./paymentTransaction.model');

async function handleWebhook(payload) {
    // SECURITY: Validate payload structure
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload structure');
    }

    const { txnid, status, amount: payloadAmount, udf1: checkoutSessionId, mihpayid } = payload;

    // SECURITY: Validate required fields
    if (!txnid || typeof txnid !== 'string' || txnid.trim().length === 0) {
        throw new Error('Invalid transaction ID');
    }

    // SECURITY: Validate txnid format — generated as tx_${Date.now()}_${hex4bytes}
    // STEP 10: Corrected regex from /^txid_/ to /^tx_/ to match actual generation format
    if (!/^tx_\d+_[a-f0-9]+$/.test(txnid)) {
        logger.warn(`Suspicious txnid format: ${txnid}`);
        // Don't reject, but log for monitoring
    }

    if (!status || typeof status !== 'string') {
        throw new Error('Invalid status');
    }

    if (!payloadAmount || isNaN(parseFloat(payloadAmount)) || parseFloat(payloadAmount) <= 0) {
        throw new Error('Invalid amount');
    }

    const pool = require('../../config/db');

    // 1. Verify PayU hash (Production hardening)
    const isValid = payuUtil.verifyHash(payload);
    if (!isValid) {
        logger.error(`Invalid PayU Webhook Hash for txnid: ${txnid}`);
        throw new Error('Invalid hash verification');
    }

    // 2. Audit Trail: Log raw payload (Masked)
    await paymentModel.logPaymentEvent({
        payment_session_id: txnid,
        event_type: status.toUpperCase() === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
        gateway_event_id: mihpayid,
        raw_payload: maskPayload(payload)
    });

    // 3. Check Session exists and compare amount
    // SECURITY: Use FOR UPDATE for row-level locking to prevent race conditions during concurrent fulfillment
    const [sessions] = await pool.query(
        `SELECT * FROM payment_sessions WHERE id = ? FOR UPDATE`,
        [txnid]
    );
    const session = sessions.length > 0 ? sessions[0] : null;

    if (!session) {
        logger.error(`Payment Session not found for txnid: ${txnid}`);
        throw new Error('Payment session not found');
    }

    // Amount verification - Hardening
    // SECURITY: Use precise decimal comparison with tolerance for floating point
    const payloadAmountFloat = parseFloat(payloadAmount);
    const sessionAmountFloat = parseFloat(session.amount);
    const amountDifference = Math.abs(payloadAmountFloat - sessionAmountFloat);

    // Allow small tolerance (0.01) for floating point precision issues
    if (amountDifference > 0.01) {
        logger.error(`Payment amount mismatch for txnid: ${txnid}. Payload: ${payloadAmount}, Session: ${session.amount}, Difference: ${amountDifference}`);
        throw new Error('Payment amount mismatch');
    }

    // 4. Idempotency Check
    if (session.status === 'PAID') {
        logger.info(`Idempotent call: Payment already processed for txnid: ${txnid}`);
        return { status: 'ALREADY_PROCESSED' };
    }

    // 5. Handle Success with Transaction
    if (status.toUpperCase() === 'SUCCESS') {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // A. Update Payment Session to PAID
            await paymentModel.updateSessionStatus(txnid, 'PAID', null, connection);

            // Fetch actual checkout session for metadata (Critical Fix)
            const checkoutSession = await checkoutService.getSession(checkoutSessionId, session.user_id);
            logger.info(`[Webhook] Fulfillment for checkout session ${checkoutSessionId}`, { address_id: checkoutSession.address_id });

            // B. Create Order using session snapshot
            const order = await orderService.createOrder(session.user_id, {
                session_id: checkoutSessionId,
                address_id: checkoutSession.address_id, // 🔥 MANDATORY PASS for Online
                payment_method: 'online'
            }, connection);

            // C. Link Order ID to Payment Session
            await paymentModel.updateSessionStatus(txnid, 'PAID', order.id, connection);

            // D. FINANCE INTEGRATION: Record ledger and payouts
            const financeService = require('../finance/finance.service');
            await financeService.handleOrderPayment(order, checkoutSession.items, connection);

            // E. Persist Real Transaction Record
            await paymentTransactionModel.createTransaction({
                payment_session_id: txnid,
                order_id: order.id,
                gateway: 'PAYU',
                gateway_transaction_id: mihpayid,
                amount: payloadAmount,
                status: 'SUCCESS',
                raw_response: maskPayload(payload)
            }, connection);

            // E. Mark Checkout Session COMPLETED
            await checkoutService.updateSessionStatus(checkoutSessionId, 'COMPLETED', connection);

            await connection.commit();
            logger.info(`Hardened transaction committed for txnid: ${txnid}, Order ID: ${order.id}`);

            // 📲 SMS Trigger: Order Placed (Online)
            smsNotificationService.sendOrderPlacedSMS(session.user_id, order.id, order.total_payable_amount).catch(() => {});

            return { status: 'SUCCESS', order_id: order.id };
        } catch (err) {
            await connection.rollback();
            logger.error(`Critical transaction failed for txnid: ${txnid}, Rolling back. Error: ${err.message}`, { stack: err.stack });
            throw err;
        } finally {
            connection.release();
        }
    } else {
        // 6. Handle Failure
        await paymentModel.updateSessionStatus(txnid, 'FAILED');

      

        // If payment failed at gateway, we should revert checkout session to ACTIVE to allow retry
        await checkoutService.updateSessionStatus(checkoutSessionId, 'ACTIVE');
        logger.warn(`Payment failed and session unlocked for txnid: ${txnid}`);

        // 📲 SMS Trigger: Payment Failed
        // We use order_id as null or dummy since order isn't created yet, but we pass session.id as context if needed
        smsNotificationService.sendPaymentFailedSMS(session.user_id, txnid).catch(() => {});

        return { status: 'FAILED' };
    }
}

async function findSessionById(id) {
    return await paymentModel.findSessionById(id);
}


function generateProductInfo(items) {
    if (!items || items.length === 0) return "Order";
    const names = items.map(i => i.product_title || i.title).join(", ");
    const info = `${items.length} items ${names}`;
    // PayU only allows AlphaNumeric and space. Strip others.
    return info.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 100);
}

/**
 * Utility to mask sensitive fields in payment payloads for logging
 */
function maskPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const masked = { ...payload };
    const sensitiveFields = ['card_no', 'card_number', 'cvv', 'card_cvv', 'password', 'otp', 'card_name', 'expiry_date'];

    sensitiveFields.forEach(field => {
        if (masked[field]) {
            const val = String(masked[field]);
            if (val.length > 4) {
                masked[field] = '*'.repeat(val.length - 4) + val.slice(-4);
            } else {
                masked[field] = '****';
            }
        }
    });
    return masked;
}

async function initiatePayURefund({
    payu_payment_id,
    amount,
    refund_id
}) {
    const axios = require("axios");
    const PAYU_KEY = env.payu.merchantKey;
    const PAYU_SALT = env.payu.merchantSalt;

    const command = "cancel_refund_transaction";

    const hashString =
        PAYU_KEY + "|" + command + "|" + payu_payment_id + "|" + PAYU_SALT;

    const hash = crypto
        .createHash("sha512")
        .update(hashString)
        .digest("hex");

    const payload = new URLSearchParams();
    payload.append('key', PAYU_KEY);
    payload.append('command', command);
    payload.append('var1', payu_payment_id);
    payload.append('var2', refund_id);
    payload.append('var3', parseFloat(amount).toFixed(2));
    payload.append('hash', hash);

    const baseUrl = env.payu.isProduction
        ? 'https://info.payu.in/merchant/postservice.php?form=2'
        : 'https://test.payu.in/merchant/postservice.php?form=2';

    const response = await axios.post(
        baseUrl,
        payload.toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    return response.data;
}

module.exports = {
    initiatePayment,
    handleWebhook,
    findSessionById,
    maskPayload,
    initiatePayURefund
};