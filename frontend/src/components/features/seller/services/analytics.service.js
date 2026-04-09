import api from '@/config/api';

const analyticsService = {
    // Sales Analytics
    getSalesAnalytics: async (filters = {}) => {
        const response = await api.get('/analytics/sales', { params: filters });
        return response.data;
    },

    // Customer Insights
    getCustomerInsights: async (filters = {}) => {
        const response = await api.get('/analytics/customers', { params: filters });
        return response.data;
    },

    // Inventory Reports
    getInventoryReports: async (filters = {}) => {
        const response = await api.get('/analytics/inventory', { params: filters });
        return response.data;
    },

    // Financial Reports
    getFinancialReports: async (filters = {}) => {
        const response = await api.get('/analytics/financial', { params: filters });
        return response.data;
    },

    // Comprehensive Dashboard Overview
    getDashboardOverview: async (filters = {}) => {
        const response = await api.get('/analytics/overview', { params: filters });
        return response.data;
    }
};

export default analyticsService;
