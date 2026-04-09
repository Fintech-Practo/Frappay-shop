const router = require("express").Router();
const couponController = require("./coupon.controller");
const auth = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");
router.post(
    "/admin/coupons",
    auth,
    allowRole(ROLES.ADMIN),
    couponController.createCoupon
);

router.get(
    "/admin/coupons",
    auth,
    allowRole(ROLES.ADMIN),
    couponController.getCoupons
);

router.patch(
    "/admin/coupons/:id/toggle",
    auth,
    allowRole(ROLES.ADMIN),
    couponController.toggleCouponStatus
);


router.post(
    "/validate",
    auth,
    couponController.validateCoupon
);


module.exports = router;