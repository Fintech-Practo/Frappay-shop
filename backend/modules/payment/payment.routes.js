const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const authMiddleware = require("../../middlewares/auth.middleware");


// 1. Initiate Payment (Requires user to be logged in)
router.post('/initiate', authMiddleware, paymentController.initiatePayment);

// 2. Get Payment Session Status (Requires user to be logged in)
router.get('/session/:id', authMiddleware, paymentController.getPaymentSession);

// 3. PayU Webhook (S2S - No Auth, uses Hash Verification)
// Note: PayU sends application/x-www-form-urlencoded
router.post('/webhook', paymentController.handlePayUWebhook);

// 4. PayU Success/Failure Callbacks (POST from PayU -> GET Redirect to Frontend)
router.post('/success', paymentController.handleCallback);
router.post('/failure', paymentController.handleCallback);


module.exports = router;