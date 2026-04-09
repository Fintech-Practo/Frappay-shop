const productModel = require("./product.model");
const ROLES = require("../../config/roles");

async function getCategoryTree(type) {
    const allCategories = await productModel.getCategoryTree(type);

    // Build tree
    const map = {};
    const roots = [];

    // First pass: create nodes
    allCategories.forEach(cat => {
        map[cat.id] = { ...cat, children: [] };
    });

    // Second pass: link parents
    allCategories.forEach(cat => {
        if (cat.parent_id && map[cat.parent_id]) {
            map[cat.parent_id].children.push(map[cat.id]);
        } else {

            roots.push(map[cat.id]);
        }
    });

    return {
        type: type || 'ALL',
        categories: roots
    };
}

/**
 * Normalizes GST based on product type
 * BOOK/DIGITAL -> GST = 0, inclusive = true
 * NOTEBOOK/STATIONERY -> Seller provided GST (0-28) or default 0
 */
function normalizeGST({ productTypeCode, format, gstRate, isGstInclusive }) {
    // Treat DIGITAL/EBOOK OR BOOK as 0 GST
    if (productTypeCode === 'BOOK' || format === 'EBOOK') {
        return {
            gst_rate: 0.00,
            is_gst_inclusive: true
        };
    }

    // For NOTEBOOK or STATIONERY, enforce limits
    if (['NOTEBOOK', 'STATIONERY'].includes(productTypeCode)) {
        let rate = parseFloat(gstRate);
        if (isNaN(rate) || rate < 0) rate = 0;
        if (rate > 28) rate = 28;

        return {
            gst_rate: Number(rate.toFixed(2)),
            is_gst_inclusive: isGstInclusive !== undefined ? Boolean(isGstInclusive) : true
        };
    }

    // Default fallback
    return { gst_rate: 0.00, is_gst_inclusive: true };
}

async function createProduct(data, userId, userRole) {
    // 1. Verify Category
    const category = await productModel.getCategoryById(data.category_leaf_id);
    if (!category) {
        throw new Error('Invalid Category ID');
    }

    // 2. Enforce Category Type Match
    if (data.product_type_code && category.product_type_code !== data.product_type_code) {
        throw new Error(`Category type (${category.product_type_code}) does not match product type (${data.product_type_code})`);
    }

    // 3. Enforce Leaf Category
    // const isParent = await productModel.hasChildren(data.category_leaf_id);
    // if (isParent) {
    //     throw new Error(`The category "${category.name}" is a main category. Please select a specific subcategory (e.g., Fiction, Business) instead.`);
    // }

    if (!category.is_leaf) {
    throw new Error(`The category "${category.name}" is not a final category. Please select the most specific category.`);
}

    // 4. Validate Format & Ebook URL
    if (data.format === "PHYSICAL" && data.ebook_url) {
        throw new Error("Ebook URL is not allowed for PHYSICAL format");
    }


    // 5. SEO Fallback Logic
    const productData = {
        ...data,
        seller_id: userId
    };

    if (!productData.meta_title) {
        let metaTitle = data.title;
        if (data.attributes && data.attributes.author) {
            metaTitle += ` by ${data.attributes.author}`;
        } else if (data.attributes && data.attributes.brand) {
            metaTitle += ` - ${data.attributes.brand}`;
        }
        productData.meta_title = metaTitle.substring(0, 255);
    }

    if (!productData.meta_description && data.description) {
        productData.meta_description = data.description.substring(0, 160);
    }

    // Normalize GST
    const gstData = normalizeGST({
        productTypeCode: data.product_type_code,
        format: data.format,
        gstRate: data.gstRate,
        isGstInclusive: data.isGstInclusive
    });

    productData.gst_rate = gstData.gst_rate;
    productData.is_gst_inclusive = gstData.is_gst_inclusive;

    // 6. Create product
    const newProduct = await productModel.create(productData);

    // Sync with product_images table

    // Add main image as primary
    if (productData.image_url) {
        await productModel.addImage(newProduct.id, productData.image_url, true);
    }

    // Add additional images as gallery
    if (productData.additional_images && Array.isArray(productData.additional_images)) {
        for (const img of productData.additional_images) {
            await productModel.addImage(newProduct.id, img, false);
        }
    }

    return newProduct;
}

