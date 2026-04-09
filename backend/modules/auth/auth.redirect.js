const ROLES = require("../../config/roles");

function getRedirectPath(role) {
    switch (role) {
        case ROLES.ADMIN:
            return "/admin/dashboard";
        case ROLES.SELLER:
            return "/seller/dashboard";
        case ROLES.USER:
        default:
            return "/app";
    }
}

module.exports = { getRedirectPath };
