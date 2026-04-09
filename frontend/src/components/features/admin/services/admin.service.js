import api from '@/config/api';

const adminService = {

  // ================= DASHBOARD =================
  getDashboardStats: async (range = '6m') => {
    const res = await api.get(`/api/admin/dashboard`, { params: { range } });
    return res.data.data || res.data;
  },

  // ================= USERS =================
  getAllUsers: async (page = 1, limit = 10, filters = {}) => {
    const res = await api.get(`/api/admin/users`, {
      params: { ...filters, page, limit }
    });
    return res.data;
  },

  getUserDetails: async (userId) => {
    return (await api.get(`/api/admin/users/${userId}/details`)).data;
  },

  blockUser: async (userId, reason) => {
    return (await api.patch(`/api/admin/users/${userId}/disable`, { reason })).data;
  },

  enableUser: async (userId, reason) => {
    return (await api.patch(`/api/admin/users/${userId}/enable`, { reason })).data;
  },

  // ================= SELLERS =================
  listSellers: async (page = 1, limit = 10, filters = {}) => {
    const res = await api.get(`/api/admin/sellers`, {
      params: { ...filters, page, limit }
    });
    return res.data.data || res.data;
  },

  getSellerDetails: async (sellerId) => {
    return (await api.get(`/api/admin/sellers/${sellerId}/details`)).data;
  },

  updateSellerCommission: async (sellerId, commissionRate) => {
    return (await api.patch(`/api/admin/sellers/${sellerId}/commission`, {
      commission_rate: commissionRate
    })).data;
  },

  getSellerWarehouseStatus: async (sellerId) => {
    return (await api.get(`/api/admin/sellers/${sellerId}/warehouse-status`)).data;
  },

  getSellerOnboardingRequests: async (params = {}) => {
    return (await api.get(`/api/admin/sellers/onboarding-requests`, { params })).data;
  },

  syncSellerWarehouse: async (userId, warehouseId = null) => {
    return (await api.post(`/api/admin/sellers/${userId}/sync-warehouse`, { warehouseId })).data;
  },

  // ================= ONBOARDING =================
  getPendingOnboarding: async (page = 1, limit = 10) => {
    const res = await api.get(`/api/seller/onboarding/pending`, {
      params: { page, limit }
    });
    return res.data.data || res.data;
  },

  getOnboardingDetails: async (userId) => {
    return (await api.get(`/api/seller/onboarding/${userId}/details`)).data;
  },

  approveOnboarding: async (userId, commission_rate = null) => {
    return (await api.post(`/api/seller/onboarding/${userId}/approve`, { commission_rate })).data;
  },

  rejectOnboarding: async (userId, reason) => {
    return (await api.post(`/api/seller/onboarding/${userId}/reject`, { reason })).data;
  },

  // ================= COMMISSION =================
  getGlobalCommission: async () => {
    const res = await api.get(`/api/admin/commission/global`);
    return res.data.data || res.data;
  },

  updateGlobalCommission: async (rate) => {
    return (await api.put(`/api/admin/commission/global`, { percentage: rate })).data;
  },

  getCommissionRequests: async (status = 'PENDING') => {
    const res = await api.get(`/api/admin/commission/requests`, {
      params: { status }
    });
    return res.data.data || res.data;
  },

  actionCommissionRequest: async (requestId, action, remarks) => {
    return (await api.post(`/api/admin/commission/requests/${requestId}/action`, {
      action,
      remarks
    })).data;
  },

  // ================= SHIPPING =================
  getShippingMargins: async () => {
    const res = await api.get(`/api/admin/shipping-margins`);
    return res.data.data || res.data;
  },

  createShippingMargin: async (data) => {
    return (await api.post(`/api/admin/shipping-margins`, data)).data;
  },

  deleteShippingMargin: async (id) => {
    return (await api.delete(`/api/admin/shipping-margins/${id}`)).data;
  },

  // ================= CARTS =================
  getAbandonedCarts: async ({ days = 30, page = 1, limit = 20 } = {}) => {
    return (await api.get(`/api/admin/carts/abandoned`, {
      params: { days, page, limit }
    })).data;
  },

  // ================= ORDERS =================
  getAllOrders: async (page = 1, limit = 10, filters = {}) => {
    const res = await api.get(`/api/admin/orders`, {
      params: { ...filters, page, limit }
    });
    return res.data.data || res.data;
  },

  getOrderDetails: async (orderId) => {
    return (await api.get(`/api/admin/orders/${orderId}/details`)).data;
  },

  getOrderSMSLogs: async (orderId) => {
    return (await api.get(`/api/admin/orders/${orderId}/sms-logs`)).data;
  },

  updateOrderStatus: async (id, status) => {
    return (await api.patch(`/api/orders/${id}/status`, { status })).data;
  },

  // ================= RETURNS =================
  getReturnRequests: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return (await api.get(`/api/orders/returns/list?${params}`)).data;
  },

  updateReturnStatus: async (returnId, status, adminRemarks) => {
    return (await api.patch(`/api/orders/returns/${returnId}/status`, {
      status,
      adminRemarks
    })).data;
  },

  // ================= INVENTORY =================
  getLowStockBooks: async (threshold = 10) => {
    const res = await api.get(`/api/admin/inventory/low-stock`, {
      params: { threshold }
    });
    return res.data.data || res.data;
  },

  getInventoryDetails: async (productId) => {
    return (await api.get(`/api/admin/inventory/${productId}/details`)).data;
  },

  getAllBooks: async (page = 1, limit = 10, filters = {}) => {
    const res = await api.get(`/api/products`, {
      params: { ...filters, page, limit }
    });
    return res.data.data || res.data;
  },

  // ================= COUPONS =================
  getAllCoupons: async () => {
    const res = await api.get(`/api/admin/coupons`);
    return res.data.data || res.data;
  },

  createCoupon: async (data) => {
    return (await api.post(`/api/admin/coupons`, data)).data;
  },

  toggleCouponStatus: async (id) => {
    return (await api.patch(`/api/admin/coupons/${id}/toggle`)).data;
  },

  // ================= NOTIFICATIONS =================
  getNotifications: async (page = 1, limit = 20) => {
    return (await api.get(`/api/notifications`, {
      params: { page, limit }
    })).data;
  },

  markNotificationRead: async (id) => {
    return (await api.patch(`/api/notifications/${id}/read`)).data;
  },

  markAllNotificationsRead: async () => {
    return (await api.patch(`/api/notifications/read-all`)).data;
  },

  // ================= SUPPORT =================
  getSupportTickets: async (filters = {}) => {
    return (await api.get(`/api/support/admin/all`, { params: filters })).data;
  },

  getSupportTicketById: async (id) => {
    return (await api.get(`/api/support/admin/${id}`)).data;
  },

  updateTicket: async (id, updates) => {
    return (await api.patch(`/api/support/admin/${id}`, updates)).data;
  },

  // ================= AUDIT =================
  getAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return (await api.get(`/api/audit?${params}`)).data;
  },

  // ================= REVIEWS =================
  getAllReviews: async (page = 1, limit = 10, search = '', filters = {}) => {
    return (await api.get(`/api/reviews/admin/all`, {
      params: { ...filters, search, page, limit }
    })).data;
  },

  deleteReview: async (id) => {
    return (await api.delete(`/api/reviews/admin/${id}`)).data;
  },

  getPendingReviews: async () => {
    return (await api.get(`/api/reviews/admin/pending`)).data;
  },

  moderateReview: async (id, status) => {
    return (await api.patch(`/api/reviews/${id}/moderate`, { status })).data;
  },
  // ================= REWARD RULES =================
