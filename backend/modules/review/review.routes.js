const express = require("express");
const router = express.Router();
const reviewController = require("./review.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const { createReviewSchema, updateReviewSchema, getReviewsSchema, moderateReviewSchema } = require("./review.schema");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");

// Admin routes first (before dynamic routes)
router.get(
    "/admin/pending",
    authMiddleware,
    allowRole(ROLES.ADMIN),
    reviewController.getPendingReviews
);

router.get(
    "/admin/all",
    authMiddleware,
    allowRole(ROLES.ADMIN),
    reviewController.getAllReviews
);

router.delete(
    "/admin/:id",
    authMiddleware,
    allowRole(ROLES.ADMIN),
    reviewController.deleteReview
);

router.patch(
    "/admin/:id/moderate",
    authMiddleware,
    allowRole(ROLES.ADMIN),
    validateRequest(moderateReviewSchema),
    reviewController.moderateReview
);

// Protected: Get user's reviews (before /:productId)
router.get("/my", authMiddleware, validateQuery(getReviewsSchema), reviewController.getMyReviews);

// Public: Get reviews (must be last as it has dynamic param)
router.get("/:productId", validateQuery(getReviewsSchema), reviewController.getProductReviews);

// Protected: Add review
router.post("/", authMiddleware, validateRequest(createReviewSchema), reviewController.addReview);

// Protected: Update review
router.put("/:id", authMiddleware, validateRequest(updateReviewSchema), reviewController.updateReview);

// Protected: Delete own review
router.delete("/:id", authMiddleware, reviewController.deleteMyReview);

module.exports = router;
