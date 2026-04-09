import api, { API_BASE_URL } from '@/config/api';

const normalizeFileUrl = (url) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
};

export const orderService = {
    getOrder: (id) => api.get(`/api/orders/${id}`),

    getMyOrders: (params) => api.get('/api/orders/my-orders', { params }),

    createOrder: (data) => api.post('/api/orders', data),

    cancelOrder: (id) => api.patch(`/api/orders/${id}/cancel`),

    getInvoice: (id) => api.get(`/api/orders/${id}/invoice`),

    getInvoiceUrl: async (id) => {
        const res = await api.get(`/api/orders/${id}/invoice`);
        if (!res?.data?.success) return null;
        const url = res?.data?.data?.url;
        if (!url) return null;
        return normalizeFileUrl(url);
    },

    downloadDigitalCopy: (orderId, productId) =>
        api.get(`/api/orders/${orderId}/download/${productId}`, { responseType: 'blob' }),

    requestReturn: (id, reason, bankDetails = {}) => api.post(`/api/orders/${id}/return`, { reason, ...bankDetails }),
};

export default orderService;