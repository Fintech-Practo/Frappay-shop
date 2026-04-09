const reviewModel = require("./review.model");
const orderModel = require("../order/order.model");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const { createReviewSchema, updateReviewSchema, getReviewsSchema } = require("./review.schema");

async function addReview(req, res) {
  try {
    const { error } = createReviewSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { product_id, rating, comment } = req.body;
    const userId = req.user.userId;

    // Check duplicate review
    const exists = await reviewModel.userHasReviewed(userId, product_id);
    if (exists) {
      return response.error(res, "You have already reviewed this product", 400);
    }

    const review = await reviewModel.create({ user_id: userId, product_id, rating, comment });
    return response.success(res, review, "Review added successfully");
  } catch (error) {
    logger.error("Add review failed", {
      userId: req.user.userId,
      productId: req.body.product_id,
      error: error.message
    });
    return response.error(res, "Failed to add review", 500);
  }
}

async function getProductReviews(req, res) {
  try {
    const { error } = getReviewsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const reviews = await reviewModel.findByProductId(req.params.productId, req.query);
    return response.success(res, reviews, "Reviews fetched successfully");
  } catch (error) {
    logger.error("Get product reviews failed", {
      productId: req.params.productId,
      error: error.message
    });
    return response.error(res, "Failed to fetch reviews", 500);
  }
}

async function deleteMyReview(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if review exists and belongs to user
    const review = await reviewModel.findByIdAndUser(id, userId);
    if (!review) {
      return response.error(res, "Review not found or access denied", 404);
    }

    await reviewModel.deleteReview(id);
    return response.success(res, null, "Review deleted successfully");
  } catch (error) {
    logger.error("Delete my review failed", {
      reviewId: req.params.id,
      userId: req.user.userId,
      error: error.message
    });
    return response.error(res, "Failed to delete review", 500);
  }
}

async function getAllReviews(req, res) {
  try {
    const { reviews, totalItems, totalPages } = await reviewModel.findAll(req.query.search || "", req.query);
    return response.success(res, { reviews, totalItems, totalPages }, "Reviews fetched successfully");
  } catch (error) {
    console.error("Get all reviews failed:", error.message);
    logger.error("Get all reviews failed", {
      query: req.query,
      error: error.message
    });
    return response.error(res, "Failed to fetch reviews", 500);
  }
}

async function getPendingReviews(req, res) {
  try {
    const reviews = await reviewModel.findPending();
    return response.success(res, reviews, "Pending reviews fetched successfully");
  } catch (error) {
    logger.error("Get pending reviews failed", { error: error.message });
    return response.error(res, "Failed to fetch pending reviews", 500);
  }
}

async function moderateReview(req, res) {
  try {
    const { error } = updateReviewSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { status } = req.body; // APPROVED or REJECTED
    const reviewId = req.params.id;
    const moderatorId = req.user.userId;

    const review = await reviewModel.moderate(reviewId, moderatorId, status);

    const auditService = require("../audit/audit.service");
    await auditService.logAction({
      req,
      action: "MODERATE_REVIEW",
      module: "PRODUCT",
      entityType: "REVIEW",
      entityId: reviewId,
      newValues: { status }
    });

    return response.success(res, review, "Review moderated successfully");
  } catch (error) {
    logger.error("Moderate review failed", {
      reviewId: req.params.id,
      moderatorId: req.user.userId,
      status: req.body.status,
      error: error.message
    });
    return response.error(res, "Moderation failed", 500);
  }
}

async function deleteReview(req, res) {
  try {
    const { id } = req.params;
    const success = await reviewModel.deleteReview(id);
    if (!success) {
      return response.error(res, "Review not found", 404);
    }

    // Log audit
    // Log audit (safe)
    try {
      const auditService = require("../audit/audit.service");
      await auditService.logAction({
        req,
        action: "DELETE_REVIEW",
        module: "PRODUCT",
        entityType: "REVIEW",
        entityId: id,
        severity: "WARNING"
      });
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr.message);
    }

    return response.success(res, null, "Review deleted successfully");
  } catch (error) {
    logger.error("Delete review failed", {
      reviewId: req.params.id,
      userId: req.user.userId,
      error: error.message
    });
    return response.error(res, "Failed to delete review", 500);
  }
}

// NEW: Get user's reviews
async function getMyReviews(req, res) {
  try {
    const { error, value } = getReviewsSchema.validate(req.query);
    if (error) return response.error(res, error.message, 400);

    const reviews = await reviewModel.findByUserId(req.user.userId, value);
    return response.success(res, reviews, "User reviews fetched successfully");
  } catch (error) {
    logger.error("Get my reviews failed", {
      userId: req.user.userId,
      error: error.message
    });
    return response.error(res, "Failed to fetch reviews", 500);
  }
}

// NEW: Update review
async function updateReview(req, res) {
  try {
    const { error } = updateReviewSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { id } = req.params;
    const userId = req.user.userId;

    // Check if review exists and belongs to user
    const existingReview = await reviewModel.findByIdAndUser(id, userId);
    if (!existingReview) {
      return response.error(res, "Review not found or access denied", 404);
    }

    const updatedReview = await reviewModel.updateReview(id, req.body);
    return response.success(res, updatedReview, "Review updated successfully");
  } catch (error) {
    logger.error("Update review failed", {
      reviewId: req.params.id,
      userId: req.user.userId,
      error: error.message
    });
    return response.error(res, "Failed to update review", 500);
  }
}

module.exports = {
  addReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteMyReview,
  getPendingReviews,
  moderateReview,
  getAllReviews,
  deleteReview
};