const orderItemModel = require("./orderItem.model");

async function getOrderedItemsByUserId(userId, filters = {}) {
  return await orderItemModel.getOrderedItemsByUserId(userId, filters);
}

async function getOrderItemsByOrderId(orderId, userId, userRole) {
  const items = await orderItemModel.findByOrderId(orderId);
  
  // Verify order belongs to user (unless admin)
  if (items.length > 0) {
    // We need to check order ownership - this would require joining with orders table
    // For now, we'll let the controller handle authorization
  }
  
  return items;
}

async function getOrderItemsBySellerId(sellerId, filters = {}) {
  return await orderItemModel.findBySellerId(sellerId, filters);
}

async function getOrderItemById(itemId, userId, userRole) {
  const item = await orderItemModel.findById(itemId);
  
  if (!item) {
    throw new Error("Order item not found");
  }
  
  // Users can only see their own order items, admins and sellers can see all
  if (userRole !== "ADMIN" && userRole !== "SELLER" && item.user_id !== userId) {
    throw new Error("Access denied");
  }
  
  return item;
}

async function getStatsBySellerId(sellerId) {
  return await orderItemModel.getStatsBySellerId(sellerId);
}

module.exports = {
  getOrderedItemsByUserId,
  getOrderItemsByOrderId,
  getOrderItemsBySellerId,
  getOrderItemById,
  getStatsBySellerId
};

