const express = require("express");
const router = express.Router();
const logisticsController = require("./logistics.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const kycVerified = require("../../middlewares/kycVerified.middleware");

// Webhook (Publicly accessible but validated if possible)
router.post("/webhook/delhivery", logisticsController.handleWebhook);

// Admin Manual Trigger
router.post("/create-shipment", authMiddleware, kycVerified, logisticsController.createShipmentManual);

// Seller/Admin Mark Packed
router.post("/mark-packed", authMiddleware, kycVerified, logisticsController.markPacked);

// Seller/Admin Ready to Ship
router.post("/ready-to-ship", authMiddleware, kycVerified, logisticsController.readyToShip);


// Get Shipments (Seller - Own, Admin - All)
router.get("/list", authMiddleware, logisticsController.getShipments);

// Calculate Shipping Rates
router.post("/calculate-rates", authMiddleware, logisticsController.calculateShipping);

// Simulation & Labels
router.post("/simulate-status", authMiddleware, logisticsController.simulateStatus);
router.post("/retry-label/:orderId", authMiddleware, kycVerified, logisticsController.retryLabel);
router.post("/retry-pickup/:orderId", authMiddleware, kycVerified, logisticsController.retryPickup);
router.post("/retry-shipment/:orderId", authMiddleware, kycVerified, logisticsController.retryShipment);
router.get("/label/:orderId", authMiddleware, logisticsController.downloadShippingLabel);

// Warehouse Sync
router.post("/warehouse/create", authMiddleware, logisticsController.createWarehouse);
router.post("/warehouse/update", authMiddleware, logisticsController.updateWarehouse);

module.exports = router;