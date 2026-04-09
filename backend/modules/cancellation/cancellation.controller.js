const cancellationService = require("./cancellation.service");
const {
  createCancellationSchema,
  updateCancellationStatusSchema,
  getCancellationsSchema
} = require("./cancellation.schema");
const response = require("../../utils/response");

async function requestCancellation(req, res) {
  try {
    const { error } = createCancellationSchema.validate(req.body);

    if (error) return response.error(res, error.message, 400);

    const cancellation = await cancellationService.requestCancellation(
      req.user.userId,
      req.body
    );

    return response.success(res, cancellation, "Cancellation request created successfully");

  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

async function getMyCancellations(req, res) {

  try {
    const cancellations = await cancellationService.getMyCancellations(req.user.userId);

    return response.success(res, cancellations, "Cancellations fetched successfully");

  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

// cancellation id will be used by seller dashboard
async function getCancellationById(req, res) {

  try {
    const cancellation = await cancellationService.getCancellationById(
      req.params.id,
      req.user.userId,
      req.user.role
    );
    return response.success(res, cancellation, "Cancellation fetched successfully");

  } catch (err) {
    return response.error(res, err.message, err.message === "Cancellation not found" ? 404 : 403);
  }
}

// all cancellation data will be used in admin dashboard
async function getAllCancellations(req, res) {

  try {
    const { error } = getCancellationsSchema.validate(req.query);

    if (error) return response.error(res, error.message, 400);

    const cancellations = await cancellationService.getAllCancellations(
      req.query,
      req.user.role
    );

    return response.success(res, cancellations, "All cancellations fetched successfully");

  } catch (err) {
    return response.error(res, err.message, 403);
  }
}

//cancellation status update by admin as per delivery and refund 
async function updateCancellationStatus(req, res) {
  try {
    const { error } = updateCancellationStatusSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const cancellation = await cancellationService.updateCancellationStatus(
      req.params.id,
      req.body.status,
      req.user.userId,
      req.user.role
    );
    return response.success(res, cancellation, "Cancellation status updated successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}


async function getCancellationStats(req, res) {
  try {
    const stats = await cancellationService.getCancellationStats(
      req.user.userId,
      req.user.role
    );
    return response.success(res, stats, "Cancellation statistics fetched successfully");
  } catch (err) {
    return response.error(res, err.message, 403);
  }
}

module.exports = {
  requestCancellation,
  getMyCancellations,
  getCancellationById,
  getAllCancellations,
  updateCancellationStatus,
  getCancellationStats
};

