const wishlistService = require('./wishlist.service');
const response = require('../../utils/response');
const logger = require('../../utils/logger');
const { validateRequest, validateQuery } = require('../../middlewares/validation.middleware');
const { addToWishlistSchema, getWishlistSchema } = require('./wishlist.schema');

async function addToWishlist(req, res) {
    try {
        const { error } = addToWishlistSchema.validate(req.body);
        if (error) {
            return response.error(res, error.message, 400);
        }

        const { product_id } = req.body;
        const userId = req.user.userId;

        await wishlistService.addToWishlist(userId, product_id);
        return response.success(res, null, "Added to wishlist");
    } catch (error) {
        logger.error("Add to wishlist failed", { 
            userId: req.user.userId, 
            productId: req.body.product_id,
            error: error.message 
        });
        if (error.code === 'ER_DUP_ENTRY') {
            return response.error(res, "Item already in wishlist", 400);
        }
        return response.error(res, error.message || "Failed to add to wishlist", 500);
    }
}

async function removeFromWishlist(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        await wishlistService.removeFromWishlist(userId, id);
        return response.success(res, null, "Removed from wishlist");
    } catch (error) {
        logger.error("Remove from wishlist failed", { 
            wishlistId: req.params.id,
            userId: req.user.userId,
            error: error.message 
        });
        return response.error(res, error.message || "Failed to remove from wishlist", 500);
    }
}

async function getWishlist(req, res) {
    try {
        const { error, value } = getWishlistSchema.validate(req.query);
        if (error) return response.error(res, error.message, 400);

        const userId = req.user.userId;
        const wishlist = await wishlistService.getWishlist(userId, value);
        return response.success(res, { items: wishlist }, "Wishlist fetched");
    } catch (error) {
        logger.error("Get wishlist failed", { 
            userId: req.user.userId,
            error: error.message 
        });
        return response.error(res, error.message || "Failed to fetch wishlist", 500);
    }
}

async function moveToCart(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        await wishlistService.moveToCart(userId, id);
        return response.success(res, null, "Moved to cart");
    } catch (error) {
        logger.error("Move to cart failed", { 
            wishlistId: req.params.id,
            userId: req.user.userId,
            error: error.message 
        });
        return response.error(res, error.message || "Failed to move to cart", 500);
    }
}

// NEW: Get price drops for wishlist items
async function getPriceDrops(req, res) {
    try {
        const userId = req.user.userId;
        const priceDrops = await wishlistService.getPriceDrops(userId);
        return response.success(res, { price_drops: priceDrops }, "Price drops fetched");
    } catch (error) {
        logger.error("Get price drops failed", { 
            userId: req.user.userId,
            error: error.message 
        });
        return response.error(res, error.message || "Failed to fetch price drops", 500);
    }
}

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    moveToCart,
    getPriceDrops
};
