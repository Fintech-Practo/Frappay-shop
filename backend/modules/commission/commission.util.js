/**
 * Commission Utility Module
 * Handles commission rate calculation and commission computation
 */

const COMMISSION_RATES = {
  'BOOK': {
    'PHYSICAL': 10.0,
    'EBOOK': 15.0,
    'BOTH': 10.0 // Default to physical rate when BOTH, but purchase_format determines actual rate
  },
  'NOTEBOOK': {
    'PHYSICAL': 12.0
  },
  'STATIONERY': {
    'PHYSICAL': 8.0
  }
};


/**
 * Get commission rate based on product type and format
 * @param {Object} params
 * @param {string} params.product_type_code - BOOK, NOTEBOOK, or STATIONERY
 * @param {string} params.format - PHYSICAL, EBOOK, or BOTH
 * @returns {number} Commission percentage (e.g., 10.0 for 10%)
 */
function getCommissionRate({ product_type_code, format }) {
  if (!product_type_code || !format) {
    throw new Error('product_type_code and format are required');
  }

  const typeRates = COMMISSION_RATES[product_type_code];
  if (!typeRates) {
    throw new Error(`Invalid product_type_code: ${product_type_code}`);
  }

  // For BOTH format, default to physical rate (will be overridden by purchase_format)
  const rate = typeRates[format] || typeRates['PHYSICAL'];
  if (!rate) {
    throw new Error(`No commission rate defined for ${product_type_code} with format ${format}`);
  }

  return rate;
}

/**
 * Calculate commission and related financials for an item
 * @param {Object} params
 * @param {number} params.selling_price - Price per unit
 * @param {number} params.quantity - Quantity
 * @param {string} params.product_type_code - BOOK, NOTEBOOK, or STATIONERY
 * @param {string} params.format - PHYSICAL, EBOOK, or BOTH (resolved format)
 * @returns {Object} Commission calculation result
 */
function calculateCommission({ selling_price, quantity, product_type_code, format }) {
  if (!selling_price || !quantity || !product_type_code || !format) {
    throw new Error('selling_price, quantity, product_type_code, and format are required');
  }

  const gross = parseFloat(selling_price) * parseInt(quantity);
  const commission_percentage = getCommissionRate({ product_type_code, format });
  const commission_amount = (gross * commission_percentage) / 100;
  const seller_payout = gross - commission_amount;
  const admin_net_profit = commission_amount;

  return {
    gross: parseFloat(gross.toFixed(2)),
    commission_percentage: parseFloat(commission_percentage.toFixed(2)),
    commission_amount: parseFloat(commission_amount.toFixed(2)),
    seller_payout: parseFloat(seller_payout.toFixed(2)),
    admin_net_profit: parseFloat(admin_net_profit.toFixed(2))
  };
}

/**
 * Resolve the actual format for purchase
 * If product.format is BOTH, use purchase_format to determine actual format
 * @param {Object} params
 * @param {string} params.product_format - Product's format (PHYSICAL, EBOOK, BOTH)
 * @param {string} params.purchase_format - User's selected format (PHYSICAL, EBOOK) - optional
 * @returns {string} Resolved format (PHYSICAL or EBOOK)
 */
function resolvePurchaseFormat({ product_format, purchase_format }) {
  if (product_format === 'BOTH') {
    // If BOTH, purchase_format must be provided
    if (!purchase_format || !['PHYSICAL', 'EBOOK'].includes(purchase_format)) {
      throw new Error('purchase_format (PHYSICAL or EBOOK) is required when product format is BOTH');
    }
    return purchase_format;
  }

  // For PHYSICAL or EBOOK, use product format directly
  if (product_format === 'PHYSICAL' || product_format === 'EBOOK') {
    return product_format;
  }

  throw new Error(`Invalid product format: ${product_format}`);
}

/**
 * Check if a format is digital (EBOOK)
 * @param {string} format - PHYSICAL or EBOOK
 * @returns {boolean}
 */
function isDigitalFormat(format) {
  return format === 'EBOOK';
}

module.exports = {
  getCommissionRate,
  calculateCommission,
  resolvePurchaseFormat,
  isDigitalFormat,
  COMMISSION_RATES
};