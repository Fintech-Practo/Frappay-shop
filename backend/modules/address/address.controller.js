const addressService = require("./address.service");
const { createAddressSchema, updateAddressSchema } = require("./address.schema");
const response = require("../../utils/response");

async function createAddress(req, res) {
  try {
    const { error } = createAddressSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const address = await addressService.createAddress(req.user.userId, req.body);
    return response.success(res, address, "Address created successfully");
  } catch (err) {
    return response.error(res, err.message || "Failed to create address", 500);
  }
}

async function getAddresses(req, res) {
  try {
    const addresses = await addressService.getUserAddresses(req.user.userId);
    return response.success(res, addresses || [], "Addresses fetched successfully");
  } catch (err) {
    console.error("Error in getAddresses:", err);
    return response.error(res, err.message || "Failed to fetch addresses", 500);
  }
}

async function getAddress(req, res) {
  try {
    const address = await addressService.getAddressById(parseInt(req.params.id), req.user.userId);
    return response.success(res, address, "Address fetched successfully");
  } catch (err) {
    return response.error(res, err.message || "Address not found", 404);
  }
}

async function updateAddress(req, res) {
  try {
    const { error } = updateAddressSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    const address = await addressService.updateAddress(parseInt(req.params.id), req.user.userId, req.body);
    return response.success(res, address, "Address updated successfully");
  } catch (err) {
    return response.error(res, err.message || "Failed to update address", 500);
  }
}

async function deleteAddress(req, res) {
  try {
    await addressService.deleteAddress(parseInt(req.params.id), req.user.userId);
    return response.success(res, null, "Address deleted successfully");
  } catch (err) {
    return response.error(res, err.message || "Failed to delete address", 500);
  }
}

async function setDefault(req, res) {
  try {
    await addressService.setDefaultAddress(parseInt(req.params.id), req.user.userId);
    // Fetch and return updated addresses
    const addresses = await addressService.getUserAddresses(req.user.userId);
    return response.success(res, addresses, "Default address updated successfully");
  } catch (err) {
    return response.error(res, err.message || "Failed to set default address", 500);
  }
}

module.exports = {
  createAddress,
  getAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
  setDefault,
};

