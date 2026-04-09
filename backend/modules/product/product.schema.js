const Joi = require("joi");

const productSchema = Joi.object({
    product_type_code: Joi.string().valid("BOOK", "EBOOK", "NOTEBOOK", "STATIONERY").required(),
    category_leaf_id: Joi.number().integer().positive().required(),

    title: Joi.string().min(1).max(255).required(),
    sku: Joi.string().max(100).allow("", null).optional(),
    description: Joi.string().allow("", null).optional(),

    mrp: Joi.number().min(0).allow(null).optional(),
    selling_price: Joi.number().positive().required(),
    discount_percent: Joi.number().min(0).max(100).allow(null).optional(),

    stock: Joi.number().integer().min(0).default(0),
    is_unlimited_stock: Joi.boolean().default(false),
    commission_percentage: Joi.number().min(0).max(100).allow(null).optional(),

    format: Joi.string().valid("PHYSICAL", "EBOOK").default("PHYSICAL"),
    ebook_url: Joi.string().allow("", null).optional(),
    image_url: Joi.string().allow("", null).optional(),
    additional_images: Joi.array().items(Joi.string().allow("", null)).optional().allow(null),

    gst_rate: Joi.number().min(0).max(28).precision(2).optional(),
    is_gst_inclusive: Joi.boolean().optional(),
    gstRate: Joi.number().min(0).max(28).precision(2).optional(),
    isGstInclusive: Joi.boolean().optional(),

    attributes: Joi.object().required().custom((attrs, helpers) => {
        const type = helpers.state.ancestors[0].product_type_code;
        const format = helpers.state.ancestors[0].format;

        if (type === 'BOOK' && format === 'PHYSICAL') {
            const schema = Joi.object({
                type: Joi.string().valid('BOOK_PHYSICAL').required(),
                author: Joi.string().required(),
                publisher: Joi.string().required(),
                isbn: Joi.string().custom((val, helpers) => {
                    // Remove all non-alphanumeric characters for validation
                    const cleanIsbn = val.replace(/[^0-9Xx]/g, '');
                    if (cleanIsbn.length < 10 || cleanIsbn.length > 13) return helpers.error('any.invalid');
                    return val;
                }).required().messages({ 'any.invalid': 'ISBN must be 10 to 13 characters (digits and X only, hyphens/spaces allowed)' }),
                edition: Joi.string().optional(),
                publication_year: Joi.number().integer().min(1800).max(new Date().getFullYear() + 1).optional(),
                language: Joi.string().required(),
                page_count: Joi.number().integer().min(1).max(2000).required(),
                binding_type: Joi.string().valid('PAPERBACK', 'HARDCOVER', 'SPIRAL').optional(),
                dimensions: Joi.string().optional(),
                print_type: Joi.string().optional(),
                description: Joi.string().optional(),
                specifications: Joi.string().allow('').optional()
            }).unknown(true);
            const { error } = schema.validate(attrs);
            if (error) return helpers.message(`Book Physical: ${error.details[0].message}`);
        } else if (type === 'EBOOK' || (type === 'BOOK' && format === 'EBOOK')) {
            const schema = Joi.object({
                type: Joi.string().valid('BOOK_EBOOK').required(),
                file_format: Joi.string().valid('PDF', 'EPUB', 'MOBI').default('PDF'),
                file_size_mb: Joi.number().positive().optional(),
                drm_protected: Joi.boolean().default(false),
                preview_pages: Joi.number().integer().min(0).optional(),
                license_type: Joi.string().valid('LIFETIME', 'LEASE').default('LIFETIME'),
                author: Joi.string().required(),
                publisher: Joi.string().optional(),
                language: Joi.string().required(),
                description: Joi.string().optional(),
                specifications: Joi.string().allow('').optional()
            }).unknown(true);
            const { error } = schema.validate(attrs);
            if (error) return helpers.message(`E-Book: ${error.details[0].message}`);
        } else if (type === 'NOTEBOOK') {
            const schema = Joi.object({
                type: Joi.string().valid('NOTEBOOK').required(),
                page_count: Joi.number().integer().min(1).max(500).required(),
                paper_gsm: Joi.number().integer().min(50).max(120).required(),
                ruling_type: Joi.string().valid('SINGLE', 'DOUBLE', 'FOUR', 'GRAPH', 'UNRULED').required(),
                binding_type: Joi.string().valid('SPIRAL', 'STITCHED', 'HARD').optional(),
                cover_type: Joi.string().optional(),
                size: Joi.string().optional(),
                description: Joi.string().optional(),
                specifications: Joi.string().allow('').optional()
            }).unknown(true);
            const { error } = schema.validate(attrs);
            if (error) return helpers.message(`Notebook: ${error.details[0].message}`);
        } else if (type === 'STATIONERY') {
            const schema = Joi.object({
                type: Joi.string().valid('STATIONERY').required(),
                brand: Joi.string().required(),
                material: Joi.string().optional(),
                color: Joi.string().optional(),
                pack_size: Joi.number().integer().min(1).required(),
                usage_type: Joi.string().optional(),
                refillable: Joi.boolean().optional(),
                description: Joi.string().optional(),
                specifications: Joi.string().allow('').optional()
            }).unknown(true);
            const { error } = schema.validate(attrs);
            if (error) return helpers.message(`Stationery: ${error.details[0].message}`);
        }
        return attrs;
    }),

    weight: Joi.when('format', {
        is: 'PHYSICAL',
        then: Joi.number().positive().max(50).required(),
        otherwise: Joi.number().optional().allow(null).default(0)
    }),
    meta_title: Joi.string().max(255).allow("", null).optional(),
    meta_description: Joi.string().max(500).allow("", null).optional(),
    tags: Joi.alternatives().try(
        Joi.array().items(Joi.string().max(50)).max(50),
        Joi.string().allow("", null)
    ).optional(),
    metadata: Joi.object().unknown(true).allow(null).optional().default({})
}).custom((value, helpers) => {
    // Basic validations
    if (value.mrp !== null && value.mrp !== undefined && value.selling_price > value.mrp) {
        return helpers.error("any.invalid", { message: "selling_price cannot be greater than mrp" });
    }

    // Format validations based on product type
    if (value.product_type_code === "BOOK") {
        if (value.format === "EBOOK") {
            // Ebooks should have unlimited stock or handled as such
            value.is_unlimited_stock = true;
            value.stock = 0;
            if (!value.ebook_url) {
                return helpers.error("any.invalid", { message: "Ebook URL (PDF) is required for EBOOK format" });
            }
        }
    } else if (value.product_type_code === "EBOOK") {
        // Force EBOOK format for EBOOK type
        value.format = "EBOOK";
        value.is_unlimited_stock = true;
        value.stock = 0;
        if (!value.ebook_url) {
            return helpers.error("any.invalid", { message: "Ebook URL (PDF) is required for EBOOK products" });
        }
    } else {
        // Notebooks and Stationery can only be PHYSICAL
        if (value.format !== "PHYSICAL") {
            return helpers.error("any.invalid", { message: `${value.product_type_code} products can only be PHYSICAL format` });
        }
    }

    return value;
});

