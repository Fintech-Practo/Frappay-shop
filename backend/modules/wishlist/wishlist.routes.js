const express = require('express');
const router = express.Router();
const wishlistController = require('./wishlist.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { validateRequest, validateQuery } = require('../../middlewares/validation.middleware');
const { addToWishlistSchema, getWishlistSchema } = require('./wishlist.schema');

router.use(authMiddleware);

router.get('/', validateQuery(getWishlistSchema), wishlistController.getWishlist);
router.post('/', validateRequest(addToWishlistSchema), wishlistController.addToWishlist);
router.delete('/:id', wishlistController.removeFromWishlist);
router.post('/:id/move-to-cart', wishlistController.moveToCart);
router.get('/price-drops', wishlistController.getPriceDrops);

module.exports = router;
