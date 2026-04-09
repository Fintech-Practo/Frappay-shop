const service = require("./kyc.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");

async function submitKYC(req, res) {
    try {
        const userId = req.user.userId;
        const result = await service.submitKYC(userId, req.body);
        return response.success(res, result.message, result);
    } catch (error) {
        logger.error("Error in submitKYC controller", { error: error.message, userId: req.user.userId });
        return response.error(res, error.message, 400);
    }
}

async function uploadGovtDoc(req, res) {
    try {
        if (!req.file) {
            return response.error(res, "No file uploaded.", 400);
        }

        const userId = req.user.userId;
        const { govt_id_type } = req.body;
        
        if (!govt_id_type) {
            return response.error(res, "govt_id_type is required.", 400);
        }

        const result = await service.uploadGovtDoc(
            userId,
            govt_id_type,
            req.file.buffer,
            req.file.mimetype
        );

        return response.success(res, "Document uploaded successfully.", result);
    } catch (error) {
        logger.error("Error in uploadGovtDoc controller", { error: error.message, userId: req.user.userId });
        return response.error(res, error.message, 500);
    }
}

async function getKycStatus(req, res) {
    try {
        const userId = req.user.userId;
        const status = await service.getKycStatus(userId);
        
        if (!status) {
            return response.error(res, "KYC details not found.", 404);
        }

        return response.success(res, "KYC status fetched.", status);
    } catch (error) {
        logger.error("Error in getKycStatus controller", { error: error.message, userId: req.user.userId });
        return response.error(res, error.message, 500);
    }
}

async function adminKycReview(req, res) {
    try {
        const adminId = req.user.userId;
        const { seller_id, status, reason } = req.body;

        if (!seller_id || !status) {
            return response.error(res, "seller_id and status are required.", 400);
        }

        const result = await service.adminKycReview(seller_id, status, adminId, reason);
        return response.success(res, result.message, result);
    } catch (error) {
        logger.error("Error in adminKycReview controller", { error: error.message });
        return response.error(res, error.message, 500);
    }
}

module.exports = {
    submitKYC,
    uploadGovtDoc,
    getKycStatus,
    adminKycReview
};
