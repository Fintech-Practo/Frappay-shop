const db = require("../../config/db");
const logger = require("../../utils/logger");

class AnalyticsService {
    // ==========================================
    // ADMIN ANALYTICS (Global Scope)
    // ==========================================

    async getAdminOverview(filters = {}) {
        try {
            const { period = '30d', startDate, endDate } = filters;
            let dateFilter = this.getDateFilter(period, startDate, endDate, 'o.created_at');

            // 1. Core Financials (Ledger-based)
            const financialsQuery = `
                SELECT 
                    SUM(o.total_payable_amount) as gmv,
                    SUM(o.admin_commission_total) as total_commission,
                    SUM(o.admin_net_profit) as platform_profit,
                    SUM(o.seller_payout_total) as total_seller_payout,
                    COUNT(DISTINCT o.id) as total_orders,
                    AVG(o.total_payable_amount) as aov,
                    COUNT(DISTINCT o.user_id) as total_users
                FROM orders o
                WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
            `;

            // 2. Order Breakdown
            const orderStatusQuery = `
                SELECT 
                    o.status,
                    COUNT(*) as count
                FROM orders o
                WHERE 1=1 ${dateFilter}
                GROUP BY o.status
            `;

            // 3. Category Performance (Revenue Share)
            const categoryQuery = `
                SELECT 
                    COALESCE(c.name, 'Uncategorized') as category_name,
                    SUM(oi.price * oi.quantity) as revenue,
                    COUNT(DISTINCT oi.order_id) as orders_count
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories_v2 c ON p.category_leaf_id = c.id
                WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
                GROUP BY c.name
                ORDER BY revenue DESC
                LIMIT 5
            `;

            const [financials, orderStatus, categories] = await Promise.all([
                db.execute(financialsQuery),
                db.execute(orderStatusQuery),
                db.execute(categoryQuery)
            ]);

            return {
                financials: financials[0][0], // Result is [row], accessing first row
                order_distribution: orderStatus[0], // Result is array of rows
                category_performance: categories[0], // Result is array of rows
                generated_at: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Admin overview error:', error);
            throw new Error('Failed to fetch admin overview');
        }
    }

    async getAdminSalesAnalytics(filters = {}) {
        try {
            const { period = '30d' } = filters;
            let dateFilter = this.getDateFilter(period, filters.startDate, filters.endDate, 'o.created_at');

            // Daily trend of revenue and profit
            const trendQuery = `
                SELECT 
                    DATE(o.created_at) as date,
                    COUNT(DISTINCT o.id) as orders,
                    SUM(o.total_payable_amount) as gmv,
                    SUM(o.admin_net_profit) as profit
                FROM orders o
                WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
                GROUP BY DATE(o.created_at)
                ORDER BY date ASC
            `;

            const [trends] = await db.execute(trendQuery);
            return { sales_trends: trends[0] };
        } catch (error) {
            logger.error('Admin sales analytics error:', error);
            throw new Error('Failed to fetch admin sales analytics');
        }
    }

    async getAdminSellerAnalytics(filters = {}) {
        try {
            // Performance per seller
            const sellerQuery = `
                SELECT 
                    s.business_name,
                    u.name as seller_name,
                    COUNT(DISTINCT oi.order_id) as total_orders,
                    SUM(oi.seller_payout) as total_payout,
                    SUM(oi.commission_amount) as total_commission_generated
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN users u ON p.seller_id = u.id 
                LEFT JOIN seller_info s ON u.id = s.user_id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                GROUP BY u.id, s.business_name, u.name
                ORDER BY total_payout DESC
                LIMIT 20
            `;

            const [sellers] = await db.execute(sellerQuery);
            return { top_sellers: sellers };
        } catch (error) {
            logger.error('Admin seller analytics error:', error);
            throw new Error('Failed to fetch admin seller analytics');
        }
    }

    // ==========================================
    // SELLER ANALYTICS (Scoped)
    // ==========================================

    async getSalesAnalytics(sellerId, filters = {}) {
        try {
            const { period = '30d' } = filters;
            let dateFilter = this.getDateFilter(period, filters.startDate, filters.endDate, 'o.created_at');

            // Sales trends (Net Earnings based)
            const salesTrendsQuery = `
                SELECT 
                    DATE(o.created_at) as date,
                    COUNT(DISTINCT o.id) as orders,
                    SUM(oi.quantity) as items_sold,
                    SUM(oi.seller_payout) as net_earnings,
                    SUM(oi.commission_amount) as commission_paid
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE p.seller_id = ? 
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
                GROUP BY DATE(o.created_at)
                ORDER BY date ASC
            `;

            // Top selling products (with stock status)
            const topProductsQuery = `
                SELECT 
                    p.id,
                    p.title,
                    SUM(oi.quantity) as units_sold,
                    SUM(oi.seller_payout) as earnings,
                    p.stock as current_stock,
                    CASE 
                        WHEN p.stock = 0 THEN 'Out of Stock'
                        WHEN p.stock < 10 THEN 'Low Stock'
                        ELSE 'In Stock'
                    END as inventory_status
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE p.seller_id = ? 
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
                GROUP BY p.id, p.title, p.stock
                ORDER BY units_sold DESC
                LIMIT 10
            `;

            // Category breakdown for seller
            const categoryQuery = `
                SELECT 
                    COALESCE(c.name, 'Other') as category_name,
                    SUM(oi.seller_payout) as earnings
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories_v2 c ON p.category_leaf_id = c.id
                WHERE p.seller_id = ?
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
                GROUP BY c.name
                ORDER BY earnings DESC
            `;

            const [salesTrends, topProducts, categories] = await Promise.all([
                db.execute(salesTrendsQuery, [sellerId]),
                db.execute(topProductsQuery, [sellerId]),
                db.execute(categoryQuery, [sellerId])
            ]);

            return {
                sales_trends: salesTrends[0],
                top_products: topProducts[0],
                category_performance: categories[0],
                period
            };

        } catch (error) {
            logger.error('Sales analytics error:', error);
            throw new Error('Failed to fetch sales analytics');
        }
    }

    async getCustomerInsights(sellerId, filters = {}) {
        try {
            const { period = '30d' } = filters;
            let dateFilter = this.getDateFilter(period, filters.startDate, filters.endDate, 'o.created_at');

            const statsQuery = `
                SELECT 
                    COUNT(DISTINCT o.user_id) as unique_buyers,
                    AVG(oi.seller_payout) as avg_revenue_per_user
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE p.seller_id = ? 
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
            `;

            const [stats] = await db.execute(statsQuery, [sellerId]);

            // Fix: stats is [rows], so stats[0] is the first row object
            const firstRow = stats[0] || {};

            return {
                demographics: {
                    total_customers: firstRow.unique_buyers || 0,
                    avg_value: firstRow.avg_revenue_per_user || 0
                },
                location_data: []
            };

        } catch (error) {
            logger.error('Customer insights error:', error);
            throw new Error('Failed to fetch customer insights');
        }
    }

    async getInventoryReports(sellerId, filters = {}) {
        try {
            // Dead Stock: Products with 0 sales in last 90 days but > 0 stock
            // Only count successful orders (CONFIRMED, SHIPPED, DELIVERED)
            const deadStockQuery = `
                SELECT p.id, p.title, p.stock, p.selling_price as price
                FROM products p
                LEFT JOIN (
                    SELECT oi.product_id
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                    AND o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                ) recent_sales ON p.id = recent_sales.product_id
                WHERE p.seller_id = ? 
                AND p.stock > 0 
                AND p.is_active = true
                AND recent_sales.product_id IS NULL
                LIMIT 20
            `;

            const [deadStock] = await db.execute(deadStockQuery, [sellerId]);

            return {
                dead_stock: deadStock
            };
        } catch (error) {
            logger.error('Inventory report error:', error);
            throw new Error('Failed to fetch inventory report');
        }
    }

    async getFinancialReports(sellerId, filters = {}) {
        try {
            const { period = '30d' } = filters;
            let dateFilter = this.getDateFilter(period, filters.startDate, filters.endDate, 'o.created_at');

            // Net Earnings & Wallet Logic
            const financialsQuery = `
                SELECT 
                    SUM(oi.seller_payout) as net_earnings,
                    SUM(oi.commission_amount) as commission_paid,
                    SUM(oi.price * oi.quantity) as gross_sales,
                    COUNT(DISTINCT o.id) as total_orders,
                    AVG(oi.price * oi.quantity) as aov
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE p.seller_id = ?
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
            `;

            const [financials] = await db.execute(financialsQuery, [sellerId]);

            // Fix: financials is [rows], so financials[0] is the first row object
            return {
                summary: financials[0] || {},
                period
            };
            // Fix: financials is [rows], so financials[0] is the first row object
            return {
                summary: financials[0] || {},
                period
            };
        } catch (error) {
            logger.error('Financial report error:', error);
            throw new Error('Failed to fetch financial report');
        }
    }

    async getProductAnalytics(sellerId, productId, filters = {}) {
        try {
            const { period = '30d' } = filters;
            let dateFilter = this.getDateFilter(period, filters.startDate, filters.endDate, 'o.created_at');

            // 1. Product Basic Info
            const productQuery = `
                SELECT 
                    p.id, p.title, p.sku, p.selling_price, p.image_url, p.stock,
                    pt.label as product_type_label
                FROM products p
                LEFT JOIN product_types pt ON p.product_type_code = pt.code
                WHERE p.id = ? AND p.seller_id = ?
            `;
            const [productRows] = await db.execute(productQuery, [productId, sellerId]);
            if (productRows.length === 0) {
                throw new Error("Product not found or unauthorized");
            }
            const productInfo = productRows[0];

            // 2. Sales Summary
            const summaryQuery = `
                SELECT 
                    SUM(oi.quantity) as total_units_sold,
                    SUM(oi.price * oi.quantity) as gross_revenue,
                    SUM(oi.seller_payout) as net_earnings,
                    (COUNT(DISTINCT o.id) / 100) * 5 as conversion_rate -- Mock logic for now
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.product_id = ? 
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
            `;
            const [summaryRows] = await db.execute(summaryQuery, [productId]);

            // 3. Sales Trend
            const trendQuery = `
                 SELECT 
                    DATE(o.created_at) as date,
                    SUM(oi.quantity) as units
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.product_id = ? 
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ${dateFilter}
                GROUP BY DATE(o.created_at)
                ORDER BY date ASC
            `;
            const [trendRows] = await db.execute(trendQuery, [productId]);

            // 4. Recent Orders ("Who Bought This")
            const ordersQuery = `
                SELECT 
                    o.id as order_id,
                    o.created_at,
                    u.name as customer_name,
                    u.email as customer_email,
                    oi.quantity,
                    (oi.price * oi.quantity) as total_price
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN users u ON o.user_id = u.id
                WHERE oi.product_id = ? 
                AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
                ORDER BY o.created_at DESC
                LIMIT 10
            `;
            const [orderRows] = await db.execute(ordersQuery, [productId]);

            return {
                product_info: productInfo,
                sales_summary: summaryRows[0] || {},
                sales_trend: trendRows,
                recent_orders: orderRows
            };

        } catch (error) {
            logger.error('Single product analytics error:', error);
            throw new Error('Failed to fetch product analytics');
        }
    }

    // Helper: Date Filter Generation
    getDateFilter(period, startDate, endDate, dateColumn = 'created_at') {
        if (startDate && endDate) {
            return `AND ${dateColumn} BETWEEN '${startDate}' AND '${endDate}'`;
        }
        const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
        return `AND ${dateColumn} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
    }
}

module.exports = new AnalyticsService();