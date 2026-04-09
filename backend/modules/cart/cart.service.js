const cartModel = require("./cart.model");
const cartItemModel = require("./cartItem.model");
const productModel = require("../product/product.model");
const pool = require("../../config/db");

/**
 * Check if user has already purchased an ebook
 * @param {number} userId - User ID
 * @param {number} productId - Product ID
 * @returns {Promise<boolean>} - True if user has purchased this ebook
 */
async function hasUserPurchasedEbook(userId, productId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ? 
         AND oi.product_id = ? 
         AND oi.format IN ('EBOOK', 'DIGITAL')
         AND o.status NOT IN ('CANCELLED', 'FAILED')`,
      [userId, productId]
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error("Error checking ebook purchase status:", error);
    return false; // Fail open to not block legitimate purchases
  }
}

async function getMyCart(userId, filters = {}) {
  try {
    const cart = await cartModel.findOrCreateByUserId(userId);
    if (!cart || !cart.id) {
      throw new Error("Failed to create or retrieve cart");
    }

    // If no type filter specified, default to CART type items only
    const queryFilters = filters.type ? filters : { type: "CART" };

    const items = await cartItemModel.findByCartId(cart.id, queryFilters);

    // Calculate total - filter valid items (only for CART type, not WISHLIST)
    let total = 0;
    let validItems = (filters.type === "WISHLIST"
      ? items.filter(item => item && item.is_active !== false && item.is_active !== 0) // Wishlist items don't need stock check
      : items.filter(item => item && item.is_active !== false && item.is_active !== 0 && (item.is_unlimited_stock || item.stock === null || item.stock === undefined || item.stock > 0)) // Cart items need stock or unlimited
    ).map(item => {
      // Data Repair: If purchase_format is null or inconsistent with product format
      let purchaseFormat = item.purchase_format;
      if (!purchaseFormat || (item.format === 'EBOOK' && purchaseFormat !== 'EBOOK')) {
        purchaseFormat = item.format === 'EBOOK' ? 'EBOOK' : (item.format === 'BOTH' ? null : 'PHYSICAL');
      }

      const isDigital = purchaseFormat === 'EBOOK' || purchaseFormat === 'DIGITAL' || item.format === 'EBOOK' || item.product_type_code === 'EBOOK';

      return {
        ...item,
        purchase_format: purchaseFormat,
        price: item.price ? parseFloat(item.price) : 0,
        quantity: isDigital ? 1 : (item.quantity ? parseInt(item.quantity) : 1),
        stock: item.stock !== null && item.stock !== undefined ? parseInt(item.stock) : null
      };
    });

    // Filter out purchased ebooks
    const filteredItems = [];
    for (const item of validItems) {
      // Check if this is an ebook that has been purchased
      if (item.format === 'EBOOK' || item.format === 'BOTH') {
        const hasPurchased = await hasUserPurchasedEbook(userId, item.product_id);
        if (hasPurchased) {
          // Remove this item from cart silently
          try {
            await cartItemModel.remove(item.id);
          } catch (err) {
            console.error("Failed to remove purchased ebook from cart:", err);
          }
          continue; // Skip this item
        }
      }
      filteredItems.push(item);
    }

    for (const item of filteredItems) {
      if (item.price && item.quantity) {
        total += item.price * item.quantity;
      }
    }

    return {
      cart,
      items: filteredItems,
      total: parseFloat(total.toFixed(2)),
      item_count: filteredItems.length
    };
  } catch (error) {
    console.error("Error in getMyCart:", error);
    throw error;
  }
}

async function addToCart(userId, data) {
  const { product_id, quantity, type = "CART", purchase_format } = data;

  // Verify product exists and is available
  const product = await productModel.findById(product_id);

  if (!product || !product.is_active) {
    throw new Error("Product not found or unavailable");
  }

  // Check if user has already purchased this ebook
  if (product.format === 'EBOOK' || product.format === 'BOTH') {
    const hasPurchased = await hasUserPurchasedEbook(userId, product_id);
    if (hasPurchased) {
      throw new Error("You have already purchased this e-book");
    }
  }

  // For CART type, check stock availability
  // Determine if it's a digital purchase
  // Determine if it's a digital purchase
  const isDigital = purchase_format === 'EBOOK' || purchase_format === 'DIGITAL' || product.format === 'EBOOK';
  const effectiveQuantity = isDigital ? 1 : quantity;

  if (type === "CART" && !product.is_unlimited_stock && product.stock < effectiveQuantity) {
    throw new Error(`Insufficient stock. Available: ${product.stock}`);
  }

  // Get or create cart
  const cart = await cartModel.findOrCreateByUserId(userId);

  // Determine the final purchase format
  const resolvedPurchaseFormat = isDigital ? 'EBOOK' : (purchase_format || 'PHYSICAL');

  // Add item to cart
  const cartItem = await cartItemModel.create({
    cart_id: cart.id,
    product_id,
    quantity: effectiveQuantity,
    type,
    purchase_format: resolvedPurchaseFormat
  });

  return cartItem;
}

async function updateCartItem(userId, itemId, data) {
  // Verify item belongs to user's cart
  const cart = await cartModel.findByUserId(userId);
  if (!cart) {
    throw new Error("Cart not found");
  }

  const item = await cartItemModel.findById(itemId);
  if (!item || item.cart_id !== cart.id) {
    throw new Error("Cart item not found");
  }

  // Update quantity
  const product = await productModel.findById(item.product_id);
  const isDigital = product.format === 'EBOOK' || product.product_type_code === 'EBOOK' || product.format === 'DIGITAL';
  const effectiveQuantity = isDigital ? 1 : data.quantity;

  if (item.type === "CART") {
    // Check stock for CART items
    if (!product.is_unlimited_stock && effectiveQuantity > product.stock) {
      throw new Error(`Insufficient stock. Available: ${product.stock}`);
    }
  }
  return await cartItemModel.updateQuantity(itemId, effectiveQuantity);

  // Update type
  if (data.type !== undefined) {
    return await cartItemModel.updateType(itemId, data.type);
  }

  return item;
}

async function removeFromCart(userId, itemId) {
  // Verify item belongs to user's cart
  const cart = await cartModel.findByUserId(userId);
  if (!cart) {
    throw new Error("Cart not found");
  }

  const item = await cartItemModel.findById(itemId);
  if (!item || item.cart_id !== cart.id) {
    throw new Error("Cart item not found");
  }

  await cartItemModel.remove(itemId);
  return { message: "Item removed from cart" };
}

async function clearCart(userId) {
  const cart = await cartModel.findByUserId(userId);
  if (!cart) {
    // If cart doesn't exist, it's already "cleared"
    return { message: "Cart cleared" };
  }

  await cartModel.clearCart(cart.id);
  return { message: "Cart cleared" };
}

async function getFavorites(userId) {
  return await cartItemModel.getFavoritesByUserId(userId);
}

async function getRecommendationData(userId) {
  return await cartItemModel.getRecommendationData(userId);
}

module.exports = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getFavorites,
  getRecommendationData
};