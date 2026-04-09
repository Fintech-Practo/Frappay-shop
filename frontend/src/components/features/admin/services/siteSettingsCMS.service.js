import api from '@/config/api';

const siteSettingsCMSService = {
  // Get all CMS settings (Admin)
  getAllCMSSettings: async () => {
    const response = await api.get('/api/site-settings/cms');
    return response.data;
  },

  // Get public site settings
  getPublicSiteSettings: async () => {
    const response = await api.get('/api/site-settings/public');
    return response.data;
  },

  // HERO BANNERS
  getHeroBanners: async () => {
    const response = await api.get('/api/site-settings/hero');
    return response.data;
  },

  createHeroBanner: async (bannerData) => {
    const response = await api.post('/api/site-settings/hero', bannerData);
    return response.data;
  },

  updateHeroBanner: async (id, bannerData) => {
    const response = await api.put(`/api/site-settings/hero/${id}`, bannerData);
    return response.data;
  },

  deleteHeroBanner: async (id) => {
    const response = await api.delete(`/api/site-settings/hero/${id}`);
    return response.data;
  },

  reorderHeroBanner: async (id, order) => {
    const response = await api.put(`/api/site-settings/hero/${id}/reorder`, { order });
    return response.data;
  },

  // PROMO BANNERS
  getPromoBanners: async () => {
    const response = await api.get('/api/site-settings/promo');
    return response.data;
  },

  createPromoBanner: async (bannerData) => {
    const response = await api.post('/api/site-settings/promo', bannerData);
    return response.data;
  },

  updatePromoBanner: async (id, bannerData) => {
    const response = await api.put(`/api/site-settings/promo/${id}`, bannerData);
    return response.data;
  },

  deletePromoBanner: async (id) => {
    const response = await api.delete(`/api/site-settings/promo/${id}`);
    return response.data;
  },

  // CATEGORIES
  getHomepageCategories: async () => {
    const response = await api.get('/api/site-settings/categories');
    return response.data;
  },

  createHomepageCategory: async (categoryData) => {
    const response = await api.post('/api/site-settings/categories', categoryData);
    return response.data;
  },

  updateHomepageCategory: async (id, categoryData) => {
    const response = await api.put(`/api/site-settings/categories/${id}`, categoryData);
    return response.data;
  },

  deleteHomepageCategory: async (id) => {
    const response = await api.delete(`/api/site-settings/categories/${id}`);
    return response.data;
  },

  // FOOTER
  getFooterSettings: async () => {
    const response = await api.get('/api/site-settings/footer');
    return response.data;
  },

  updateFooterSettings: async (footerData) => {
    const response = await api.put('/api/site-settings/footer', footerData);
    return response.data;
  },

  // FEATURE STRIPS
  getFeatureStrips: async () => {
    const response = await api.get('/api/site-settings/features');
    return response.data;
  },

  updateFeatureStrips: async (featuresData) => {
    const response = await api.put('/api/site-settings/features', featuresData);
    return response.data;
  },

  // IMAGE UPLOAD
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/api/site-settings/upload', formData);
    return response.data;
  }
};

export default siteSettingsCMSService;
