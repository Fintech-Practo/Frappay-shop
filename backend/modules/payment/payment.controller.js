const paymentService = require('./payment.service');
const response = require('../../utils/response');
const logger = require('../../utils/logger');
const checkoutService = require('../checkout/checkout.service');
const userService = require('../user/user.service');
const pool = require('../../config/db');

const env = require('../../config/env');

async function initiatePayment(req, res) {
    try {
        console.log("🔥 [PaymentController] initiatePayment body:", JSON.stringify(req.body, null, 2));
        const {
            checkoutSessionId,
            shippingAddress,
            shippingAddressId,
            address_id, // 🔥 NEW: Support standard address_id
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shippingAddressObj,
            shipping_cost,
            shipping_method,
            estimated_delivery
        } = req.body;

        if (!checkoutSessionId) {
            return response.error(res, "Checkout Session ID is required", 400);
        }

        // Fetch full user details to get phone number if available
        const user = await userService.getMyProfile(req.user.userId);

        const paymentParams = await paymentService.initiatePayment(
            req.user.userId,
            checkoutSessionId,
            {
                name: user.name || req.user.name,
                email: user.email || req.user.email,
                phone: user.phone
            },
            shippingAddressObj || shippingAddress,
            {
                shipping_cost,
                shipping_method,
                estimated_delivery,
                address_id: address_id || shippingAddressId,
                city: shipping_city,
                state: shipping_state,
                postal_code: shipping_postal_code
            }
        );

        console.log("DEBUG: Final Payment Params for Frontend:", JSON.stringify(paymentParams, null, 2));
        return response.success(res, paymentParams, "Payment initiated successfully");

    } catch (error) {
        console.error("Payment initiation error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
}

async function handleCallback(req, res) {
    try {
        const payload = req.body;
        console.log("PayU Protocol Callback:", payload);

        // SECURITY: Verify hash before processing (critical security fix)
        const payuUtil = require('../../utils/payu.util');
        const isValid = payuUtil.verifyHash(payload);
        if (!isValid) {
            logger.error(`Invalid PayU Callback Hash for txnid: ${payload.txnid}`);
            return res.redirect(`${env.frontendUrl}/payment/failure?error=invalid_hash`);
        }

        // SECURITY: Fulfillment logic belongs exclusively in the S2S Webhook.
        // The callback should only verify the hash and redirect for UI state.
        // We do NOT call handleWebhook here anymore to prevent race conditions.

        const txnid = payload.txnid;
        const status = payload.status;
        const checkoutSessionId = payload.udf1;

        // Resilience: Attempt fulfillment via callback for dev/local where webhooks might fail.
        // The handleWebhook function now has row-level locking to prevent duplicates.
        if (status === 'success') {
            try {
                await paymentService.handleWebhook(payload);
            } catch (err) {
                logger.warn(`Callback fulfillment hit conflict (likely handled by webhook): ${err.message}`);
            }
        }

        // Build redirect URL based on source from checkout session
        let redirectUrl;
        try {
            if (checkoutSessionId) {
                // Fetch checkout session to get source information
                const [rows] = await pool.query(
                    `SELECT session_data FROM checkout_sessions WHERE id = ?`,
                    [checkoutSessionId]
                );

                if (rows.length > 0) {
                    let sessionData = rows[0].session_data;
                    if (typeof sessionData === 'string') {
                        try {
                            sessionData = JSON.parse(sessionData);
                        } catch (e) {
                            sessionData = {};
                        }
                    }

                    const source = sessionData.source || 'cart';
                    const productId = sessionData.product_id;

                    if (status === 'success') {
                        if (source === 'product_details' && productId) {
                            redirectUrl = `${env.frontendUrl}/payment/success?txnid=${txnid}&source=product&product_id=${productId}`;
                        } else {
                            redirectUrl = `${env.frontendUrl}/payment/success?txnid=${txnid}&source=cart`;
                        }
                    } else {
                        if (source === 'product_details' && productId) {
                            redirectUrl = `${env.frontendUrl}/payment/failure?txnid=${txnid}&source=product&product_id=${productId}`;
                        } else {
                            redirectUrl = `${env.frontendUrl}/payment/failure?txnid=${txnid}&source=cart`;
                        }
                    }
                } else {
                    // Fallback if session not found
                    redirectUrl = status === 'success'
                        ? `${env.frontendUrl}/payment/success?txnid=${txnid}&source=cart`
                        : `${env.frontendUrl}/payment/failure?txnid=${txnid}&source=cart`;
                }
            } else {
                // Fallback if no checkout session ID
                redirectUrl = status === 'success'
                    ? `${env.frontendUrl}/payment/success?txnid=${txnid}&source=cart`
                    : `${env.frontendUrl}/payment/failure?txnid=${txnid}&source=cart`;
            }
        } catch (redirectError) {
            logger.error("Error building redirect URL:", redirectError);
            // Fallback redirect
            redirectUrl = status === 'success'
                ? `${env.frontendUrl}/payment/success?txnid=${txnid}&source=cart`
                : `${env.frontendUrl}/payment/failure?txnid=${txnid}&source=cart`;
        }

        res.redirect(redirectUrl);

    } catch (error) {
        console.error("Callback error:", error);
        res.redirect(`${env.frontendUrl}/payment/failure?error=callback_failed`);
    }
}

async function handlePayUWebhook(req, res) {
    try {
        // PayU sends x-www-form-urlencoded
        const payload = req.body;

        logger.info(`Received PayU Webhook for txnid: ${payload.txnid}`);

        const result = await paymentService.handleWebhook(payload);

        // Standardize responses: 200 for processed/ignored, 400 for verification failure.
        if (result.status === 'ALREADY_PROCESSED') {
            return res.status(200).send("Handled (Duplicate)");
        }

        return res.status(200).send("OK");
    } catch (err) {
        logger.error("PayU Webhook processing failed", { error: err.message });

        // SECURITY: If verification fails, return 400 to signal bad request.
        if (err.message.includes('verification') || err.message.includes('Invalid')) {
            return res.status(400).send("Invalid Signature");
        }

        // For terminal DB or server errors, return 500 to allow gateway retry.
        return res.status(500).send("Server Error - Please Retry");
    }
}

async function getPaymentSession(req, res) {
    try {
        const { id } = req.params;
        const session = await paymentService.findSessionById(id);

        if (!session) {
            return response.error(res, "Payment session not found", 404);
        }

        // Only owner or admin can see session
        if (req.user.role !== 'ADMIN' && session.user_id !== req.user.userId) {
            return response.error(res, "Access denied", 403);
        }

        return response.success(res, session, "Payment session fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

module.exports = {
    initiatePayment,
    handleCallback,
    handlePayUWebhook,
    getPaymentSession
};