const pool = require("../../config/db");
const { uploadPrivateToS3, getSignedDocUrl } = require("../../utils/s3.util");
const logger = require("../../utils/logger");

async function submitKYC(userId, data) {
    const { gst_number, govt_id_type, govt_id_number, is_books_only, pan_number, aadhaar_number } = data;

    // GST validation: Mandatory unless is_books_only is true
    if (!is_books_only) {
        if (!gst_number) {
            throw new Error("GST number is required for this category.");
        }
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{1}$/;
        if (!gstRegex.test(gst_number.toUpperCase())) {
            throw new Error("Invalid GST number format. Please check the 15-character GSTIN.");
        }
    }

    // Validate Government ID format
    // Validate PAN & Aadhaar numbers (usually provided in registration but double check here)
    if (pan_number) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(pan_number.toUpperCase())) {
            throw new Error("Invalid PAN format.");
        }
    }
    if (aadhaar_number) {
        const aadhaarRegex = /^\d{12}$/;
        if (!aadhaarRegex.test(aadhaar_number)) {
            throw new Error("Invalid Aadhaar format. Must be 12 digits.");
        }
    }

    // Update seller_info
    await pool.execute(
        `UPDATE seller_info 
         SET gst_number = ?, 
             pan_number = ?,
             aadhaar_number = ?,
             is_books_only = ?,
             kyc_status = 'pending',
             is_kyc_verified = FALSE
         WHERE user_id = ?`,
        [
            is_books_only ? (gst_number || null) : gst_number.toUpperCase(), 
            pan_number ? pan_number.toUpperCase() : null,
            aadhaar_number || null,
            is_books_only ? 1 : 0,
            userId
        ]
    );

    return { success: true, message: "KYC details submitted successfully. Please upload the document." };
}

async function uploadGovtDoc(userId, govtIdType, buffer, mimetype) {
    // Determine file extension
    let ext = "jpg";
    if (mimetype === "application/pdf") ext = "pdf";
    else if (mimetype === "image/png") ext = "png";
    else if (mimetype === "image/jpeg" || mimetype === "image/jpg") ext = "jpg";

    const fileName = `seller-docs/${userId}/${govtIdType}.${ext}`;
    
    // Upload to S3 privately
    const s3Key = await uploadPrivateToS3(buffer, fileName, mimetype);

    // Update DB with the specific URL column
    const column = govtIdType === 'pan' ? 'pan_url' : 'aadhaar_url';
    
    await pool.execute(
        `UPDATE seller_info SET ${column} = ? WHERE user_id = ?`,
        [s3Key, userId]
    );

    return { success: true, url: s3Key };
}

async function getKycStatus(userId) {
    const [rows] = await pool.execute(
        `SELECT gst_number, pan_number, aadhaar_number, pan_url, aadhaar_url, is_books_only, kyc_status, is_kyc_verified, kyc_rejection_reason 
         FROM seller_info WHERE user_id = ?`,
        [userId]
    );

    if (rows.length === 0) return null;

    const kyc = rows[0];
    
    // Generate signed URLs if docs exist
    if (kyc.pan_url) {
        kyc.pan_url = await getSignedDocUrl(kyc.pan_url);
    }
    if (kyc.aadhaar_url) {
        kyc.aadhaar_url = await getSignedDocUrl(kyc.aadhaar_url);
    }

    return kyc;
}

async function adminKycReview(sellerId, status, adminId, reason = null) {
    if (!["approved", "rejected"].includes(status)) {
        throw new Error("Invalid status. Must be 'approved' or 'rejected'.");
    }

    const isVerified = status === "approved";

    await pool.execute(
        `UPDATE seller_info 
         SET kyc_status = ?, 
             is_kyc_verified = ?, 
             kyc_reviewed_by = ?, 
             kyc_reviewed_at = CURRENT_TIMESTAMP,
             kyc_rejection_reason = ?
         WHERE user_id = ?`,
        [status, isVerified, adminId, reason, sellerId]
    );

    return { success: true, message: `KYC ${status} successfully.` };
}

module.exports = {
    submitKYC,
    uploadGovtDoc,
    getKycStatus,
    adminKycReview
};