async function getProducts(filters) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;

    // Pass calculated paging to model
    const queryFilters = { ...filters, limit, offset };

    // Handle category_path to category_ids resolution
    if (filters.category_path) {
        const catId = await productModel.getCategoryIdByPath(filters.category_path);
        if (catId) {
            const decendants = await productModel.getCategoryDescendants(catId);
            queryFilters.category_ids = decendants.join(',');
        } else {
            // Path not found, return empty result
            return {
                products: [],
                pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false }
            };
        }
    }

    const { rows, count } = await productModel.findAll(queryFilters);
    const totalPages = Math.ceil(count / limit);

    return {
        products: rows,
        pagination: {
            total: count,
            page: page,
            limit: limit,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
}

async function getProductById(id) {
    return await productModel.findById(id);
}

async function updateProduct(id, data, userId, userRole) {
    // Check if product exists and user has permission
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
        throw new Error('Product not found');
    }

    // Check ownership or admin privilege
    if (existingProduct.seller_id !== userId && userRole !== 'ADMIN') {
        throw new Error('Not authorized to update this product');
    }

    // Use existing product_type_code if not provided in update
    const productTypeCode = data.product_type_code || existingProduct.product_type_code;

    // Validate category if being updated
    if (data.category_leaf_id) {
        const category = await productModel.getCategoryById(data.category_leaf_id);
        if (!category) {
            throw new Error('Invalid Category ID');
        }

        // Enforce Category Type Match
        if (category.product_type_code !== productTypeCode) {
            throw new Error(`Category type (${category.product_type_code}) does not match product type (${productTypeCode})`);
        }

        // Enforce Leaf Category
        // const isParent = await productModel.hasChildren(data.category_leaf_id);
        // if (isParent) {
        //     throw new Error(`The category "${category.name}" is a main category. Please select a specific subcategory instead.`);
        // }

        if (!category.is_leaf) {
    throw new Error(`The category "${category.name}" is not a final category. Please select the most specific category.`);
}
    }

    // Format validation based on product type
    const format = data.format !== undefined ? data.format : existingProduct.format;
    const ebookUrl = data.ebook_url !== undefined ? data.ebook_url : existingProduct.ebook_url;

    // For NOTEBOOK/STATIONERY, enforce PHYSICAL format and no ebook_url
    if (['NOTEBOOK', 'STATIONERY'].includes(productTypeCode)) {
        if (format !== 'PHYSICAL') {
            throw new Error(`${productTypeCode} products can only be PHYSICAL format`);
        }
        if (ebookUrl) {
            throw new Error("Ebook URL is not allowed for NOTEBOOK/STATIONERY products");
        }
    }

    // For BOOK: validate format and ebook_url consistency
    if (productTypeCode === 'BOOK') {
        if (format === 'PHYSICAL' && ebookUrl) {
            throw new Error("Ebook URL is not allowed for PHYSICAL format");
        }
        // PDF is optional for testing - can be added later
        // For EBOOK or BOTH, ebook_url must exist (either from existing product or new upload)
        // if ((format === 'EBOOK' || format === 'BOTH') && !ebookUrl) {
        //     throw new Error("Ebook URL is required for EBOOK or BOTH format");
        // }
    }

    // Normalize GST
    // We combine potentially new GST data with existing data, preserving safety 
    const gstData = normalizeGST({
        productTypeCode: productTypeCode,
        format: format,
        gstRate: data.gstRate !== undefined ? data.gstRate : existingProduct.gst_rate,
        isGstInclusive: data.isGstInclusive !== undefined ? data.isGstInclusive : existingProduct.is_gst_inclusive
    });

    data.gst_rate = gstData.gst_rate;
    data.is_gst_inclusive = gstData.is_gst_inclusive;

    const updatedProduct = await productModel.update(id, data);

    // Sync with product_images table if images changed
    try {
        if (data.image_url) {
            await productModel.addImage(id, data.image_url, true);
        }

        if (data.additional_images && Array.isArray(data.additional_images)) {
            await productModel.clearGalleryImages(id);
            for (const img of data.additional_images) {
                await productModel.addImage(id, img, false);
            }
        }
    } catch (err) {
        console.error("Failed to sync images to product_images table during update", err);
    }

    return updatedProduct;
}

async function deleteProduct(id, userId, userRole) {
    // Check if product exists and user has permission
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
        throw new Error('Product not found');
    }

    // Check ownership or admin privilege
    if (existingProduct.seller_id !== userId && userRole !== 'ADMIN') {
        throw new Error('Not authorized to delete this product');
    }

    // Soft delete by setting is_active = false
    return await productModel.update(id, { is_active: false });
}

async function getLowStockProducts(sellerId, threshold = 10) {
    return await productModel.findLowStockBySeller(sellerId, threshold);
}

async function getCategories(type) {
    const rows = await productModel.getCategoryTree(type);

    // Transform to flat list format { id, name, slug }
    return rows.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        product_type_code: r.product_type_code,
        level: r.level,
        parent_id: r.parent_id
    }));
}

async function getSubcategories(category_id) {
    const rows = await productModel.getCategoryTree();

    // Find direct children of the given category_id
    return rows
        .filter(r => String(r.parent_id) === String(category_id))
        .map(r => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            product_type_code: r.product_type_code,
            parent_id: r.parent_id
        }));
}

module.exports = {
    getCategoryTree,
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getMyProducts: getProducts, // Reuse getProducts with seller filter
    getLowStockProducts,
    getCategories,
    getSubcategories
};