const express = require('express');
const router = express.Router();
const returnsController = require('./returns.controller');
const auth = require('../../middlewares/auth.middleware');
const { allowRole } = require('../../middlewares/role.middleware');
const ROLES = require('../../config/roles');

// User Routes
router.post('/', auth, returnsController.createReturnRequest);
router.get('/my', auth, returnsController.getMyReturns);
router.get('/my/refunds', auth, returnsController.getMyRefunds);
router.get('/:id', auth, returnsController.getReturnById);

// Admin Routes
router.patch('/:id/status', auth, allowRole(ROLES.ADMIN), returnsController.adminUpdateReturnStatus);
router.get('/admin/all', auth, allowRole(ROLES.ADMIN), returnsController.getAllReturns);
router.get('/admin/analytics', auth, allowRole(ROLES.ADMIN), returnsController.getReturnAnalytics);

module.exports = router;
