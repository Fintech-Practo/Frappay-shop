const express = require("express");
const controller = require("./analytics.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const { analyticsSchema } = require("./analytics.schema");
const ROLES = require("../../config/roles");

const router = express.Router();

// Sales Analytics
router.get(
    "/sales",
    authMiddleware,
    allowRole(ROLES.SELLER),
    validateQuery(analyticsSchema),
    controller.getSalesAnalytics
);

// Customer Insights
router.get(
    "/customers",
    authMiddleware,
    allowRole(ROLES.SELLER),
    validateQuery(analyticsSchema),
    controller.getCustomerInsights
);

// Inventory Reports
router.get(
    "/inventory",
    authMiddleware,
    allowRole(ROLES.SELLER),
    validateQuery(analyticsSchema),
    controller.getInventoryReports
);

// Financial Reports
router.get(
    "/financial",
    authMiddleware,
    allowRole(ROLES.SELLER),
    validateQuery(analyticsSchema),
    controller.getFinancialReports
);

// Comprehensive Dashboard Overview
router.get(
    "/overview",
    authMiddleware,
    allowRole(ROLES.SELLER),
    validateQuery(analyticsSchema),
    controller.getDashboardOverview
);

// Single Product Analytics (Detailed)
router.get(
    "/product/:productId",
    authMiddleware,
    allowRole(ROLES.SELLER),
    validateQuery(analyticsSchema),
    controller.getProductAnalytics
);

module.exports = router;
