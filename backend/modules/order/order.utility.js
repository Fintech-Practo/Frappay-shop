/**
 * Order utility functions
 */

/**
 * Generate invoice number for an order
 * @param {number} orderId - Order ID
 * @returns {string} Invoice number in format INV-YYYYMMDD-XXXX
 */
function generateInvoiceNumber(orderId) {
  const date = new Date();
  const dateStr = date.getFullYear().toString() + 
                  (date.getMonth() + 1).toString().padStart(2, '0') + 
                  date.getDate().toString().padStart(2, '0');
  const orderStr = orderId.toString().padStart(4, '0');
  return `INV-${dateStr}-${orderStr}`;
}

module.exports = {
  generateInvoiceNumber
};
