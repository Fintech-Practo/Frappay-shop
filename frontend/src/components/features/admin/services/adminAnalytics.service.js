import api from '@/config/api';

const adminAnalyticsService = {
  // Global Overview
  getOverview: async (filters = {}, signal) => {
    const response = await api.get('/api/admin/analytics/overview', { 
      params: filters,
      signal 
    });
    return response.data;
  },

  // Sales Analytics (Global)
  getSalesAnalytics: async (filters = {}, signal) => {
    const response = await api.get('/api/admin/analytics/sales', { 
      params: filters,
      signal 
    });
    return response.data;
  },

  // User Analytics (Global)
  getUserAnalytics: async (filters = {}, signal) => {
    const response = await api.get('/api/admin/analytics/users', { 
      params: filters,
      signal 
    });
    return response.data;
  },

  // Seller Analytics (Global)
  getSellerAnalytics: async (filters = {}, signal) => {
    const response = await api.get('/api/admin/analytics/sellers', { 
      params: filters,
      signal 
    });
    return response.data;
  },

  // Inventory Analytics (Global)
  getInventoryAnalytics: async (filters = {}, signal) => {
    const response = await api.get('/api/admin/analytics/inventory', { 
      params: filters,
      signal 
    });
    return response.data;
  },

  // Financial Analytics (Global)
  getFinancialAnalytics: async (filters = {}, signal) => {
    const response = await api.get('/api/admin/analytics/financial', { 
      params: filters,
      signal 
    });
    return response.data;
  },

  // Export analytics data
  exportAnalytics: async (type, filters = {}) => {
    const response = await api.get(`/api/admin/analytics/export/${type}`, { 
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }
};

export default adminAnalyticsService;
