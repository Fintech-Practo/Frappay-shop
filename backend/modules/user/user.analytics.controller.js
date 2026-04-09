const userAnalyticsService = require("./user.analytics.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");

async function getUserStats(req, res) {
  try {
    const userId = req.user.userId;
    const stats = await userAnalyticsService.getUserStats(userId);
    
    return response.success(res, stats, "User statistics fetched successfully");
  } catch (err) {
    logger.error("Get user stats failed", { 
      userId: req.user.userId, 
      error: err.message 
    });
    return response.error(res, err.message, 500);
  }
}

module.exports = {
  getUserStats
};
