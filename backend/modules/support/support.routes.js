// src/routes/support.routes.js
const express = require("express");
const router = express.Router();

const supportController = require("./support.controller");

// middlewares
const authMiddleware = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");

// user routes
router.post("/", authMiddleware, supportController.createSupportTicket);
router.get("/my", authMiddleware, supportController.getMyTickets);

// admin routes
// NOTE: These admin routes should preferably be under /api/admin/support or accessible here with admin checks.
// The user provided structure shows them as part of the support router. 
// app.js maps /api/support to this file. 
// So the routes will be:
// /api/support/admin/all
// /api/support/admin/:id
// etc.

router.get("/admin/all", authMiddleware, allowRole(ROLES.ADMIN), supportController.adminListTickets);
router.get("/admin/:id", authMiddleware, allowRole(ROLES.ADMIN), supportController.adminGetTicket);
router.patch("/admin/:id", authMiddleware, allowRole(ROLES.ADMIN), supportController.adminUpdateTicket);

module.exports = router;    
