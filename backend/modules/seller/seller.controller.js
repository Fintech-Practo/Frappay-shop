const sellerService = require("./seller.service");
const userService = require("../user/user.service");
const { uploadFile, deleteFromS3Async } = require("../../utils/upload");
const response = require("../../utils/response");
const logger = require("../../utils/logger");

async function getDashboard(req, res) {
  try {
    const dashboard = await sellerService.getDashboard(req.user.userId);

    return response.success(res, dashboard, "Seller dashboard data fetched successfully");

  } catch (err) {

    return response.error(res, err.message, err.message.includes("Access denied") ? 403 : 500);
  }
}

async function getSalesAnalytics(req, res) {

  try {
    const analytics = await sellerService.getSalesAnalytics(req.user.userId, req.query);

    return response.success(res, analytics, "Sales analytics fetched successfully");

  } catch (err) {
    return response.error(res, err.message, err.message.includes("Access denied") ? 403 : 500);
  }
}

async function getMyProducts(req, res) {
  try {
    const products = await sellerService.getMyProducts(req.user.userId, req.query);

    return response.success(res, products, "Products fetched successfully");

  } catch (err) {

    return response.error(res, err.message, err.message.includes("Access denied") ? 403 : 500);
  }
}

async function getMyOrders(req, res) {

  try {
    const orders = await sellerService.getMyOrders(req.user.userId, req.query);

    return response.success(res, orders, "Orders fetched successfully");

  } catch (err) {

    return response.error(res, err.message, err.message.includes("Access denied") ? 403 : 500);
  }
}

async function getAdminRevenue(req, res) {

  try {
    const revenue = await sellerService.getAdminRevenue(req.user.role);

    return response.success(res, revenue, "Admin revenue fetched successfully");

  } catch (err) {
    return response.error(res, err.message, 403);
  }
}

async function updateProfile(req, res) {
  try {
    let personalUpdateData = {};
    const personalFields = ['name', 'phone', 'gender', 'date_of_birth', 'address', 'location'];

    // 1. Extract personal fields for users table
    personalFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        // Map 'address' from frontend to 'address_line1' for backend compatibility
        if (field === 'address') {
          personalUpdateData['address_line1'] = req.body[field];
        } else {
          personalUpdateData[field] = req.body[field];
        }
      }
    });

    // 2. Handle image upload for seller's personal profile
    const imageFile = req.file || (req.files && req.files.profile_image ? req.files.profile_image[0] : null);

    if (imageFile) {
      try {
        const currentUser = await userService.getMyProfile(req.user.userId);
        const imageUrl = await uploadFile(
          imageFile.buffer,
          imageFile.mimetype,
          'users/profiles',
          imageFile.originalname
        );
        personalUpdateData.profile_image_url = imageUrl;

        if (currentUser && currentUser.profile_image_url) {
          deleteFromS3Async(currentUser.profile_image_url);
        }
      } catch (uploadError) {
        logger.error("Seller profile image upload failed", { userId: req.user.userId, error: uploadError.message });
        return response.error(res, `Image upload failed: ${uploadError.message}`, 400);
      }
    }

    // 3. Update personal details in users table if any
    if (Object.keys(personalUpdateData).length > 0) {
      await userService.updateMyProfile(req.user.userId, personalUpdateData);
    }

    // 4. Delegate business-specific updates to sellerService
    // (Note: business info like bank details might be in req.body)
    const updatedUser = await sellerService.updateProfile(req.user.userId, req.body);

    return response.success(res, updatedUser, "Profile updated successfully");
  } catch (err) {
    logger.error("Seller profile update failed", { userId: req.user.userId, error: err.stack });
    return response.error(res, err.message || "Unable to update profile", 500);
  }
}

async function requestCommissionChange(req, res) {
  try {
    const { requested_percentage } = req.body;
    if (requested_percentage === undefined) {
      return response.error(res, "requested_percentage is required", 400);
    }

    const result = await sellerService.requestCommissionChange(req.user.userId, parseFloat(requested_percentage));
    return response.success(res, result, result.message);
  } catch (err) {
    return response.error(res, err.message, err.message.includes("Access denied") ? 403 : 500);
  }
}

async function addSellerWarehouse(req, res) {
  try {
    const result = await sellerService.addSellerWarehouse(req.user.userId, req.body);
    return response.success(res, result, "Warehouse saved. Pending Delhivery sync.");
  } catch (err) {
    logger.error("Error adding seller warehouse", { error: err.message, stack: err.stack });
    return response.error(res, err.message, 500);
  }
}

async function getSellerWarehouses(req, res) {
  try {
    const result = await sellerService.getSellerWarehouses(req.user.userId);
    return response.success(res, result, "Warehouse details fetched successfully.");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function getProfileRequests(req, res) {
  try {
    const requests = await sellerService.getProfileRequests(req.user.userId);
    return response.success(res, requests, "Profile requests fetched successfully");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

module.exports = {
  getDashboard,
  getSalesAnalytics,
  getMyProducts,
  getMyOrders,
  getAdminRevenue,
  updateProfile,
  requestCommissionChange,
  addSellerWarehouse,
  getSellerWarehouses,
  getProfileRequests
};