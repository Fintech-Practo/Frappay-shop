const orderItemService = require("./orderItem.service");
const response = require("../../utils/response");

// GET ALL ORDERED ITEMS FOR LOGGED IN USER
async function getMyOrderedItems(req, res) {

  try {
    // FETCH ITEMS USING USER ID + QUERY FILTERS
    const items = await orderItemService.getOrderedItemsByUserId(
      req.user.userId,
      req.query
    );
    return response.success(res, items, "Ordered items fetched successfully");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

// GET ITEMS BY ORDER ID
async function getOrderItemsByOrderId(req, res) {

  try {
    // ROLE / OWNERSHIP CHECK INSIDE SERVICE
    const items = await orderItemService.getOrderItemsByOrderId(
      req.params.orderId,
      req.user.userId,
      req.user.role
    );
    return response.success(res, items, "Order items fetched successfully");

  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

// SELLER / ADMIN : GET ITEMS BY SELLER ID
async function getOrderItemsBySellerId(req, res) {

  try {
    // BLOCK NON SELLER USERS
    if (req.user.role !== "SELLER" && req.user.role !== "ADMIN") {

      return response.error(res, "Access denied. Seller account required", 403);
    }

    // ADMIN CAN PASS SELLER ID, SELLER USES OWN ID
    const sellerId =
      req.user.role === "ADMIN" && req.query.seller_id
        ? req.query.seller_id
        : req.user.userId;

    const items = await orderItemService.getOrderItemsBySellerId(
      sellerId,
      req.query
    );
    return response.success(res, items, "Order items fetched successfully");

  } catch (err) {

    return response.error(res, err.message, 500);
  }
}

// GET SINGLE ORDER ITEM BY ID
async function getOrderItemById(req, res) {

  try {
    // ACCESS CHECK INSIDE SERVICE
    const item = await orderItemService.getOrderItemById(
      req.params.id,
      req.user.userId,
      req.user.role
    );
    return response.success(res, item, "Order item fetched successfully");

  } catch (err) {
    return response.error(
      res,
      err.message,
      err.message === "Order item not found" ? 404 : 403
    );
  }
}

// SELLER / ADMIN : ORDER ITEM STATS
async function getStatsBySellerId(req, res) {
  try {
    // BLOCK NON SELLER USERS
    if (req.user.role !== "SELLER" && req.user.role !== "ADMIN") {
      return response.error(res, "Access denied. Seller account required", 403);
    }

    // ADMIN CAN VIEW ANY SELLER STATS
    const sellerId =
      req.user.role === "ADMIN" && req.query.seller_id
        ? req.query.seller_id
        : req.user.userId;

    const stats = await orderItemService.getStatsBySellerId(sellerId);

    return response.success(res, stats, "Order item statistics fetched successfully");
    
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

module.exports = {
  getMyOrderedItems,
  getOrderItemsByOrderId,
  getOrderItemsBySellerId,
  getOrderItemById,
  getStatsBySellerId
};
