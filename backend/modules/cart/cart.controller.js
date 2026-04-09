const cartService = require("./cart.service");
const {
  addToCartSchema,
  updateCartItemSchema,
  getCartItemsSchema
} = require("./cart.schema");
const response = require("../../utils/response");


// USERS CURRENT CART 
async function getMyCart(req, res) {
  try {
    const { error, value } = getCartItemsSchema.validate(req.query);

    if (error) return response.error(res, error.message, 400);


    const cart = await cartService.getMyCart(req.user.userId, value || {});

    return response.success(res, cart, "Cart fetched successfully");

  } catch (err) {
    console.error("Error in getMyCart:", err);
    return response.error(res, err.message || "Failed to fetch cart", 500);
  }
}

// ADD TO CART FUNCTION 
async function addToCart(req, res) {
  try {
    console.log("addToCart request body:", req.body);
    console.log("addToCart user:", req.user);
    
    const { error, value } = addToCartSchema.validate(req.body);
    console.log("Validation result:", { error, value });

    if (error) {
      console.log("Validation failed - details:", {
        message: error.message,
        details: error.details,
        body: req.body
      });
      return response.error(res, error.message, 400);
    }

    // Additional validation
    if (!value.product_id || isNaN(value.product_id) || value.product_id <= 0) {
      console.log("Invalid product_id:", value.product_id);
      return response.error(res, "Invalid product_id", 400);
    }

    const item = await cartService.addToCart(req.user.userId, value);
    console.log("addToCart success:", item);

    return response.success(res, item, "Item added to cart successfully");

  } catch (err) {
    console.error("Error in addToCart:", {
      message: err.message,
      stack: err.stack,
      sql: err.sql
    });
    return response.error(res, err.message, 400);
  }
}

// EACH ONE CHNAGE UPDATE WITH + AND -  
async function updateCartItem(req, res) {

  try {
    const { error } = updateCartItemSchema.validate(req.body);

    if (error) return response.error(res, error.message, 400);///HTTP 400 — Bad Request

    const item = await cartService.updateCartItem(
      req.user.userId,
      req.params.id,
      req.body
    );

    if (!item) {
      return response.success(res, { message: "Item removed" }, "Cart item updated");
    }

    return response.success(res, item, "Cart item updated successfully");

  } catch (err) {
    return response.error(res, err.message, 400);///HTTP 400 — Bad Request
  }
}

// REMOVING SINGLE PRODUCT FROM CART WITH REMOVE OPTION 
async function removeFromCart(req, res) {

  try {
    const result = await cartService.removeFromCart(req.user.userId, req.params.id);

    return response.success(res, result, "Item removed from cart successfully");

  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// IT CLEARS THE WHOLE CART 
async function clearCart(req, res) {
  try {
    const result = await cartService.clearCart(req.user.userId);
    return response.success(res, result, "Cart cleared successfully");
  } catch (err) {
    console.error("Clear Cart Error (Non-fatal):", err);
    // Return success to avoid treating cart clearing failure as a critical error in frontend
    // This is debated, but for this specific UX loop issue, it helps.
    return response.success(res, { message: "Cart cleared (with warnings)" }, "Cart cleared");
  }
}

async function getFavorites(req, res) {
  try {
    const favorites = await cartService.getFavorites(req.user.userId);

    return response.success(res, favorites, "Favorites fetched successfully");

  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getRecommendationData(req, res) {
  try {
    const data = await cartService.getRecommendationData(req.user.userId);

    return response.success(res, data, "Recommendation data fetched successfully");

  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getWishlist(req, res) {
  try {
    const wishlist = await cartService.getMyCart(req.user.userId, { type: "WISHLIST" });
    return response.success(res, wishlist, "Wishlist fetched successfully");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function addToWishlist(req, res) {
  try {
    const { error } = addToCartSchema.validate({ ...req.body, type: "WISHLIST" });
    if (error) return response.error(res, error.message, 400);

    const item = await cartService.addToCart(req.user.userId, { ...req.body, type: "WISHLIST" });
    return response.success(res, item, "Item added to wishlist successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

async function removeFromWishlist(req, res) {
  try {
    const result = await cartService.removeFromCart(req.user.userId, req.params.id);
    return response.success(res, result, "Item removed from wishlist successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

module.exports = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getFavorites,
  getRecommendationData,
  getWishlist,
  addToWishlist,
  removeFromWishlist
};