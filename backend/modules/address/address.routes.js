const express = require("express");
const controller = require("./address.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(auth); // All routes require authentication

router.post("/", controller.createAddress);
router.get("/", controller.getAddresses);
router.get("/:id", controller.getAddress);
router.put("/:id", controller.updateAddress);
router.delete("/:id", controller.deleteAddress);
router.put("/:id/set-default", controller.setDefault);

module.exports = router;

