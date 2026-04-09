const pool = require("../config/db");
const response = require("../utils/response");

const kycVerified = async (req, res, next) => {
    try {
        // Admins are exempt from seller KYC checks
        if (req.user.role === 'ADMIN') {
            return next();
        }

        const [rows] = await pool.execute(
            "SELECT is_kyc_verified FROM seller_info WHERE user_id = ?",
            [req.user.userId]
        );

        if (rows.length === 0 || !rows[0].is_kyc_verified) {
            return response.error(res, "Your KYC is not verified. Please complete KYC to perform this action.", 403);
        }

        next();
    } catch (error) {
        console.error("KYC middleware error:", error);
        return response.error(res, "Internal server error during KYC check.", 500);
    }
};

module.exports = kycVerified;
