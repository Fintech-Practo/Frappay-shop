const response = require("../utils/response");

function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  // Detailed logging for backend monitoring (Step 6)
  logger.error(`${req.method} ${req.url} - Error: ${message}`, {
    statusCode,
    stack: err.stack,
    body: req.body,
    user: req.user?.userId
  });

  if (res.headersSent) {
    return next(err);
  }

  return response.error(res, message, statusCode);
}

module.exports = errorMiddleware;
