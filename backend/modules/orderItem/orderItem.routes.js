const express = require("express");
const controller = require("./orderItem.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

// User routes
router.get("/my-items", authMiddleware, controller.getMyOrderedItems);
router.get("/order/:orderId", authMiddleware, controller.getOrderItemsByOrderId);
router.get("/:id", authMiddleware, controller.getOrderItemById);

// Seller routes
router.get("/seller/items", authMiddleware, controller.getOrderItemsBySellerId);
router.get("/seller/stats", authMiddleware, controller.getStatsBySellerId);

module.exports = router;

