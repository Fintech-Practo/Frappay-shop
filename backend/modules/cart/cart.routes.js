const express = require("express");
const controller = require("./cart.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, controller.getMyCart);
router.post("/add", authMiddleware, controller.addToCart);
router.post("/", authMiddleware, controller.addToCart); // Backward compatibility
router.get("/wishlist", authMiddleware, controller.getWishlist);
router.post("/wishlist", authMiddleware, controller.addToWishlist);
router.delete("/wishlist/:id", authMiddleware, controller.removeFromWishlist); // More specific route FIRST
router.get("/favorites", authMiddleware, controller.getFavorites);
router.get("/recommendations", authMiddleware, controller.getRecommendationData);
router.patch("/items/:id", authMiddleware, controller.updateCartItem);
router.put("/:id", authMiddleware, controller.updateCartItem); // Alternative route
router.delete("/items/:id", authMiddleware, controller.removeFromCart);
router.delete("/:id", authMiddleware, controller.removeFromCart); // Alternative route for frontend compatibility
router.delete("/clear", authMiddleware, controller.clearCart);

module.exports = router;