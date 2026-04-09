const express = require("express");
const router = express.Router();
const controller = require("./order.controller");
const auth = require("../../middlewares/auth.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const {
  validateRequest,
  validateQuery,
} = require("../../middlewares/validation.middleware");
const ROLES = require("../../config/roles");
const {
  createOrderSchema,
  updateOrderStatusSchema,
  getOrdersSchema,
} = require("./order.schema");


// STEP 4: POST /orders/cod
// COD orders bypass payment gateway; created directly from checkout session
router.post("/cod", auth, controller.createCodOrder);

router.post(
  "/",
  auth,
  validateRequest(createOrderSchema),
  controller.createOrder,
);

router.get(
  "/my-orders",
  auth,
  validateQuery(getOrdersSchema),
  controller.getMyOrders,
);
router.get("/my-ebooks", auth, controller.getMyEbooks);
router.get("/stats", auth, allowRole(ROLES.ADMIN), controller.getOrderStats);
router.get(
  "/all",
  auth,
  allowRole(ROLES.ADMIN),
  validateQuery(getOrdersSchema),
  controller.getAllOrders,
);
router.get("/orders/:id/label", auth, controller.getLabel);

router.get("/scan/:code", authMiddleware, controller.scanBarcode);
router.get("/:id/invoice", auth, controller.getInvoice);

router.get(
  "/orders/:id/download/:productId",
  auth,
  allowRole(ROLES.ADMIN, ROLES.SELLER),
  controller.downloadProduct,
);

router.get("/:id/stream/:productId", auth, controller.streamEbook);
router.get("/:id", auth, controller.getOrderById);

/**
 * ORDER STATE MACHINE : CONFIRM & SHIP
 */
router.post(
  "/:id/confirm",
  auth,
  allowRole(ROLES.ADMIN, ROLES.SELLER),
  controller.confirmOrder,
);

router.post(
  "/:id/ship",
  auth,
  allowRole(ROLES.ADMIN, ROLES.SELLER),
  controller.shipOrder,
);
/**
 * ADMIN/SELLER : UPDATE ORDER STATUS (Generic)
 */
router.patch(
  "/:id/status",
  auth,
  allowRole(ROLES.ADMIN, ROLES.SELLER),
  validateRequest(updateOrderStatusSchema),
  controller.updateOrderStatus,
);

/**
 * CANCEL ORDER
 */
router.patch(
  "/:id/cancel",
  auth,
  allowRole(ROLES.ADMIN, ROLES.SELLER),
  controller.cancelOrder,
);


/**
 * RETURNS
 */
router.post("/:id/return", auth, controller.requestReturn);

router.get(
  "/returns/list",
  auth,
  allowRole(ROLES.ADMIN),
  controller.getReturnRequests,
);

router.patch(
  "/returns/:id/status",
  auth,
  allowRole(ROLES.ADMIN),
  controller.updateReturnStatusForReturn,
);

module.exports = router;