const addressModel = require("./address.model");

async function createAddress(userId, data) {
  return await addressModel.create(userId, data);
}

async function getUserAddresses(userId) {
  return await addressModel.findByUserId(userId);
}

async function getAddressById(id, userId) {
  const address = await addressModel.findById(id);
  if (!address || address.user_id !== userId) {
    throw new Error("Address not found");
  }
  return address;
}

async function updateAddress(id, userId, data) {
  return await addressModel.update(id, userId, data);
}

async function deleteAddress(id, userId) {
  const deleted = await addressModel.remove(id, userId);
  if (!deleted) {
    throw new Error("Address not found");
  }
  return { success: true };
}

async function setDefaultAddress(id, userId) {
  const success = await addressModel.setDefault(id, userId);
  if (!success) {
    throw new Error("Address not found");
  }
  return { success: true };
}

module.exports = {
  createAddress,
  getUserAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

