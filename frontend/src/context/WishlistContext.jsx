import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/config/api';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const { addItem: addCartItem, refreshCart } = useCart(); // Assuming refreshCart is available or we trigger update
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      setItems([]);
    }
  }, [isAuthenticated, token]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/wishlist');
      if (res.data.success) {
        const wishlistItems = res.data.data.items || [];

        // Fetch full product data for each item
        const enrichedItems = await Promise.all(
          wishlistItems.map(async (item) => {
            try {
              const productRes = await api.get(`/api/products/${item.product_id}`);
              return {
                ...item,
                product: productRes.data.data
              };
            } catch (err) {
              console.error("Failed to fetch product for wishlist item", err);
              return item; // fallback
            }
          })
        );

        setItems(enrichedItems);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId) => {
    if (!isAuthenticated) {
      throw new Error("Please login to use wishlist");
    }

    // Check if already in wishlist
    if (isInWishlist(productId)) {
      return { success: true }; // Already exists
    }

    // Optimistic update - add immediately
    const tempItem = {
      id: Date.now(), // Temporary ID
      product_id: parseInt(productId),
      created_at: new Date().toISOString()
    };
    setItems(prev => [...prev, tempItem]);

    try {
      const res = await api.post('/api/wishlist', {
        product_id: parseInt(productId)
      });

      if (res.data.success) {
        // Replace temp item with real item from backend
        await fetchWishlist();
        return { success: true };
      } else {
        // Remove optimistic item on failure
        setItems(prev => prev.filter(item => item.id !== tempItem.id));
        throw new Error(res.data.message || 'Failed to add to wishlist');
      }
    } catch (error) {
      // Remove optimistic item on error
      setItems(prev => prev.filter(item => item.id !== tempItem.id));

      if (error.response?.status === 400 && error.response?.data?.message?.includes('already in wishlist')) {
        // Sync with backend if it's already there
        await fetchWishlist();
        return { success: true };
      }

      throw new Error(error.response?.data?.message || error.message || 'Failed to add to wishlist');
    }
  };

  const removeFromWishlist = async (wishlistId) => {
    if (!isAuthenticated) {
      throw new Error("Please login to use wishlist");
    }

    // Find the item to remove for optimistic update
    const itemToRemove = items.find(item => item.id === wishlistId);
    if (!itemToRemove) {
      return { success: true }; // Item not found, consider it removed
    }

    // Optimistic update - remove immediately
    setItems(prev => prev.filter(item => item.id !== wishlistId));

    try {
      await api.delete(`/api/wishlist/${wishlistId}`);
      return { success: true };
    } catch (error) {
      // Restore item on failure
      setItems(prev => [...prev, itemToRemove]);
      throw new Error(error.response?.data?.message || error.message || 'Failed to remove from wishlist');
    }
  };

  const moveToCart = async (wishlistId) => {
    if (!isAuthenticated) return;

    try {
      // Backend handles atomic move, or we can do it in two steps.
      // Requirements say POST /wishlist/:id/move-to-cart
      await api.post(`/api/wishlist/${wishlistId}/move-to-cart`);

      // Refresh both
      await fetchWishlist();
      await refreshCart();

    } catch (error) {
      console.error('Failed to move to cart', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to move to cart');
    }
  }

  const isInWishlist = (productId) => {
    // SINGLE SOURCE OF TRUTH: Only compare with product_id
    return items.some(item => item.product_id === parseInt(productId));
  };

  const getWishlistItemByProductId = (productId) => {
    // Helper to find wishlist item by product_id
    return items.find(item => item.product_id === parseInt(productId));
  };

  const wishlistCount = items.length;

  const value = {
    items,
    loading,
    addToWishlist,
    removeFromWishlist,
    moveToCart,
    isInWishlist,
    getWishlistItemByProductId,
    wishlistCount,
    refreshWishlist: fetchWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

export default WishlistContext;