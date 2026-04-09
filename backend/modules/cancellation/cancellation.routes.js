const express = require("express");
const controller = require("./cancellation.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");

const router = express.Router();


router.post("/", authMiddleware, controller.requestCancellation);
router.get("/my-cancellations", authMiddleware, controller.getMyCancellations);
router.get("/stats", authMiddleware, controller.getCancellationStats);
router.get("/:id", authMiddleware, controller.getCancellationById);


router.get("/", authMiddleware, allowRole(ROLES.ADMIN), controller.getAllCancellations);
router.patch(
  "/:id/status",
  authMiddleware,
  allowRole(ROLES.ADMIN),
  controller.updateCancellationStatus
);

module.exports = router;

