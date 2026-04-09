const sellerOnboardingService = require("./sellerOnboarding.service");
const { onboardingSchema, approveRejectSchema } = require("./sellerOnboarding.schema");
const response = require("../../utils/response");

async function submitOnboarding(req, res) {
  try {
    const { error } = onboardingSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const result = await sellerOnboardingService.submitOnboarding(req.user.userId, req.body);
    return response.success(res, result, "Onboarding submitted successfully. Waiting for admin approval.");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

async function getMyOnboardingStatus(req, res) {
  try {
    const status = await sellerOnboardingService.getMyOnboardingStatus(req.user.userId);
    return response.success(res, status, "Onboarding status fetched successfully");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getAllPendingOnboarding(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { pendingRequests, totalPages, currentPage, totalItems } = await sellerOnboardingService.getAllPendingOnboarding(page, limit);
    return response.success(res, { pendingRequests, totalPages, currentPage, totalItems }, "Pending onboarding requests fetched successfully");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getOnboardingDetails(req, res) {
  try {
    const { userId } = req.params;
    const details = await sellerOnboardingService.getOnboardingDetails(parseInt(userId));
    return response.success(res, details, "Onboarding details fetched successfully");
  } catch (err) {
    return response.error(res, err.message, 404);
  }
}

async function approveOnboarding(req, res) {
  try {
    const { userId } = req.params;
    const { commission_rate } = req.body;
    const result = await sellerOnboardingService.approveOnboarding(parseInt(userId), req.user.userId, commission_rate);
    return response.success(res, result, "Onboarding approved successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

async function rejectOnboarding(req, res) {
  try {
    const { error } = approveRejectSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const { userId } = req.params;
    const result = await sellerOnboardingService.rejectOnboarding(
      parseInt(userId),
      req.user.userId,
      req.body.reason || "Application rejected"
    );
    return response.success(res, result, "Onboarding rejected");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

module.exports = {
  submitOnboarding,
  getMyOnboardingStatus,
  getAllPendingOnboarding,
  getOnboardingDetails,
  approveOnboarding,
  rejectOnboarding
};