const updateSchema = Joi.object({
    category_leaf_id: Joi.number().integer().positive().optional(),
    title: Joi.string().min(1).max(255).optional(),
    sku: Joi.string().max(100).allow("", null).optional(),
    description: Joi.string().allow("", null).optional(),
    selling_price: Joi.number().positive().optional(),
    mrp: Joi.number().min(0).allow(null).optional(),
    discount_percent: Joi.number().min(0).max(100).allow(null).optional(),
    stock: Joi.number().integer().min(0).optional(),
    is_unlimited_stock: Joi.boolean().optional(),
    commission_percentage: Joi.number().min(0).max(100).allow(null).optional(),
    format: Joi.string().valid("PHYSICAL", "EBOOK", "BOTH").optional(),
    ebook_url: Joi.string().allow("", null).optional(),

    gst_rate: Joi.number().min(0).max(28).precision(2).optional(),
    is_gst_inclusive: Joi.boolean().optional(),
    gstRate: Joi.number().min(0).max(28).precision(2).optional(),
    isGstInclusive: Joi.boolean().optional(),

    attributes: Joi.object().unknown(true).allow(null).optional(),
    meta_title: Joi.string().max(255).allow("", null).optional(),
    meta_description: Joi.string().max(500).allow("", null).optional(),
    tags: Joi.alternatives().try(
        Joi.array().items(Joi.string().max(50)).max(50),
        Joi.string().allow("", null)
    ).optional(),
    is_active: Joi.boolean().optional(),
    remove_ebook: Joi.any().optional(),
    metadata: Joi.object().unknown(true).allow(null).optional()
}).unknown(true).custom((value, helpers) => {
    // Basic validations
    if (value.mrp !== null && value.mrp !== undefined && value.selling_price !== undefined && value.selling_price > value.mrp) {
        return helpers.error("any.invalid", { message: "selling_price cannot be greater than mrp" });
    }
    return value;
});

module.exports = {
    productSchema,
    updateSchema
};