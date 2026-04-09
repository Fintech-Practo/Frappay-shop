const commentModel = require("./comment.model");
const Joi = require("joi");
const response = require("../../utils/response");

const createCommentSchema = Joi.object({
  review_id: Joi.number().integer().positive().required(),
  comment: Joi.string().min(1).max(1000).required()
});

async function createComment(req, res) {
  try {
    const { error } = createCommentSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const comment = await commentModel.create({
      ...req.body,
      user_id: req.user.userId
    });
    return response.success(res, comment, "Comment submitted. It will be reviewed before approval.");
  } catch (err) {
    return response.error(res, err.message || "Failed to create comment", 500);
  }
}

async function getReviewComments(req, res) {
  try {
    const reviewId = parseInt(req.params.reviewId);
    const comments = await commentModel.findByReviewId(reviewId);
    return response.success(res, comments, "Comments fetched successfully");
  } catch (err) {
    return response.error(res, err.message || "Failed to fetch comments", 500);
  }
}

async function deleteComment(req, res) {
  try {
    const deleted = await commentModel.deleteComment(parseInt(req.params.id), req.user.userId);
    if (!deleted) {
      return response.error(res, "Comment not found or unauthorized", 404);
    }
    return response.success(res, null, "Comment deleted successfully");
  } catch (err) {
    return response.error(res, err.message || "Failed to delete comment", 500);
  }
}

async function moderateComment(req, res) {
  try {
    const { status } = req.body;
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return response.error(res, "Invalid status. Must be APPROVED or REJECTED", 400);
    }

    const comment = await commentModel.moderate(parseInt(req.params.id), req.user.userId, status);
    return response.success(res, comment, "Comment moderated successfully");
  } catch (err) {
    return response.error(res, err.message || "Failed to moderate comment", 500);
  }
}

module.exports = {
  createComment,
  getReviewComments,
  deleteComment,
  moderateComment,
};

