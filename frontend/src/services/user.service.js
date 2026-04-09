import api from '@/config/api';

export const userService = {
    getProfile: () => api.get('/api/users/me'),
    updateProfile: (data) => api.put('/api/users/me', data),
    
    getBankDetails: () => api.get('/api/users/me/bank-details'),
    updateBankDetails: (data) => api.post('/api/users/me/bank-details', data),
    
    getPreferences: () => api.get('/api/users/me/preferences'),
    updatePreferences: (preferences) => api.put('/api/users/me/preferences', { preferences }),
    
    changePassword: (data) => api.post('/api/users/me/change-password', data),
    verifyPassword: (password) => api.post('/api/users/me/verify-password', { password }),
};

export default userService;
