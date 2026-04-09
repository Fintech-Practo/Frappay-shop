const returnsService = require("./returns.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const { createReturnSchema, getReturnsSchema } = require("./returns.schema");
const { sendReturnRequestSMS, sendReturnApprovedSMS, sendReturnRejectedSMS } = require("../../services/notificationService");

// Create return request
async function createReturnRequest(req, res) {
  try {
    const { error } = createReturnSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { order_id, reason, refund_type, images, bank_details } = req.body;
    const userId = req.user.userId;

    const returnId = await returnsService.createReturnRequest(order_id, userId, {
      reason,
      refund_type,
      images,
      bank_details
    });

    // Fire-and-forget: Return Request SMS
    sendReturnRequestSMS(userId, order_id).catch(() => {});

    return response.success(res, { return_id: returnId }, "Return request created successfully");
  } catch (err) {
    logger.error("Create return request failed", { 
      userId: req.user.userId,
      order_id: req.body.order_id,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to create return request", 500);
  }
}

// Get user's return requests
async function getMyReturns(req, res) {
  try {
    const { error, value } = getReturnsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const returns = await returnsService.getUserReturns(req.user.userId, value);
    return response.success(res, returns, "Returns fetched successfully");
  } catch (err) {
    logger.error("Get my returns failed", { 
      userId: req.user.userId,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to fetch returns", 500);
  }
}

// Get specific return request details
async function getReturnById(req, res) {
  try {
    const user = req.user;
    const userId = user?.userId;

    if (!userId) {
      return response.error(res, "Unauthorized", 401);
    }

    const returnId = Number(req.params.id);
    
    // Get return details and verify ownership
    const returns = await returnsService.getUserReturns(userId, { 
      return_id: returnId, 
      limit: 1 
    });

    if (returns.length === 0) {
      return response.error(res, "Return request not found", 404);
    }

    return response.success(res, returns[0], "Return request fetched successfully");
  } catch (err) {
    logger.error("Get return by ID failed", { 
      returnId: req.params.id,
      userId: req.user?.userId,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to fetch return request", 500);
  }
}

// Update return request (cancel/modify)
async function updateReturnRequest(req, res) {
  try {
    const { error } = createReturnSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { status, reason } = req.body;
    const returnId = Number(req.params.id);
    const userId = req.user.userId;

    // Verify ownership
    const returns = await returnsService.getUserReturns(userId, { 
      return_id: returnId, 
      limit: 1 
    });

    if (returns.length === 0) {
      return response.error(res, "Return request not found", 404);
    }

    // Only allow status updates, not reason changes
    const updated = await returnsService.updateReturnStatus(returnId, status, reason, userId);
    
    return response.success(res, null, "Return request updated successfully");
  } catch (err) {
    logger.error("Update return request failed", { 
      returnId: req.params.id,
      userId: req.user.userId,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to update return request", 500);
  }
}

// Admin: Get all return requests
async function getAllReturns(req, res) {
  try {
    const { error, value } = getReturnsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const returns = await returnsService.getAllReturns(value);
    return response.success(res, returns, "All returns fetched successfully");
  } catch (err) {
    logger.error("Get all returns failed", { 
      query: req.query,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to fetch returns", 500);
  }
}

// Admin: Update return status
async function adminUpdateReturnStatus(req, res) {
  try {
    const { error } = createReturnSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { status, admin_notes } = req.body;
    const returnId = Number(req.params.id);
    const adminId = req.user.userId;

    const updated = await returnsService.updateReturnStatus(returnId, status, admin_notes, adminId);
    
    return response.success(res, null, "Return status updated successfully");
  } catch (err) {
    logger.error("Admin update return status failed", { 
      returnId: req.params.id,
      adminId: req.user.userId,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to update return status", 500);
  }
}

// Admin: Get return analytics
async function getReturnAnalytics(req, res) {
  try {
    const { error, value } = getReturnsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const analytics = await returnsService.getReturnAnalytics(value);
    return response.success(res, analytics, "Return analytics fetched successfully");
  } catch (err) {
    logger.error("Get return analytics failed", { 
      query: req.query,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to fetch return analytics", 500);
  }
}

// Get user's refund history
async function getMyRefunds(req, res) {
  try {
    const { page = 1, limit = 10, status = 'all', type = 'all' } = req.query;
    const userId = req.user.userId || req.user.id;

    if (!userId) {
      return response.error(res, "User ID not found in session", 401);
    }
    
    const refunds = await returnsService.getUserRefunds(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type
    });
    
    return response.success(res, refunds, "Refunds fetched successfully");
  } catch (err) {
    logger.error("Get my refunds failed", { 
      userId: req.user.userId,
      error: err.message 
    });
    return response.error(res, err.message || "Failed to fetch refunds", 500);
  }
}

module.exports = {
  createReturnRequest,
  getMyReturns,
  getReturnById,
  updateReturnRequest,
  getAllReturns,
  adminUpdateReturnStatus,
  getReturnAnalytics,
  getMyRefunds
};
