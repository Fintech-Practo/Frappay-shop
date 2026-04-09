const checkoutService = require("./checkout.service");
const cartService = require("../cart/cart.service");
const response = require("../../utils/response");
const fs = require('fs');

const path = require('path');

function logToFile(msg) {
    try {
        const logPath = 'c:\\FRAP PAY SHOP\\25\\Books-and-Copies\\backend\\debug.log';
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) { }
}

// POST /checkout/buy-now
async function createBuyNowSession(req, res) {
    try {
        logToFile(`[Checkout] createBuyNowSession body: ${JSON.stringify(req.body)}`);
        const { product_id, quantity, purchase_format, source = 'product_details', product_url } = req.body;

        if (!product_id || !quantity) {
            logToFile(`[Checkout] Missing product_id or quantity`);
            return response.error(res, "Product ID and quantity are required", 400);
        }

        // CRITICAL: Ensure the product is successfully added to cart before proceeding
        let cartItem;
        try {
            cartItem = await cartService.addToCart(req.user.userId, {
                product_id,
                quantity,
                type: "CART"
            });
        } catch (cartError) {
            // If cart add fails, throw error and don't proceed with checkout
            console.error("Failed to add item to cart:", cartError.message);
            return response.error(res, `Failed to add product to cart: ${cartError.message}`, 400);
        }

        // Verify the item was added by checking cart after addition
        if (!cartItem || !cartItem.id) {
            return response.error(res, "Failed to verify cart addition. Please try again.", 400);
        }

        const items = [{
            product_id,
            quantity,
            purchase_format: purchase_format || null // Optional: PHYSICAL or EBOOK
        }];

        // Create session with source tracking (User ID from auth middleware)
        logToFile(`[Checkout] Calling checkoutService.createSession for user ${req.user.userId}`);
        const session = await checkoutService.createSession(req.user.userId, items, 'buynow', {
            product_id,
            product_url,
            source
        });

        logToFile(`[Checkout] Session created: ${session.sessionId}`);
        return response.success(res, session, "Checkout session created");
    } catch (err) {
        logToFile(`[Checkout] createBuyNowSession Error: ${err.message}`);
        return response.error(res, err.message, 400);
    }
}

// POST /checkout/session
// For Cart checkout
async function createCartSession(req, res) {
    try {
        // STEP 2: Extract payment_method so it is stored in the session snapshot
        const { items, source = 'cart', payment_method = 'COD' } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return response.error(res, "Valid items array is required", 400);
        }

        // Normalize items: support both book_id and product_id, include purchase_format
        const normalizedItems = items.map(item => ({
            product_id: item.product_id || item.book_id,
            quantity: item.quantity,
            purchase_format: item.purchase_format || null // Optional: PHYSICAL or EBOOK
        }));

        const session = await checkoutService.createSession(req.user.userId, normalizedItems, 'cart', {
            source,
            payment_method   // <-- propagated into session_data
        });

        return response.success(res, session, "Checkout session created");
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

// GET /checkout/session/:id
async function getSession(req, res) {
    try {
        const session = await checkoutService.getSession(req.params.id, req.user.userId);
        return response.success(res, session, "Session retrieved");
    } catch (err) {
        const status = err.message === "Session not found" ? 404 : 400;
        return response.error(res, err.message, status);
    }
}

// POST /checkout/session/alternative
// Alternative session creation with explicit source tracking
async function createAlternativeSession(req, res) {
    try {
        const { items, source, product_id, product_url, payment_method = 'COD' } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return response.error(res, "Valid items array is required", 400);
        }

        if (!source || (source !== 'cart' && source !== 'product_details')) {
            return response.error(res, "Source must be 'cart' or 'product_details'", 400);
        }

        if (source === 'product_details' && !product_id) {
            return response.error(res, "product_id is required when source is 'product_details'", 400);
        }

        // Normalize items: support both book_id and product_id, include purchase_format
        const normalizedItems = items.map(item => ({
            product_id: item.product_id || item.book_id,
            quantity: item.quantity,
            purchase_format: item.purchase_format || null // Optional: PHYSICAL or EBOOK
        }));

        const sessionData = {
            source,
            payment_method  // <-- propagated into session_data
        };

        if (source === 'product_details') {
            sessionData.product_id = product_id;
            sessionData.product_url = product_url || null;
        }

        const session = await checkoutService.createSession(req.user.userId, normalizedItems, 'cart', sessionData);

        return response.success(res, session, "Checkout session created");
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

async function updateShipping(req, res) {
    try {
        const { sessionId, shippingData } = req.body;

        if (!sessionId || !shippingData) {
            return response.error(res, "Session ID and shipping data are required", 400);
        }

        const session = await checkoutService.updateSessionShipping(sessionId, shippingData);
        return response.success(res, session, "Shipping updated");
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

async function applyCoupon(req, res) {
    try {
        const { sessionId, code } = req.body;
        if (!sessionId || !code) {
            return response.error(res, "Session ID and Coupon Code are required", 400);
        }
        const session = await checkoutService.applyCoupon(sessionId, code, req.user.userId);
        return response.success(res, session, "Coupon applied successfully");
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

async function applyCoins(req, res) {
    try {
        const { sessionId, coins } = req.body;
        if (!sessionId || coins === undefined) {
            return response.error(res, "Session ID and coin amount are required", 400);
        }
        const session = await checkoutService.applyCoins(sessionId, parseInt(coins), req.user.userId);
        return response.success(res, session, "Coins applied successfully");
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

module.exports = {
    createBuyNowSession,
    createCartSession,
    createAlternativeSession,
    getSession,
    updateShipping,
    applyCoupon,
    applyCoins
};
