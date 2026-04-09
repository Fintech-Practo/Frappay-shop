// GET EXPRESS TO BUILD THE SERVER - Restarted to pick up schema changes
const express = require("express");

// ALLOW FRONTEND TO TALK TO BACKEND
const cors = require("cors");

// ADD BASIC SECURITY HEADERS
const helmet = require("helmet");

// MAKE RESPONSES SOLD & FASTER
const compression = require("compression");

// ALL API ROUTES COME FROM HERE
const authRoutes = require("./modules/auth/auth.routes");
const productRoutes = require("./modules/product/product.routes");
const orderRoutes = require("./modules/order/order.routes");
const cartRoutes = require("./modules/cart/cart.routes");
const sellerRoutes = require("./modules/seller/seller.routes");
const reviewRoutes = require("./modules/review/review.routes");
const paymentRoutes = require("./modules/payment/payment.routes");


// STOP TOO MANY REQUESTS (ABUSE / SPAM)+02222
const rateLimit = require("./middlewares/rateLimit.middleware");

// HANDLE ALL ERRORS IN ONE PLACE
const errorMiddleware = require("./middlewares/error.middleware");
const response = require("./utils/response");

// CREATE APP
const app = express();
app.set('trust proxy', 1); // Allow rate limiter to correctly identify IPs behind proxy

// SECURITY STUFF
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ALLOW CROSS ORIGIN REQUESTS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://frappay.shop'],
  credentials: true
}));

// SPEED UP RESPONSES
app.use(compression());

// READ JSON BODY
app.use(express.json({ limit: "5mb" }));

app.use(require('./middlewares/requestContext'));

// READ FORM DATA
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// SPEED UP RESPONSES
app.use(compression());

// MAINTAINENCE GUARD (Must be before routes)
const maintenanceGuard = require("./middlewares/maintenanceGuard");
app.use("/api", maintenanceGuard);

// SERVE STATIC FILES (including uploads) WITH CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// LIMIT REQUESTS
app.use(rateLimit);

// MAIN API ENTRY POINT
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", require("./modules/category/category.routes"));
app.use("/api/metadata", require("./modules/metadata/metadata.routes"));
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/addresses", require("./modules/address/address.routes"));

app.use("/api/users", require("./modules/user/user.routes"));
app.use("/api/wishlist", require("./modules/wishlist/wishlist.routes"));
app.use("/api/admin", require("./modules/admin/admin.routes"));
app.use("/api/admin/analytics", require("./modules/admin/adminAnalytics.routes"));
app.use("/api/audit", require("./modules/audit/audit.routes"));
app.use("/api/support", require("./modules/support/support.routes"));
app.use("/api/checkout", require("./modules/checkout/checkout.routes"));
app.use("/api/logistics", require("./modules/logistics/logistics.routes"));
app.use("/api/shipping", require("./modules/shipping/shipping.routes"));
app.use("/api/notifications", require("./modules/notification/notification.routes"));
app.use("/api/returns", require("./modules/returns/returns.routes"));
app.use("/api/site-settings", require("./modules/site-settings/site-settings.routes"));
app.use("/api/cancellations", require("./modules/cancellation/cancellation.routes"));
app.use("/api/order-items", require("./modules/orderItem/orderItem.routes"));
app.use("/api/analytics", require("./modules/analytics/analytics.routes"));
app.use("/api/chatbot", require("./modules/chatbot/chatbot.routes"));
app.use("/api/coupons", require("./modules/coupons/coupon.routes"));
app.use("/api/wallet", require("./modules/wallet/wallet.routes"));
app.use("/api/rewards", require("./modules/rewards/reward.routes"));
app.use("/api/finance", require("./modules/finance/finance.routes"));

// Preferences (user onboarding/settings)
app.use("/api/preferences", require("./modules/preferences/preference.routes"));
app.use("/api/webhooks", require("./modules/webhook/webhook.routes"));
app.use("/api/admin/reward-rules", require("./modules/rewards/rewardRules.routes"));


// ─────────────────────────────────────────────────────────────
// 🚧 TEMPORARY TEST ROUTE — Remove before production deployment
// Hit: GET /test-delhivery
// Purpose: Verify Delhivery token & API connectivity
// ─────────────────────────────────────────────────────────────
const delhiveryService = require("./modules/logistics/delhivery.service");
app.get("/test-delhivery", async (req, res) => {
  try {

    const order = {
      id: 999,
      shipping_address: {
        full_name: "Test User",
        address_line1: "Test Address",
        postal_code: "110001",
        city: "Delhi",
        state: "Delhi",
        phone: "9999999999"
      },
      payment_method: "prepaid",
      total_amount: 100,
      items: [{ product_title: "Test Book", quantity: 1 }],
      total_weight: 0.5,
      pickup_location_name: "FRAP PAY SHOPSOLUTIONSL-do-B2C"
    };

    const result = await require("./modules/logistics/delhivery.service")
      .createShipment(order);

    res.json(result);

  } catch (e) {
    res.json({ error: e.message });
  }
})

// 404 handler for unmatched routes
app.use((req, res) => {
  response.error(res, `Route ${req.method} ${req.path} not found`, 404);
});

// EXPORT APP
module.exports = app;
