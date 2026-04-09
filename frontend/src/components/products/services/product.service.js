import api from '@/config/api';

export const productService = {
    getProducts: (params) => api.get('/api/products', { params }),

    getProductById: (id) => api.get(`/api/products/${id}`),

    getProductTree: () => api.get('/api/products/tree'),

    getCategories: () => api.get('/api/products/categories'),

    getSubcategories: (categoryId) => api.get('/api/products/subcategories', { params: { category_id: categoryId } }),
};

export default productService;