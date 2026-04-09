import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/config/api';
import { useAuth } from './AuthContext';

const ProductContext = createContext(null);

export function ProductProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyProducts = async () => {
    if (!isAuthenticated || user?.role !== 'SELLER') {
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/api/products/my/products');
      if (res.data.success) {
        setProducts(res.data.data?.products || res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SELLER') {
      fetchMyProducts();
    }
  }, [isAuthenticated, user?.role]);


  const createProduct = async (productData) => {
    if (!isAuthenticated || user?.role !== 'SELLER') {
      throw new Error('Only sellers can create products');
    }

    try {
      setLoading(true);

      const formData =
        productData instanceof FormData ? productData : (() => {
          const fd = new FormData();
          Object.entries(productData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              fd.append(key, value);
            }
          });
          return fd;
        })();

      const res = await api.post('/api/products', formData);

      if (res.data.success) {
        await fetchMyProducts();
        return res.data.data;
      }

      throw new Error(res.data.message || 'Failed to create product');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };


  const updateProduct = async (productId, formData) => {
    if (!isAuthenticated || user?.role !== 'SELLER') {
      throw new Error('Only sellers can update products');
    }

    try {
      setLoading(true);

      // ✅ IMPORTANT: Send FormData directly
      const res = await api.put(
        `/api/products/${productId}`,
        formData
      );

      if (res.data.success) {
        await fetchMyProducts();
        return res.data.data;
      }

      throw new Error(res.data.message || 'Failed to update product');
    } catch (error) {
      throw new Error(
        error.response?.data?.message || error.message
      );
    } finally {
      setLoading(false);
    }
  };



  const deleteProduct = async (productId) => {
    if (!isAuthenticated || user?.role !== 'SELLER') {
      throw new Error('Only sellers can delete products');
    }

    try {
      setLoading(true);
      const res = await api.delete(`/api/products/${productId}`);
      if (res.data.success) {
        await fetchMyProducts();
        return { success: true };
      }
      throw new Error(res.data.message || 'Failed to delete product');
    } catch (error) {
      console.error('Failed to delete product', error);
      throw error.response?.data?.message || 'Failed to delete product';
    } finally {
      setLoading(false);
    }
  };
  const value = {
    products,
    loading,
    fetchMyProducts,
    createProduct,
    updateProduct,
    deleteProduct
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
}

export default ProductContext;