const express = require('express');
const router = express.Router();
// Point to the local admin analytics controller
const analyticsController = require('./adminAnalytics.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { allowRole } = require('../../middlewares/role.middleware');
const ROLES = require('../../config/roles');
const { validateQuery } = require('../../middlewares/validation.middleware');
const Joi = require('joi');

// Analytics filters validation schema
const analyticsFiltersSchema = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  includeOutOfStock: Joi.boolean().default(false)
});

// Apply auth and admin role middleware to all routes
router.use(authMiddleware);
router.use(allowRole(ROLES.ADMIN));

// GET /api/admin/analytics/overview - Global platform overview
router.get('/overview',
  validateQuery(analyticsFiltersSchema),
  analyticsController.getOverview
);

// GET /api/admin/analytics/sales - Global sales analytics
router.get('/sales',
  validateQuery(analyticsFiltersSchema),
  analyticsController.getSalesAnalytics
);

// GET /api/admin/analytics/sellers - Global seller analytics
router.get('/sellers',
  validateQuery(analyticsFiltersSchema),
  analyticsController.getSellerAnalytics
);

// GET /api/admin/analytics/users - Global user analytics
router.get('/users',
  validateQuery(analyticsFiltersSchema),
  analyticsController.getUserAnalytics
);

// GET /api/admin/analytics/inventory - Global inventory analytics
router.get('/inventory',
  validateQuery(analyticsFiltersSchema),
  analyticsController.getInventoryAnalytics
);

// GET /api/admin/analytics/financial - Global financial analytics
router.get('/financial',
  validateQuery(analyticsFiltersSchema),
  analyticsController.getFinancialAnalytics
);

// GET /api/admin/analytics/export/:type - Export analytics data
router.get('/export/:type',
  validateQuery(analyticsFiltersSchema),
  (req, res) => res.json({ success: true, message: "Export not implemented in this phase" })
);

module.exports = router;