const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { allowRole } = require('../../middlewares/role.middleware');
const ROLES = require('../../config/roles');

// Public/Internal Migration (Temporary for migration)
router.get('/migrate', financeController.runMigration);

// Admin Routes
router.patch('/payouts/:id/process', authMiddleware, allowRole([ROLES.ADMIN]), financeController.processPayout);
router.patch('/payouts/:id/settle', authMiddleware, allowRole([ROLES.ADMIN]), financeController.settlePayout);
router.patch('/payouts/:id/fail', authMiddleware, allowRole([ROLES.ADMIN]), financeController.failPayout);

// Refunds
router.post('/refunds/approve/:id', authMiddleware, allowRole([ROLES.ADMIN]), financeController.approveRefund);
router.patch('/refunds/:id/process', authMiddleware, allowRole([ROLES.ADMIN]), financeController.processRefund);
router.patch('/refunds/:id/settle', authMiddleware, allowRole([ROLES.ADMIN]), financeController.settleRefund);
router.patch('/refunds/:id/fail', authMiddleware, allowRole([ROLES.ADMIN]), financeController.failRefund);
router.get('/admin/ledger', authMiddleware, allowRole(ROLES.ADMIN), financeController.getLedgerEntries);
router.get('/admin/order-ledger', authMiddleware, allowRole(ROLES.ADMIN), financeController.getOrderLedger);
router.get('/admin/payout-ledger', authMiddleware, allowRole(ROLES.ADMIN), financeController.getPayoutLedger);
router.get('/admin/refund-ledger', authMiddleware, allowRole(ROLES.ADMIN), financeController.getRefundLedger);
router.patch('/admin/payouts/:id', authMiddleware, allowRole(ROLES.ADMIN), financeController.updatePayout);

// Seller/User Routes
router.get('/seller/payouts', authMiddleware, allowRole(ROLES.SELLER), financeController.getSellerPayouts);
router.get('/user/refunds', authMiddleware, financeController.getUserRefunds);

module.exports = router;
