const analyticsService = require("./analytics.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const { analyticsSchema } = require("./analytics.schema");

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

async function getAdminOverview(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const data = await analyticsService.getAdminOverview(value);
        return response.success(res, data, "Admin overview fetched successfully");
    } catch (err) {
        logger.error("Admin overview failed", { error: err.message });
        return response.error(res, "Failed to fetch admin overview", 500);
    }
}

async function getAdminSales(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const data = await analyticsService.getAdminSalesAnalytics(value);
        return response.success(res, data, "Admin sales analytics fetched successfully");
    } catch (err) {
        logger.error("Admin sales failed", { error: err.message });
        return response.error(res, "Failed to fetch admin sales analytics", 500);
    }
}

async function getAdminSellers(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const data = await analyticsService.getAdminSellerAnalytics(value);
        return response.success(res, data, "Admin seller analytics fetched successfully");
    } catch (err) {
        logger.error("Admin sellers failed", { error: err.message });
        return response.error(res, "Failed to fetch admin seller analytics", 500);
    }
}

// ==========================================
// SELLER CONTROLLERS
// ==========================================

async function getSalesAnalytics(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const sellerId = req.user.userId;
        const analytics = await analyticsService.getSalesAnalytics(sellerId, value);
        return response.success(res, analytics, "Sales analytics fetched successfully");
    } catch (err) {
        logger.error("Get sales analytics failed", { sellerId: req.user.userId, error: err.message });
        return response.error(res, "Unable to fetch sales analytics", 500);
    }
}

async function getCustomerInsights(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const sellerId = req.user.userId;
        const insights = await analyticsService.getCustomerInsights(sellerId, value);
        return response.success(res, insights, "Customer insights fetched successfully");
    } catch (err) {
        logger.error("Get customer insights failed", { sellerId: req.user.userId, error: err.message });
        return response.error(res, "Unable to fetch customer insights", 500);
    }
}

async function getInventoryReports(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const sellerId = req.user.userId;
        const reports = await analyticsService.getInventoryReports(sellerId, value);
        return response.success(res, reports, "Inventory reports fetched successfully");
    } catch (err) {
        logger.error("Get inventory reports failed", { sellerId: req.user.userId, error: err.message });
        return response.error(res, "Unable to fetch inventory reports", 500);
    }
}

async function getFinancialReports(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const sellerId = req.user.userId;
        const reports = await analyticsService.getFinancialReports(sellerId, value);
        return response.success(res, reports, "Financial reports fetched successfully");
    } catch (err) {
        logger.error("Get financial reports failed", { sellerId: req.user.userId, error: err.message });
        return response.error(res, "Unable to fetch financial reports", 500);
    }
}

async function getDashboardOverview(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const sellerId = req.user.userId;

        const [sales, customers, inventory, financials] = await Promise.all([
            analyticsService.getSalesAnalytics(sellerId, value),
            analyticsService.getCustomerInsights(sellerId, value),
            analyticsService.getInventoryReports(sellerId, value),
            analyticsService.getFinancialReports(sellerId, value)
        ]);

        const overview = {
            sales_analytics: sales,
            customer_insights: customers,
            inventory_reports: inventory,
            financial_reports: financials,
            period: value.period || '30d'
        };

        return response.success(res, overview, "Dashboard overview fetched successfully");
    } catch (err) {
        logger.error("Get dashboard overview failed", { sellerId: req.user.userId, error: err.message });
        return response.error(res, "Unable to fetch dashboard overview", 500);
    }
}

module.exports = {
    getAdminOverview,
    getAdminSales,
    getAdminSellers,
    getSalesAnalytics,
    getCustomerInsights,
    getInventoryReports,
    getFinancialReports,
    getDashboardOverview,
    getProductAnalytics
};

async function getProductAnalytics(req, res) {
    try {
        const { value } = analyticsSchema.validate(req.query);
        const { productId } = req.params;
        const sellerId = req.user.userId;

        const data = await analyticsService.getProductAnalytics(sellerId, productId, value);
        return response.success(res, data, "Product analytics fetched successfully");
    } catch (err) {
        logger.error("Get product analytics failed", { sellerId: req.user.userId, productId: req.params.productId, error: err.message });
        return response.error(res, "Unable to fetch product analytics", 500);
    }
}
