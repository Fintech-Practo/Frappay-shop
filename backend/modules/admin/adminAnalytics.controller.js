const adminAnalyticsService = require('./adminAnalytics.service');
const logger = require('../../utils/logger');

class AdminAnalyticsController {
  // Get comprehensive overview
  async getOverview(req, res) {
    try {
      const filters = req.query;
      const overview = await adminAnalyticsService.getOverview(filters);
      
      res.json({
        success: true,
        data: overview,
        message: "Admin overview retrieved successfully"
      });
    } catch (error) {
      logger.error('Get admin overview error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch admin overview"
      });
    }
  }

  // Get sales analytics
  async getSalesAnalytics(req, res) {
    try {
      const filters = req.query;
      const salesAnalytics = await adminAnalyticsService.getSalesAnalytics(filters);
      
      res.json({
        success: true,
        data: salesAnalytics,
        message: "Sales analytics retrieved successfully"
      });
    } catch (error) {
      logger.error('Get sales analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch sales analytics"
      });
    }
  }

  // Get user analytics
  async getUserAnalytics(req, res) {
    try {
      const filters = req.query;
      const userAnalytics = await adminAnalyticsService.getUserAnalytics(filters);
      
      res.json({
        success: true,
        data: userAnalytics,
        message: "User analytics retrieved successfully"
      });
    } catch (error) {
      logger.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch user analytics"
      });
    }
  }

  // Get seller analytics
  async getSellerAnalytics(req, res) {
    try {
      const filters = req.query;
      const sellerAnalytics = await adminAnalyticsService.getSellerAnalytics(filters);
      
      res.json({
        success: true,
        data: sellerAnalytics,
        message: "Seller analytics retrieved successfully"
      });
    } catch (error) {
      logger.error('Get seller analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch seller analytics"
      });
    }
  }

  // Get inventory analytics
  async getInventoryAnalytics(req, res) {
    try {
      const filters = req.query;
      const inventoryAnalytics = await adminAnalyticsService.getInventoryAnalytics(filters);
      
      res.json({
        success: true,
        data: inventoryAnalytics,
        message: "Inventory analytics retrieved successfully"
      });
    } catch (error) {
      logger.error('Get inventory analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch inventory analytics"
      });
    }
  }

  // Get financial analytics
  async getFinancialAnalytics(req, res) {
    try {
      const filters = req.query;
      const financialAnalytics = await adminAnalyticsService.getFinancialAnalytics(filters);
      
      res.json({
        success: true,
        data: financialAnalytics,
        message: "Financial analytics retrieved successfully"
      });
    } catch (error) {
      logger.error('Get financial analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch financial analytics"
      });
    }
  }

  // Export analytics data
  async exportAnalytics(req, res) {
    try {
      const { type } = req.params;
      const filters = req.query;
      
      let data;
      switch (type) {
        case 'overview':
          data = await adminAnalyticsService.getOverview(filters);
          break;
        case 'sales':
          data = await adminAnalyticsService.getSalesAnalytics(filters);
          break;
        case 'users':
          data = await adminAnalyticsService.getUserAnalytics(filters);
          break;
        case 'sellers':
          data = await adminAnalyticsService.getSellerAnalytics(filters);
          break;
        case 'inventory':
          data = await adminAnalyticsService.getInventoryAnalytics(filters);
          break;
        case 'financial':
          data = await adminAnalyticsService.getFinancialAnalytics(filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid export type"
          });
      }

      // Convert to CSV (simplified implementation)
      const csv = this.convertToCSV(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=admin-analytics-${type}-${Date.now()}.csv`);
      res.send(csv);
      
    } catch (error) {
      logger.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to export analytics"
      });
    }
  }

  // Helper method to convert data to CSV
  convertToCSV(data) {
    const flattenObject = (obj, prefix = '') => {
      return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
          acc[pre + k] = obj[k];
        }
        return acc;
      }, {});
    };

    const flattened = flattenObject(data);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);
    
    return [
      headers.join(','),
      values.map(v => `"${v}"`).join(',')
    ].join('\n');
  }
}

module.exports = new AdminAnalyticsController();
