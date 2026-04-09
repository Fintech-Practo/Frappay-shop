const response = require("../../utils/response");

function requireVerifiedEmail(req, res, next) {
    // Check if user exists in request (populated by auth middleware)
    // and if is_email_verified is truthy
    if (!req.user || !req.user.is_email_verified) {
        return response.error(res, "Email verification required", 403);
    }
    next();
}

module.exports = { requireVerifiedEmail };
