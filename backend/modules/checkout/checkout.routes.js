const express = require("express");
const router = express.Router();
const checkoutController = require("./checkout.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// All routes require authentication
// All routes require authentication
router.use(authMiddleware);

router.post("/buy-now", checkoutController.createBuyNowSession);
router.post("/session", checkoutController.createCartSession);
router.post("/session/alternative", checkoutController.createAlternativeSession);
router.post("/session/shipping", checkoutController.updateShipping);
router.post("/session/apply-coupon", checkoutController.applyCoupon);
router.post("/session/apply-coins", checkoutController.applyCoins);
router.get("/session/:id", checkoutController.getSession);

module.exports = router;