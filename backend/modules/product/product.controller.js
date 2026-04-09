const productService = require("./product.service");
const rewardCalculatorService = require("../rewards/rewardCalculator.service");
const { productSchema, updateSchema } = require("./product.schema");
const { uploadFile, deleteFromS3Async } = require("../../utils/upload");
const response = require("../../utils/response");

// Helper functions for type conversion
const toInt = (v) => (v === "" || v === null || v === undefined ? undefined : parseInt(v, 10));
const toFloat = (v) => (v === "" || v === null || v === undefined ? undefined : parseFloat(v));

async function getCategoryTree(req, res) {
    try {
        const { type } = req.query;
        const tree = await productService.getCategoryTree(type);
        return response.success(res, tree, "Category tree fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

async function getCategoriesTree(req, res) {
    try {
        const tree = await productService.getCategoryTree();
        return res.json(tree.categories); // Return raw array as requested
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function getProducts(req, res) {
    try {
        const filters = req.query;
        const data = await productService.getProducts(filters);

        // Add coin estimates
        if (data.products && data.products.length > 0) {
            data.products = await Promise.all(data.products.map(async (p) => {
                const estimate = await rewardCalculatorService.getEstimate(
                    p.selling_price,
                    p.commission_percentage || 0
                );
                return { ...p, earnable_coins: estimate.coins };
            }));
        }

        return response.success(res, data, "Products fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

async function getProductById(req, res) {
    try {
        const { id } = req.params;
        const product = await productService.getProductById(id);
        if (!product) {
            return response.error(res, "Product not found", 404);
        }

        // Add coin estimate
        const estimate = await rewardCalculatorService.getEstimate(
            product.selling_price,
            product.commission_percentage || 0
        );
        product.earnable_coins = estimate.coins;

        return response.success(res, product, "Product fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

async function createProduct(req, res) {
    try {
        let productData = { ...req.body };

        // 1. Compatibility Layer (Frontend sends category_id/subcategory_id)
        if (!productData.product_type_code) {
            productData.product_type_code = "BOOK";
        }

        if (!productData.category_leaf_id) {
            if (productData.subcategory_id) productData.category_leaf_id = productData.subcategory_id;
            else if (productData.category_id) productData.category_leaf_id = productData.category_id;
        }

        // 2. Safe Parsing
        productData.category_leaf_id = toInt(productData.category_leaf_id);
        productData.stock = toInt(productData.stock);
        productData.is_unlimited_stock = productData.is_unlimited_stock === 'true' || productData.is_unlimited_stock === true;
        productData.is_gst_inclusive = productData.is_gst_inclusive === 'true' || productData.is_gst_inclusive === true;
        productData.isGstInclusive = productData.isGstInclusive === 'true' || productData.isGstInclusive === true;
        productData.commission_percentage = toFloat(productData.commission_percentage);
        productData.selling_price = toFloat(productData.selling_price);
        productData.mrp = toFloat(productData.mrp);
        productData.discount_percent = toFloat(productData.discount_percent);

        // Ensure format is a valid string (FormData sends as string)
        if (productData.format) {
            productData.format = String(productData.format).toUpperCase();
        }
        // Automatically set unlimited stock for ebooks
        if (productData.format === 'EBOOK') {
            productData.is_unlimited_stock = true;
            productData.stock = 0;
        }

        // 4. Handle stringified attributes and metadata
        if (typeof productData.attributes === 'string') {
            try {
                productData.attributes = JSON.parse(productData.attributes);
            } catch (e) {
                return response.error(res, "Invalid attributes JSON format", 400);
            }
        }

        if (typeof productData.metadata === 'string') {
            try {
                productData.metadata = JSON.parse(productData.metadata);
            } catch (e) {
                return response.error(res, "Invalid metadata JSON format", 400);
            }
        }

        // 4. Handle file uploads
        if (req.files) {
            if (req.files.image) {
                try {
                    const imageUrl = await uploadFile(
                        req.files.image[0].buffer,
                        req.files.image[0].mimetype,
                        'products/images',
                        req.files.image[0].originalname
                    );
                    productData.image_url = imageUrl;
                } catch (uploadError) {
                    return response.error(res, `Image upload failed: ${uploadError.message}`, 400);
                }
            }

            // Handle multiple images for gallery
            if (req.files.images && req.files.images.length > 0) {
                try {
                    const imageUrls = [];
                    for (const imageFile of req.files.images) {
                        const url = await uploadFile(
                            imageFile.buffer,
                            imageFile.mimetype,
                            'products/images',
                            imageFile.originalname
                        );
                        imageUrls.push(url);
                    }
                    productData.additional_images = imageUrls;
                } catch (uploadError) {
                    return response.error(res, `Additional images upload failed: ${uploadError.message}`, 400);
                }
            }

            // Support both ebook_pdf and book_pdf for compatibility
            const pdfFile = req.files.ebook_pdf ? req.files.ebook_pdf[0] : (req.files.book_pdf ? req.files.book_pdf[0] : null);
            if (pdfFile) {
                try {
                    const pdfUrl = await uploadFile(
                        pdfFile.buffer,
                        pdfFile.mimetype,
                        'products/pdfs',
                        pdfFile.originalname
                    );
                    productData.ebook_url = pdfUrl;
                } catch (uploadError) {
                    return response.error(res, `PDF upload failed: ${uploadError.message}`, 400);
                }
            }

            // Handle remove_ebook flag (set ebook_url to null)
            if (productData.remove_ebook === "true" || productData.remove_ebook === true) {
                productData.ebook_url = null;
                // If format is EBOOK and PDF is being removed, change format to PHYSICAL
                if (productData.format === 'EBOOK') {
                    productData.format = 'PHYSICAL';
                }
            }
        }

        // 5. Validate
        const { error } = productSchema.validate(productData, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map(d => d.message).join(', ');
            return response.error(res, errorMessage, 400);
        }

        // 6. Create product
        const product = await productService.createProduct(productData, req.user.userId, req.user.role);
        return response.success(res, product, "Product created successfully");
    } catch (err) {
        console.error("Create Product Error:", err);
        return response.error(res, err.message, 400);
    }
}

async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        let productData = { ...req.body };

        // Get existing product early (needed for remove_ebook logic)
        const existingProduct = await productService.getProductById(id);
        if (!existingProduct) {
            return response.error(res, "Product not found", 404);
        }

        // Safe Parsing for update
        if (productData.category_leaf_id !== undefined) {
            productData.category_leaf_id = toInt(productData.category_leaf_id);
        }
        if (productData.stock !== undefined) {
            productData.stock = toInt(productData.stock);
        }
        if (productData.is_unlimited_stock !== undefined) {
            productData.is_unlimited_stock = productData.is_unlimited_stock === 'true' || productData.is_unlimited_stock === true;
        }
        if (productData.is_gst_inclusive !== undefined) {
            productData.is_gst_inclusive = productData.is_gst_inclusive === 'true' || productData.is_gst_inclusive === true;
        }
        if (productData.isGstInclusive !== undefined) {
            productData.isGstInclusive = productData.isGstInclusive === 'true' || productData.isGstInclusive === true;
        }
        if (productData.is_active !== undefined) {
            productData.is_active = productData.is_active === 'true' || productData.is_active === true;
        }
        if (productData.commission_percentage !== undefined) {
            productData.commission_percentage = toFloat(productData.commission_percentage);
        }
        if (productData.selling_price !== undefined) {
            productData.selling_price = toFloat(productData.selling_price);
        }
        if (productData.mrp !== undefined) {
            productData.mrp = toFloat(productData.mrp);
        }
        if (productData.discount_percent !== undefined) {
            productData.discount_percent = toFloat(productData.discount_percent);
        }

        // Ensure format is a valid string (FormData sends as string)
        if (productData.format !== undefined) {
            productData.format = String(productData.format).toUpperCase();
        }

        // Handle stringified attributes and metadata
        if (typeof productData.attributes === 'string') {
            try {
                productData.attributes = JSON.parse(productData.attributes);
            } catch (e) {
                return response.error(res, "Invalid attributes JSON format", 400);
            }
        }

        if (typeof productData.metadata === 'string') {
            try {
                productData.metadata = JSON.parse(productData.metadata);
            } catch (e) {
                return response.error(res, "Invalid metadata JSON format", 400);
            }
        }

        // Handle file uploads
        if (req.files) {
            if (req.files.image) {
                try {
                    // Delete old image if exists
                    if (existingProduct.image_url) {
                        deleteFromS3Async(existingProduct.image_url);
                    }

                    const imageUrl = await uploadFile(
                        req.files.image[0].buffer,
                        req.files.image[0].mimetype,
                        'products/images',
                        req.files.image[0].originalname
                    );
                    productData.image_url = imageUrl;
                } catch (uploadError) {
                    return response.error(res, `Image upload failed: ${uploadError.message}`, 400);
                }
            }

            // Handle multiple images for gallery
            if (req.files.images && req.files.images.length > 0) {
                try {
                    // Delete old additional images if they exist
                    if (existingProduct.additional_images && Array.isArray(existingProduct.additional_images)) {
                        existingProduct.additional_images.forEach(oldUrl => {
                            deleteFromS3Async(oldUrl);
                        });
                    }

                    const imageUrls = [];
                    for (const imageFile of req.files.images) {
                        const url = await uploadFile(
                            imageFile.buffer,
                            imageFile.mimetype,
                            'products/images',
                            imageFile.originalname
                        );
                        imageUrls.push(url);
                    }
                    productData.additional_images = imageUrls;
                } catch (uploadError) {
                    return response.error(res, `Additional images upload failed: ${uploadError.message}`, 400);
                }
            }

            const pdfFile = req.files.ebook_pdf ? req.files.ebook_pdf[0] : (req.files.book_pdf ? req.files.book_pdf[0] : null);
            if (pdfFile) {
                try {
                    // Delete old PDF if exists
                    if (existingProduct.ebook_url) {
                        deleteFromS3Async(existingProduct.ebook_url);
                    }

                    const pdfUrl = await uploadFile(
                        pdfFile.buffer,
                        pdfFile.mimetype,
                        'products/pdfs',
                        pdfFile.originalname
                    );
                    productData.ebook_url = pdfUrl;
                } catch (uploadError) {
                    return response.error(res, `PDF upload failed: ${uploadError.message}`, 400);
                }
            }
        }

        // Handle remove_ebook flag (set ebook_url to null)
        if (productData.remove_ebook === "true" || productData.remove_ebook === true) {
            productData.ebook_url = null;
            // If format is EBOOK and PDF is being removed, change format to PHYSICAL
            const currentFormat = productData.format !== undefined ? productData.format : existingProduct.format;
            if (currentFormat === 'EBOOK') {
                productData.format = 'PHYSICAL';
            }
        }

        // Remove product_type_code if present (not allowed in updates)
        delete productData.product_type_code;

        // Validate with update schema (allows partial updates)
        const { error } = updateSchema.validate(productData, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map(d => d.message).join(', ');
            return response.error(res, errorMessage, 400);
        }

        const product = await productService.updateProduct(id, productData, req.user.userId, req.user.role);
        return response.success(res, product, "Product updated successfully");
    } catch (err) {
        console.error("Update Product Error:", err);
        return response.error(res, err.message, 400);
    }
}

async function deleteProduct(req, res) {
    try {
        const { id } = req.params;
        const product = await productService.deleteProduct(id, req.user.userId, req.user.role);
        return response.success(res, product, "Product deleted successfully");
    } catch (err) {
        console.error("Delete Product Error:", err);
        return response.error(res, err.message, 400);
    }
}

async function getMyProducts(req, res) {
    try {
        const filters = { ...req.query, seller_id: req.user.userId };
        const data = await productService.getProducts(filters);
        return response.success(res, data, "Your products fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

async function getLowStockProducts(req, res) {
    try {
        const threshold = req.query.threshold ? parseInt(req.query.threshold) : 10;
        const products = await productService.getLowStockProducts(req.user.userId, threshold);
        return response.success(res, products, "Low stock products fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

async function getCategories(req, res) {
    try {
        const { type } = req.query;
        const categories = await productService.getCategories(type);
        return response.success(res, categories, "Categories fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

async function getSubcategories(req, res) {
    try {
        const { category_id } = req.query;
        const subcategories = await productService.getSubcategories(category_id);
        return response.success(res, subcategories, "Subcategories fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

module.exports = {
    // Core CRUD
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getCategoriesTree,

    // Seller Dashboard
    getMyProducts,
    getLowStockProducts,

    // Categories
    getCategoryTree,
    getCategories,
    getSubcategories
};