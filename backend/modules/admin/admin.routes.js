const router = require("express").Router();

const adminController = require("./admin.controller");
const couponController = require("../coupons/coupon.controller");

const auth = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");

// REMOVED redundant express and router declarations here to fix SyntaxError
const adminService = require('./admin.service'); // adjust path

router.get('/refund-ledger', async (req, res) => {
  try {
    const { page, limit, status, order_id } = req.query;

    const result = await adminService.getRefundLedger(
      Number(page) || 1,
      Number(limit) || 10,
      { status, order_id }
    );

    res.json(result);
  } catch (err) {
    console.error("Refund Ledger Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= USERS =================
router.get("/users", auth, allowRole(ROLES.ADMIN), adminController.listUsers);
router.get("/users/:userId/details", auth, allowRole(ROLES.ADMIN), adminController.getUserDetails);

// ================= DASHBOARD =================
router.get("/dashboard", auth, allowRole(ROLES.ADMIN), adminController.getDashboardStats);

// ================= ORDERS =================
router.get("/orders", auth, allowRole(ROLES.ADMIN), adminController.listOrders);
router.get("/orders/:orderId/details", auth, allowRole(ROLES.ADMIN), adminController.getOrderDetails);
router.get("/orders/:orderId/sms-logs", auth, allowRole(ROLES.ADMIN), adminController.getOrderSMSLogs);

// ================= INVENTORY =================
router.get("/inventory", auth, allowRole(ROLES.ADMIN), adminController.getInventoryList);
router.get("/inventory/low-stock", auth, allowRole(ROLES.ADMIN), adminController.getLowStockProducts);
router.get("/inventory/:productId/details", auth, allowRole(ROLES.ADMIN), adminController.getInventoryDetails);

// ================= SELLERS =================
router.get("/sellers/:sellerId/details", auth, allowRole(ROLES.ADMIN), adminController.getSellerDetails);
router.get("/sellers/:sellerId/warehouse-status", auth, allowRole(ROLES.ADMIN), adminController.getSellerWarehouseStatus);
router.get("/sellers/onboarding-requests", auth, allowRole(ROLES.ADMIN), adminController.getSellerOnboardingRequests);
router.get("/sellers", auth, allowRole(ROLES.ADMIN), adminController.listSellers);
router.patch("/sellers/:sellerId/commission", auth, allowRole(ROLES.ADMIN), adminController.updateSellerCommission);
router.post(
  "/payouts/bulk-settle",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.bulkSettleSellerPayouts
);

// ================= CARTS =================
router.get(
  "/carts/abandoned",
  auth,
  allowRole(ROLES.ADMIN),
  (req, res) => res.json({ success: true, data: [] }) // safe fallback
);

// ================= PROFILE UPDATES =================
router.get(
  "/profile-updates/requests",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.getProfileUpdateRequests
);

// ================= COMMISSION =================
router.get(
  "/commission/global",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.getGlobalCommission
);

router.put(
  "/commission/global",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.updateGlobalCommission
);

router.get(
  "/commission/requests",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.getCommissionRequests
);

router.post(
  "/commission/requests/:requestId/action",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.actionCommissionRequest
);

// ================= SHIPPING MARGINS =================
router.get(
  "/shipping-margins",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.getShippingMargins
);

router.post(
  "/shipping-margins",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.createShippingMargin
);

router.delete(
  "/shipping-margins/:id",
  auth,
  allowRole(ROLES.ADMIN),
  adminController.deleteShippingMargin
);

// ================= COUPONS =================
router.post("/coupons", auth, allowRole(ROLES.ADMIN), couponController.createCoupon);
router.get("/coupons", auth, allowRole(ROLES.ADMIN), couponController.getCoupons);
router.patch("/coupons/:id/toggle", auth, allowRole(ROLES.ADMIN), couponController.toggleCouponStatus);

// ================= SYSTEM =================
router.post("/validate", auth, couponController.validateCoupon);

module.exports = router;