const express = require("express");
const controller = require("./seller.controller");
const onboardingController = require("./sellerOnboarding.controller");
const kycController = require("./kyc.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");
const { uploadProfileImage, uploadGovtId } = require("../../config/multer");

const router = express.Router();

// Seller onboarding routes (accessible to all authenticated users)
router.post("/register", authMiddleware, onboardingController.submitOnboarding);
router.get("/register/status", authMiddleware, onboardingController.getMyOnboardingStatus);

// Seller KYC routes
router.post("/kyc/submit", authMiddleware, kycController.submitKYC);
router.post("/kyc/upload", authMiddleware, uploadGovtId, kycController.uploadGovtDoc);
router.get("/kyc/status", authMiddleware, kycController.getKycStatus);

// Seller routes (requires SELLER role)
router.get("/dashboard", authMiddleware, controller.getDashboard);
router.get("/analytics", authMiddleware, controller.getSalesAnalytics);
router.get("/products", authMiddleware, controller.getMyProducts);
router.get("/orders", authMiddleware, controller.getMyOrders);
router.post("/warehouse", authMiddleware, allowRole(ROLES.SELLER), controller.addSellerWarehouse);
router.get("/warehouse", authMiddleware, allowRole(ROLES.SELLER), controller.getSellerWarehouses);

// Admin routes for seller onboarding & KYC
router.get("/onboarding/pending", authMiddleware, allowRole(ROLES.ADMIN), onboardingController.getAllPendingOnboarding);
router.get("/onboarding/:userId/details", authMiddleware, allowRole(ROLES.ADMIN), onboardingController.getOnboardingDetails);
router.post("/onboarding/:userId/approve", authMiddleware, allowRole(ROLES.ADMIN), onboardingController.approveOnboarding);
router.post("/onboarding/:userId/reject", authMiddleware, allowRole(ROLES.ADMIN), onboardingController.rejectOnboarding);
router.post("/kyc-review", authMiddleware, allowRole(ROLES.ADMIN), kycController.adminKycReview);

// Admin revenue routes
router.get("/admin/revenue", authMiddleware, allowRole(ROLES.ADMIN), controller.getAdminRevenue);

// Update profile
router.put(
    "/profile",
    authMiddleware,
    allowRole(ROLES.SELLER),
    uploadProfileImage,
    controller.updateProfile
);

// Request commission change
router.post(
    "/commission/request",
    authMiddleware,
    allowRole(ROLES.SELLER),
    controller.requestCommissionChange
);

// Get profile update requests
router.get(
    "/profile-requests",
    authMiddleware,
    allowRole(ROLES.SELLER),
    controller.getProfileRequests
);

module.exports = router;