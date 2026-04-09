import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/config/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cartId, setCartId] = useState(null);

  // Load cart from backend on login, or local storage on load
  useEffect(() => {
    if (isAuthenticated) {
      fetchBackendCart();
    } else {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        setItems(JSON.parse(storedCart));
      }
    }
  }, [isAuthenticated, token]);

  // Sync to local storage for guests
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isAuthenticated]);

  const fetchBackendCart = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/cart');
      if (res.data.success) {
        setItems(res.data.data.items.map(item => ({
          id: item.product_id || item.id, // Handle different ID fields if necessary
          ...item,
          productId: item.product_id // Keep reference
        })));
        setCartId(res.data.data.cart.id);
      }
    } catch (error) {
      console.error('Failed to fetch cart', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (product, quantity = 1, purchase_format = null) => {
    const isDigital = purchase_format === 'EBOOK' || purchase_format === 'DIGITAL' || product.format === 'EBOOK' || product.product_type_code === 'EBOOK';
    const effectiveQty = isDigital ? 1 : quantity;

    // Check if already in cart (for digital items)
    if (isDigital) {
      const existing = items.find(item =>
        (item.product_id === product.id || item.id === product.id) &&
        (item.purchase_format === 'EBOOK' || item.purchase_format === 'DIGITAL' || item.format === 'EBOOK')
      );
      if (existing) {
        throw new Error("This e-book is already in your cart.");
      }
    }

    if (isAuthenticated) {
      try {
        const payload = {
          product_id: parseInt(product.id),
          quantity: effectiveQty,
          purchase_format: purchase_format || (product.format === 'EBOOK' ? 'EBOOK' : 'PHYSICAL')
        };
        const res = await api.post('/api/cart/add', payload);
        if (res.data.success) {
          await fetchBackendCart();
        }
      } catch (error) {
        console.error('Failed to add item', error);
        throw new Error(error.response?.data?.message || 'Failed to add item to cart');
      }
    } else {
      setItems(prev => {
        const existingItem = prev.find(item =>
          (item.id === product.id) &&
          (!purchase_format || item.purchase_format === purchase_format)
        );
        if (existingItem) {
          if (isDigital) return prev; // Already handled by the throw above, but for safety
          return prev.map(item =>
            item.id === product.id && (!purchase_format || item.purchase_format === purchase_format)
              ? { ...item, quantity: item.quantity + effectiveQty }
              : item
          );
        }
        return [...prev, { ...product, quantity: effectiveQty, purchase_format: purchase_format || (product.format === 'EBOOK' ? 'EBOOK' : 'PHYSICAL') }];
      });
    }
  };

  const removeItem = async (productId) => {
    if (isAuthenticated) {

      const item = items.find(i => i.product_id === productId || i.id === productId);
      if (!item) return;


      try {
        await api.delete(`/api/cart/items/${item.id}`);
        await fetchBackendCart();
      } catch (error) {
        console.error('Failed to remove item', error);
        throw new Error(error.response?.data?.message || 'Failed to remove item from cart');
      }
    } else {
      setItems(prev => prev.filter(item => item.id !== productId));
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }

    if (isAuthenticated) {
      const item = items.find(i => i.product_id === productId || i.id === productId);
      if (!item) return;

      try {
        await api.patch(`/api/cart/items/${item.id}`, { quantity });
        await fetchBackendCart();
      } catch (error) {
        console.error('Failed to update quantity', error);
        throw new Error(error.response?.data?.message || 'Failed to update quantity');
      }
    } else {
      setItems(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await api.delete('/api/cart/clear');
        setItems([]);
      } catch (error) {
        console.error('Failed to clear cart', error);
        throw new Error(error.response?.data?.message || 'Failed to clear cart');
      }
    } else {
      setItems([]);
      localStorage.removeItem('cart');
    }
  };

  const isDigitalItem = (item) => {
    if (item.purchase_format === 'EBOOK' || item.purchase_format === 'DIGITAL') return true;
    if (item.purchase_format === 'PHYSICAL') return false;
    return (
      item.format === 'EBOOK' ||
      item.product_type_code === 'EBOOK' ||
      item.format === 'DIGITAL'
    );
  };

  const itemCount = items.reduce((total, item) => {
    const qty = isDigitalItem(item) ? 1 : (item.quantity || 0);
    return total + qty;
  }, 0);

  const subtotal = items.reduce((total, item) => {
    const qty = isDigitalItem(item) ? 1 : (item.quantity || 0);
    return total + (item.price || 0) * qty;
  }, 0);

  const value = {
    items,
    loading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
    refreshCart: fetchBackendCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;