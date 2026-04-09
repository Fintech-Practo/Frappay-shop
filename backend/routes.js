const express = require("express");

const router = express.Router();


router.get("/", (req, res) => {
  res.json({ message: "API root working" });
});

router.use("/auth", require("./modules/auth/auth.routes"));
router.use("/users", require("./modules/user/user.routes"));
router.use("/admin", require("./modules/admin/admin.routes"));
router.use("/admin/analytics", require("./modules/admin/adminAnalytics.routes"));
router.use("/products", require("./modules/product/product.routes"));
router.use("/categories", require("./modules/category/category.routes"));
router.use("/books", require("./modules/book/book.routes"));
router.use("/orders", require("./modules/order/order.routes"));
router.use("/cancellations", require("./modules/cancellation/cancellation.routes"));
router.use("/cart", require("./modules/cart/cart.routes"));
router.use("/seller", require("./modules/seller/seller.routes"));
router.use("/order-items", require("./modules/orderItem/orderItem.routes"));
router.use("/addresses", require("./modules/address/address.routes"));
router.use("/reviews", require("./modules/review/review.routes"));
router.use("/wishlist", require("./modules/wishlist/wishlist.routes"));
router.use("/audit", require("./modules/audit/audit.routes"));
router.use("/support", require("./modules/support/support.routes"));
router.use("/checkout", require("./modules/checkout/checkout.routes"));
router.use("/logistics", require("./modules/logistics/logistics.routes"));
router.use("/shipping", require("./modules/shipping/shipping.routes"));
router.use("/site-settings", require("./modules/site-settings/site-settings.routes"));
router.use("/analytics", require("./modules/analytics/analytics.routes"));
router.use("/preferences", require("./modules/preferences/preference.routes"));
router.use("/webhooks", require("./modules/webhook/webhook.routes"));
router.use("/admin/reward-rules", require("./modules/rewards/rewardRules.routes"));

module.exports = router;
