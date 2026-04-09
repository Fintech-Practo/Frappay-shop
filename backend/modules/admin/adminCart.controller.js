const adminCartService = require("./adminCart.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");

/**
 * GET /api/admin/carts/abandoned
 *
 * Query Parameters:
 *   days   {number} - Items in cart for at least this many days (default: 30, min: 1)
 *   limit  {number} - Results per page (default: 20, min: 1, max: 100)
 *   page   {number} - Page number, 1-indexed (default: 1, min: 1)
 *
 * Access: ADMIN only (enforced via middleware in router)
 */
async function getAbandonedCarts(req, res) {
    try {
        // ── Parameter sanitization ──────────────────────────────────────────────
        const days = parseInt(req.query.days, 10);
        const limit = parseInt(req.query.limit, 10);
        const page = parseInt(req.query.page, 10);

        if (req.query.days !== undefined && (isNaN(days) || days < 1)) {
            return response.error(res, "Query param 'days' must be a positive integer", 400);
        }
        if (req.query.limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
            return response.error(res, "Query param 'limit' must be between 1 and 100", 400);
        }
        if (req.query.page !== undefined && (isNaN(page) || page < 1)) {
            return response.error(res, "Query param 'page' must be a positive integer", 400);
        }

        const filters = {
            days: isNaN(days) ? 30 : days,
            limit: isNaN(limit) ? 20 : limit,
            page: isNaN(page) ? 1 : page,
        };

        // ── Fetch data ──────────────────────────────────────────────────────────
        const result = await adminCartService.getAbandonedCartItems(filters);

        // ── Enrich each item with abandonment score ─────────────────────────────
        const enrichedItems = result.items.map((item) => {
            const scoring = adminCartService.computeAbandonmentScore(item);
            return {
                ...item,
                abandonment_score: scoring.score,
                risk_level: scoring.risk_level,
            };
        });

        // ── Build response payload ──────────────────────────────────────────────
        const payload = {
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                total_pages: result.total_pages,
            },
            filters_applied: {
                min_days_in_cart: filters.days,
            },
            items: enrichedItems,
        };

        return response.success(res, payload, "Abandoned cart items fetched successfully");

    } catch (err) {
        logger.error("getAbandonedCarts failed", {
            query: req.query,
            adminId: req.user?.userId,
            error: err.message,
        });
        return response.error(res, err.message || "Unable to fetch abandoned cart data", 500);
    }
}

module.exports = {
    getAbandonedCarts,
};
