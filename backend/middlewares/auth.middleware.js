const { verifyToken } = require("../utils/jwt");
const response = require("../utils/response");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      console.log("AuthMiddleware: Missing or invalid Authorization header");
      return response.error(res, "Authorization token missing", 401);
    }


    // Sanitize token (remove quotes if present)
    const cleanToken = token.replace(/^"|"$/g, '');

    const decoded = verifyToken(cleanToken);

    /**
     * 🔑 NORMALIZE USER SHAPE
     * Token payload = { user: { id, role } }
     * App expects    = { userId, role }
     */
    if (decoded.user) {
      req.user = {
        userId: decoded.user.id,
        role: decoded.user.role
      };
    } else {
      // fallback (older tokens if any)
      req.user = decoded;
    }

    next();
  } catch (err) {
    console.log("AuthMiddleware: Invalid or expired token", err.message);
    return response.error(res, "Invalid or expired token", 401);
  }
}

module.exports = authMiddleware;