const express = require("express");
const multer = require("multer");
const controller = require("./product.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const kycVerified = require("../../middlewares/kycVerified.middleware");
const { uploadProductFiles } = require("../../config/multer");
const ROLES = require("../../config/roles");

const router = express.Router();


// Public routes
router.get("/tree", controller.getCategoryTree);
router.get("/", controller.getProducts);

// Seller Dashboard routes (protected)
router.get("/my/products", authMiddleware, allowRole(ROLES.SELLER, ROLES.ADMIN), controller.getMyProducts);
router.get("/my/low-stock", authMiddleware, allowRole(ROLES.SELLER, ROLES.ADMIN), controller.getLowStockProducts);

// Category routes
router.get("/categories", controller.getCategories);
router.get("/subcategories", controller.getSubcategories);

// Product by ID route (must be last)
router.get("/:id", controller.getProductById);

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large: ${err.message}`
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    }
    next();
};

// Product management routes (protected)
router.post(
    "/",
    authMiddleware,
    allowRole(ROLES.SELLER, ROLES.ADMIN),
    kycVerified,
    uploadProductFiles,
    handleMulterError,
    controller.createProduct
);

router.put(
    "/:id",
    authMiddleware,
    allowRole(ROLES.SELLER, ROLES.ADMIN),
    kycVerified,
    uploadProductFiles,
    handleMulterError,
    controller.updateProduct
);

router.delete(
    "/:id",
    authMiddleware,
    allowRole(ROLES.SELLER, ROLES.ADMIN),
    controller.deleteProduct
);

module.exports = router;
