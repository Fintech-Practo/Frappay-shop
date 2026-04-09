const reviewModel = require("./review.model");

async function createReview(userId, data) {
  // Check if user can review
  const canReview = await reviewModel.checkUserCanReview(data.product_id, userId);

  if (!canReview.canReview) {
    throw new Error(canReview.reason);
  }

  return await reviewModel.create({
    ...data,
    user_id: userId,
    order_item_id: canReview.orderItemId || null
  });
}

async function getProductReviews(productId, filters = {}) {
  return await reviewModel.findByProductId(productId, filters);
}

async function getProductRatingStats(productId) {
  // reviewModel does not have getProductRatingStats, so this might be dead code or need implementation.
  // Assuming model will be updated or this is placeholder.
  return {};
}

async function getUserReviews(userId) {
  return await reviewModel.findByUserId(userId);
}

async function updateReview(id, userId, data) {
  return await reviewModel.update(id, userId, data);
}

async function deleteReview(id, userId) {
  const deleted = await reviewModel.deleteReview(id, userId);
  if (!deleted) {
    throw new Error("Review not found or unauthorized");
  }
  return { success: true };
}

async function moderateReview(id, moderatorId, status, reason = null) {
  return await reviewModel.moderate(id, moderatorId, status, reason);
}

module.exports = {
  createReview,
  getBookReviews,
  getBookRatingStats,
  getUserReviews,
  updateReview,
  deleteReview,
  moderateReview,
};