getAllRewardRules: async () => {
  const res = await api.get(`/api/admin/reward-rules`);
  return res.data.data || res.data;
},

createRewardRule: async (data) => {
  return (await api.post(`/api/admin/reward-rules`, data)).data;
},

updateRewardRule: async (id, data) => {
  return (await api.put(`/api/admin/reward-rules/${id}`, data)).data;
},

toggleRewardRuleStatus: async (id, active) => {
  return (await api.patch(`/api/admin/reward-rules/${id}/status`, { active })).data;
},

deleteRewardRule: async (id) => {
  return (await api.delete(`/api/admin/reward-rules/${id}`)).data;
},

  // ================= FINANCE =================
  exportRefundLedger: async (filters = {}) => {
  const res = await api.get(`/api/finance/admin/refund-ledger`, {
    params: {
      ...filters,
      page: 1,
      limit: 10000
    }
  });

  return res.data;
},
  exportPayoutLedger: async (filters = {}) => {
  const res = await api.get(`/api/finance/admin/payout-ledger`, {
    params: {
      ...filters,
      page: 1,
      limit: 10000
    }
  });

  return res.data;
},
  exportOrderLedger: async (filters = {}) => {
  const res = await api.get(`/api/finance/admin/order-ledger`, {
    params: {
      ...filters,
      page: 1,
      limit: 10000 // fetch all records for export
    }
  });

  return res.data;
},
  getOrderLedger: async (page = 1, limit = 10, filters = {}) => {
    return (await api.get(`/api/finance/admin/order-ledger`, {
      params: { ...filters, page, limit }
    })).data;
  },

  getPayoutLedger: async (page = 1, limit = 10, filters = {}) => {
    return (await api.get(`/api/finance/admin/payout-ledger`, {
      params: { ...filters, page, limit }
    })).data;
  },

  getRefundLedger: async (page = 1, limit = 10, filters = {}) => {
    return (await api.get(`/api/finance/admin/refund-ledger`, {
      params: { ...filters, page, limit }
    })).data;
  }

};

export default adminService;