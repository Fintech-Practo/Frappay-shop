const express = require("express");
const controller = require("../product/product.controller");

const router = express.Router();

router.get("/tree", controller.getCategoriesTree);

module.exports = router;
