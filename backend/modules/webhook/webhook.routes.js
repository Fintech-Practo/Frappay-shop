const express = require('express');
const router = express.Router();
const shippingService = require('../shipping/shipping.service');

// Delhivery failure webhook — auto-cancel order & initiate refund
router.post('/delhivery', shippingService.handleDelhiveryWebhook);

module.exports = router;
