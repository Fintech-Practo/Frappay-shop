import axios from 'axios';

// Delhivery API configuration
const DELHIVERY_CONFIG = {
  baseURL: 'https://staging-express.delhivery.com/api/backend/',
  token: 'your-delhivery-token', // This should come from environment variables
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Token your-delhivery-token', // This should come from environment variables
  }
};

// Create axios instance for Delhivery API
const delhiveryApi = axios.create({
  baseURL: DELHIVERY_CONFIG.baseURL,
  headers: DELHIVERY_CONFIG.headers,
});

// Helper functions for Delhivery API
export const delhiveryService = {
  /**
   * Create a new warehouse in Delhivery
   * @param {Object} warehouseData - Warehouse information
   * @param {string} warehouseData.name - Warehouse name
   * @param {string} warehouseData.registered_name - Registered business name
   * @param {string} warehouseData.address - Full address
   * @param {string} warehouseData.return_address - Return address
   * @param {string} warehouseData.city - City
   * @param {string} warehouseData.pin - PIN code
   * @param {string} warehouseData.phone - Phone number
   * @param {string} warehouseData.email - Email address
   * @param {string} warehouseData.country - Country (default: 'India')
   * @param {string} warehouseData.return_country - Return country (default: 'India')
   */
  createClientWarehouse: async (warehouseData) => {
    try {
      const response = await delhiveryApi.post('clientwarehouse/create/', warehouseData);
      return response.data;
    } catch (error) {
      console.error('Delhivery create warehouse error:', error);
      throw error;
    }
  },

  /**
   * Edit an existing warehouse in Delhivery
   * @param {Object} warehouseData - Updated warehouse information
   */
  editClientWarehouse: async (warehouseData) => {
    try {
      const response = await delhiveryApi.post('clientwarehouse/edit/', warehouseData);
      return response.data;
    } catch (error) {
      console.error('Delhivery edit warehouse error:', error);
      throw error;
    }
  },

  /**
   * Get warehouse details from Delhivery
   * @param {string} warehouseId - Warehouse ID
   */
  getWarehouseDetails: async (warehouseId) => {
    try {
      const response = await delhiveryApi.get(`clientwarehouse/${warehouseId}/`);
      return response.data;
    } catch (error) {
      console.error('Delhivery get warehouse error:', error);
      throw error;
    }
  }
};

export default delhiveryService;
