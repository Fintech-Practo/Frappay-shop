const response = require("../utils/response");

function allowRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.map(r => String(r).toLowerCase()).includes(
      req.user.role?.toLowerCase()
    )) {
      return response.error(res, "Access denied", 403);
    }
    next();
  };
}

function allowAnyRole(...roles) {
  return allowRole(...roles);
}

module.exports = {
  allowRole,
  allowAnyRole,
};