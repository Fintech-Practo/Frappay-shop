import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getOrderDisplayStatus(order) {
  if (!order) return 'UNKNOWN';

  // Return/Refund Statuses take priority
  if (['REFUNDED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RTO_COMPLETED', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUND_SETTLED'].includes(order.status)) {
    return order.status;
  }

  // Cancellation or Terminal Statuses manually set by admin
  if (['CANCELLED', 'CANCEL_REQUESTED', 'DELIVERED', 'COMPLETED', 'RTO_INITIATED', 'RTO_DELIVERED'].includes(order.status)) {
    return order.status;
  }

  // Shipment status is usually more granular and up-to-date for logistics
  const shipment = order.shipments?.[0];
  const shipmentStatus = shipment?.admin_status;

  if (shipmentStatus && shipmentStatus !== 'CREATED' && shipmentStatus !== 'PROCESSING') {
    // If order is delivered, both should be synced, but DELIVERED in shipment is truth
    if (shipmentStatus === 'DELIVERED') return 'DELIVERED';
    return shipmentStatus;
  }

  return (order.status || 'PENDING').toUpperCase();
}

export const STATUS_CONFIG = {
  // Initial
  PENDING: { label: 'Order Placed', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200' },

  // Processing
  PROCESSING: { label: 'Processing', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  PACKED: { label: 'Packed', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },

  // Logistics
  AWB_ASSIGNED: { label: 'AWB Assigned', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  LABEL_GENERATED: { label: 'Label Ready', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  READY_TO_SHIP: { label: 'Ready for Pickup', color: 'bg-green-100 text-green-700 border-green-200' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-indigo-200 text-indigo-900 border-indigo-300' },
  SHIPPED: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800 border-green-200' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },

  // Cancellations
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
  CANCEL_REQUESTED: { label: 'Cancellation Pending', color: 'bg-orange-100 text-orange-800 border-orange-200' },

  // Returns
  RETURN_REQUESTED: { label: 'Return Requested', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  RETURN_APPROVED: { label: 'Return Approved', color: 'bg-pink-200 text-pink-900 border-pink-300' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  RTO_COMPLETED: { label: 'Return Received', color: 'bg-green-100 text-green-800 border-green-200' },
  REFUND_PENDING: { label: 'Refund Pending', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  REFUND_PROCESSING: { label: 'Refund Processing', color: 'bg-blue-200 text-blue-900 border-blue-300' },
  REFUND_SETTLED: { label: 'Refund Settled', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  RETURN_REJECTED: { label: 'Return Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
  REFUNDED: { label: 'Refunded', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },

  // Other
  RTO_INITIATED: { label: 'Returning to Seller', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  RTO_DELIVERED: { label: 'Returned to Seller', color: 'bg-gray-200 text-gray-900 border-gray-300' },
  UNKNOWN: { label: 'Unknown', color: 'bg-gray-50 text-gray-500 border-gray-100' }
};

/**
 * Format date to DD/MM/YYYY
 * @param {Date|string} date 
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}