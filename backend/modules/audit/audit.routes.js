const express = require("express");
const controller = require("./audit.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    allowRole(ROLES.ADMIN),
    controller.getAuditLogs
);

module.exports = router;
