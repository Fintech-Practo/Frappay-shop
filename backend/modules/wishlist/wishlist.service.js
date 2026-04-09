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

// Handle legacy wishlist table with book_id field
async function addToWishlist(userId, productId) {
    try {
        // Check if this is an ebook product
        const [productRows] = await pool.execute(
            'SELECT format FROM products WHERE id = ?',
            [productId]
        );

        if (productRows.length > 0) {
            const format = productRows[0].format;
            if (format === 'EBOOK' || format === 'BOTH') {
                const hasPurchased = await hasUserPurchasedEbook(userId, productId);
                if (hasPurchased) {
                    throw new Error("You have already purchased this e-book");
                }
            }
        }

        // First try to use cart_items approach (new method)
        const cartModel = require('../cart/cart.model');
        const cartItemModel = require('../cart/cartItem.model');

        const cart = await cartModel.findOrCreateByUserId(userId);

        await cartItemModel.create({
            cart_id: cart.id,
            product_id: productId,
            quantity: 1,
            type: 'WISHLIST'
        });

    } catch (error) {
        // If cart_items approach fails, try legacy wishlist table
        if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('cart_items')) {
            console.log("Falling back to legacy wishlist table");

            // Check if legacy wishlist table exists
            const [tableCheck] = await pool.execute(
                `SELECT COUNT(*) as count FROM information_schema.tables 
                 WHERE table_schema = DATABASE() AND table_name = 'wishlists'`
            );

            if (tableCheck[0].count > 0) {
                // Use legacy wishlist table with book_id field
                await pool.execute(
                    `INSERT INTO wishlists (user_id, book_id, created_at, updated_at) 
                     VALUES (?, ?, NOW(), NOW())`,
                    [userId, productId]
                );
            } else {
                throw new Error("No wishlist system available");
            }
        } else {
            throw error;
        }
    }
}

async function removeFromWishlist(userId, wishlistId) {
    try {
        // Try cart_items approach first
        const cartModel = require('../cart/cart.model');
        const cartItemModel = require('../cart/cartItem.model');

        const cart = await cartModel.findByUserId(userId);
        if (!cart) return;

        const item = await cartItemModel.findById(wishlistId);
        if (item && item.cart_id === cart.id) {
            await cartItemModel.remove(wishlistId);
        }

    } catch (error) {
        // Fallback to legacy table
        if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('cart_items')) {
            await pool.execute(
                `DELETE FROM wishlists WHERE id = ? AND user_id = ?`,
                [wishlistId, userId]
            );
        } else {
            throw error;
        }
    }
}

async function getWishlist(userId) {
    try {
        // Try cart_items approach first
        const cartModel = require('../cart/cart.model');
        const cartItemModel = require('../cart/cartItem.model');

        const cart = await cartModel.findByUserId(userId);
        if (!cart) return [];

        const items = await cartItemModel.findByCartId(cart.id, { type: 'WISHLIST' });

        // Filter out purchased ebooks
        const filteredItems = [];
        for (const item of items) {
            // Check if this is an ebook that has been purchased
            if (item.format === 'EBOOK' || item.format === 'BOTH') {
                const hasPurchased = await hasUserPurchasedEbook(userId, item.product_id);
                if (hasPurchased) {
                    // Remove this item from wishlist silently
                    try {
                        await cartItemModel.remove(item.id);
                    } catch (err) {
                        console.error("Failed to remove purchased ebook from wishlist:", err);
                    }
                    continue; // Skip this item
                }
            }
            filteredItems.push(item);
        }

        return filteredItems.map(item => ({
            id: item.id,
            product_id: item.product_id,
            title: item.title,
            price: item.price,
            image: item.image_url,
            image_url: item.image_url,
            stock: item.stock,
            is_active: item.is_active,
            format: item.format,
            created_at: item.created_at
        }));

    } catch (error) {
        // Fallback to legacy table
        if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('cart_items')) {
            const [rows] = await pool.execute(
                `SELECT w.*, p.title, p.selling_price as price, p.image_url, p.stock, p.is_active, p.format
                 FROM wishlists w
                 LEFT JOIN products p ON w.book_id = p.id
                 WHERE w.user_id = ?
                 ORDER BY w.created_at DESC`,
                [userId]
            );

            // Filter out purchased ebooks from legacy table
            const filteredRows = [];
            for (const item of rows) {
                if (item.format === 'EBOOK' || item.format === 'BOTH') {
                    const hasPurchased = await hasUserPurchasedEbook(userId, item.book_id);
                    if (hasPurchased) {
                        // Remove this item from wishlist silently
                        try {
                            await pool.execute('DELETE FROM wishlists WHERE id = ?', [item.id]);
                        } catch (err) {
                            console.error("Failed to remove purchased ebook from legacy wishlist:", err);
                        }
                        continue; // Skip this item
                    }
                }
                filteredRows.push(item);
            }

            return filteredRows.map(item => ({
                id: item.id,
                product_id: item.book_id,
                title: item.title,
                price: item.price,
                image: item.image_url,
                image_url: item.image_url,
                stock: item.stock,
                is_active: item.is_active,
                format: item.format,
                created_at: item.created_at
            }));
        } else {
            throw error;
        }
    }
}

async function moveToCart(userId, wishlistId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Try cart_items approach
        try {
            const cartModel = require('../cart/cart.model');
            const cartItemModel = require('../cart/cartItem.model');

            const cart = await cartModel.findByUserId(userId);
            if (!cart) throw new Error("Cart not found");

            const item = await cartItemModel.findById(wishlistId);
            if (!item || item.cart_id !== cart.id) {
                throw new Error("Wishlist item not found");
            }

            // Check if same product is already in cart
            const [existingCartItems] = await connection.execute(
                'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND type = ?',
                [cart.id, item.product_id, 'CART']
            );

            if (existingCartItems.length > 0) {
                await connection.execute(
                    'UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?',
                    [existingCartItems[0].id]
                );
                await connection.execute('DELETE FROM cart_items WHERE id = ?', [wishlistId]);
            } else {
                await connection.execute(
                    'UPDATE cart_items SET type = ?, quantity = 1 WHERE id = ?',
                    ['CART', wishlistId]
                );
            }
        } catch (innerError) {
            // Fallback to legacy table approach
            const [wishlistItem] = await connection.execute(
                'SELECT user_id, book_id FROM wishlists WHERE id = ?',
                [wishlistId]
            );

            if (wishlistItem.length === 0 || wishlistItem[0].user_id !== userId) {
                throw new Error("Wishlist item not found");
            }

            const productId = wishlistItem[0].book_id;

            // Check if product is already in cart
            const [existingCart] = await connection.execute(
                `SELECT id, quantity FROM cart_items ci 
                 JOIN carts c ON ci.cart_id = c.id 
                 WHERE c.user_id = ? AND ci.product_id = ? AND ci.type = 'CART'`,
                [userId, productId]
            );

            if (existingCart.length > 0) {
                await connection.execute(
                    'UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?',
                    [existingCart[0].id]
                );
            } else {
                const [userCart] = await connection.execute(
                    'SELECT id FROM carts WHERE user_id = ?',
                    [userId]
                );

                if (userCart.length > 0) {
                    await connection.execute(
                        'INSERT INTO cart_items (cart_id, product_id, quantity, type) VALUES (?, ?, 1, "CART")',
                        [userCart[0].id, productId]
                    );
                }
            }

            // Remove from wishlist
            await connection.execute(
                'DELETE FROM wishlists WHERE id = ?',
                [wishlistId]
            );
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    moveToCart
};