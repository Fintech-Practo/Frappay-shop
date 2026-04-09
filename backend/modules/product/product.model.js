const pool = require("../../config/db");

/**
 * Shared helper to build WHERE clause for products
 */
function buildProductWhereClause(filters = {}) {
    let where = "WHERE 1=1";
    const params = [];

    // Active Filter
    if (filters.is_active !== undefined) {
        where += " AND p.is_active = ?";
        params.push(filters.is_active === 'true' || filters.is_active === true);
    } else if (!filters.show_all) {
        where += " AND p.is_active = true";
    }

    // Basic Filters
    if (filters.seller_id) {
        where += " AND p.seller_id = ?";
        params.push(filters.seller_id);
    }
    if (filters.product_type_code) {
        where += " AND p.product_type_code = ?";
        params.push(filters.product_type_code);
    }
    if (filters.category_leaf_id) {
        where += " AND p.category_leaf_id = ?";
        params.push(filters.category_leaf_id);
    }
    if (filters.category_ids) {
        const ids = String(filters.category_ids).split(',').map(id => id.trim());
        if (ids.length > 0) {
            where += ` AND p.category_leaf_id IN (${ids.map(() => '?').join(',')})`;
            params.push(...ids);
        }
    }
    if (filters.category_parent_id) {
        where += " AND c.parent_id = ?";
        params.push(filters.category_parent_id);
    }
    if (filters.format) {
        where += " AND p.format = ?";
        params.push(filters.format);
    }

    // Price Range
    if (filters.min_price) {
        where += " AND p.selling_price >= ?";
        params.push(parseFloat(filters.min_price));
    }
    if (filters.max_price) {
        where += " AND p.selling_price <= ?";
        params.push(parseFloat(filters.max_price));
    }

    // Advanced Search
    if (filters.search) {
        let searchValue = filters.search.trim();
        const isHashtag = searchValue.startsWith('#');
        if (isHashtag) searchValue = searchValue.substring(1);

        const searchTerm = `%${searchValue}%`;

        if (isHashtag) {
            // Priority Tag/Metadata Search (Hashtag Mode)
            // Simplified to LIKE for maximum compatibility across MySQL versions
            where += ` AND (
                p.tags LIKE ?
                OR p.id IN (
                    SELECT pm.product_id
                    FROM product_metadata_map pm
                    WHERE pm.value_text LIKE ?
                )
            )`;
            params.push(searchTerm, searchTerm);
        } else {
            // General Deep Search (Keyword Mode)
            where += ` AND (
                p.title LIKE ? 
                OR p.description LIKE ? 
                OR p.meta_title LIKE ? 
                OR p.meta_description LIKE ? 
                OR p.sku LIKE ?
                OR p.tags LIKE ?
                OR c.name LIKE ? 
                OR parent.name LIKE ?
                OR u.name LIKE ?
                OR CAST(p.mrp AS CHAR) LIKE ?
                OR p.format LIKE ?
                OR REPLACE(LOWER(p.title), ' ', '-') LIKE ?
                OR p.attributes->>'$.publisher' LIKE ?
                OR p.attributes->>'$.isbn' LIKE ?
                OR p.attributes->>'$.subject' LIKE ?
                OR p.attributes->>'$.grade' LIKE ?
                OR p.attributes->>'$.board' LIKE ?
                OR p.attributes->>'$.author' LIKE ?
                OR p.attributes->>'$.brand' LIKE ?
                OR p.attributes->>'$.material' LIKE ?
                OR CAST(p.attributes AS CHAR) LIKE ?
                OR p.id IN (
                    SELECT pm.product_id
                    FROM product_metadata_map pm
                    WHERE pm.value_text LIKE ?
                )
            )`;

            // Push params for the 22 LIKE conditions above
            for (let i = 0; i < 22; i++) {
                params.push(searchTerm);
            }
        }
    }

    // Dynamic Metadata Filtering
    if (filters.metadata && typeof filters.metadata === 'object') {
        for (const [slug, values] of Object.entries(filters.metadata)) {
            if (!values || values.length === 0) continue;

            const valueArray = Array.isArray(values) ? values : [values];

            where += ` AND p.id IN (
                SELECT pm.product_id
                FROM product_metadata_map pm
                JOIN metadata_definitions md ON md.id = pm.metadata_id
                WHERE md.slug = ?
                AND (pm.metadata_value_id IN (?) OR pm.value_text IN (?))
            )`;
            params.push(slug, valueArray, valueArray);
        }
    }

    return { where, params };
}

async function create(data) {
    const {
        seller_id,
        product_type_code,
        category_leaf_id,
        title,
        sku,
        description,
        mrp,
        selling_price,
        discount_percent,
        stock,
        format = 'PHYSICAL',
        ebook_url,
        attributes,
        image_url,
        additional_images,
        commission_percentage,
        is_unlimited_stock = false,
        weight,
        meta_title,
        meta_description,
        tags,
        gst_rate = 0.00,
        is_gst_inclusive = true
    } = data;

    if (!seller_id) throw new Error("Seller ID is required");
    if (!title) throw new Error("Title is required");
    if (!selling_price || selling_price <= 0)
        throw new Error("Valid selling price required");

    if (format === 'PHYSICAL') {
        if (!weight || weight <= 0) {
            throw new Error("Weight is required for physical products");
        }
    }

    if (format === 'EBOOK') {
        if (!ebook_url) {
            throw new Error("Ebook URL is required for digital products");
        }
    }

    const normalizedAttributes =
        attributes === undefined || attributes === null
            ? null
            : typeof attributes === "string"
                ? attributes
                : JSON.stringify(attributes);

    const normalizedAdditionalImages =
        Array.isArray(additional_images)
            ? JSON.stringify(additional_images)
            : null;

    const normalizedTags =
        Array.isArray(tags)
            ? JSON.stringify(tags)
            : typeof tags === 'string'
                ? JSON.stringify(tags.split(',').map(t => t.trim()))
                : null;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO products (
                seller_id, product_type_code, category_leaf_id, title, sku, description,
                mrp, selling_price, discount_percent, stock, format, ebook_url, attributes,
                image_url, additional_images, commission_percentage, is_unlimited_stock,
                weight, meta_title, meta_description, tags, is_active, gst_rate, is_gst_inclusive
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?)`,
            [
                seller_id, product_type_code, category_leaf_id, title, sku || null,
                description || null, mrp || null, selling_price, discount_percent || null,
                stock || 0, format, ebook_url || null, normalizedAttributes, image_url || null,
                normalizedAdditionalImages, commission_percentage || null, is_unlimited_stock,
                format === 'PHYSICAL' ? weight : 0, meta_title || null, meta_description || null,
                normalizedTags, gst_rate, is_gst_inclusive
            ]
        );

        const productId = result.insertId;

        // Process Metadata
        if (data.metadata && typeof data.metadata === 'object') {
            for (const [slug, metaValue] of Object.entries(data.metadata)) {
                // Step 1: Resolve slug
                const [defRows] = await connection.query(
                    'SELECT id, data_type, is_multi_select FROM metadata_definitions WHERE slug = ?',
                    [slug]
                );
                if (defRows.length === 0) {
                    throw new Error(`Invalid metadata slug: ${slug}`);
                }
                const def = defRows[0];
                const metaId = def.id;

                let values = Array.isArray(metaValue) ? metaValue : [metaValue];

                // Security rule: Reject array if not multi-select
                if (values.length > 1 && !def.is_multi_select) {
                    throw new Error(`Multiple values passed for single-select metadata: ${slug}`);
                }

                for (const val of values) {
                    if (val === null || val === undefined || val === '') continue;

                    if (def.data_type === 'ENUM') {
                        // Step 2: ENUM Validation (Accept both ID and Label)
                        const [valRows] = await connection.query(
                            'SELECT id FROM metadata_values WHERE metadata_id = ? AND (id = ? OR value = ?)',
                            [metaId, isNaN(val) ? null : Number(val), String(val)]
                        );
                        if (valRows.length === 0) {
                            throw new Error(`Invalid ENUM value for ${slug}: ${val}`);
                        }
                        const valueId = valRows[0].id;

                        // Step 3: Insert ENUM
                        await connection.query(
                            'INSERT INTO product_metadata_map (product_id, metadata_id, metadata_value_id, value_text) VALUES (?, ?, ?, NULL)',
                            [productId, metaId, valueId]
                        );
                    } else {
                        // Step 3: Insert Non-ENUM
                        await connection.query(
                            'INSERT INTO product_metadata_map (product_id, metadata_id, metadata_value_id, value_text) VALUES (?, ?, NULL, ?)',
                            [productId, metaId, String(val)]
                        );
                    }
                }
            }
        }

        await connection.commit();
        return await findById(productId);
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function findById(id) {
    const [rows] = await pool.query(
        `SELECT p.*, 
            c.id as leaf_id, c.name as leaf_name, c.slug as leaf_slug,
            parent.id as parent_id, parent.name as parent_name, parent.slug as parent_slug,
            pt.label as product_type_label,
            u.name as seller_name
     FROM products p
     LEFT JOIN categories_v2 c ON p.category_leaf_id = c.id
     LEFT JOIN categories_v2 parent ON c.parent_id = parent.id
     LEFT JOIN product_types pt ON p.product_type_code = pt.code
     LEFT JOIN users u ON p.seller_id = u.id
     WHERE p.id = ?`,
        [id]
    );

    if (rows.length && rows[0]) {
        if (rows[0].attributes && typeof rows[0].attributes === 'string') {
            try { rows[0].attributes = JSON.parse(rows[0].attributes); } catch (e) { }
        }
        if (rows[0].additional_images && typeof rows[0].additional_images === 'string') {
            try { rows[0].additional_images = JSON.parse(rows[0].additional_images); } catch (e) { }
        }
        if (rows[0].tags && typeof rows[0].tags === 'string') {
            try { rows[0].tags = JSON.parse(rows[0].tags); } catch (e) { }
        }

        // Fetch metadata mapping (slug-based contract)
        const [metaRows] = await pool.query(`
            SELECT pm.metadata_id, pm.metadata_value_id, pm.value_text, md.data_type, md.slug, mv.value as enum_value
            FROM product_metadata_map pm
            JOIN metadata_definitions md ON md.id = pm.metadata_id
            LEFT JOIN metadata_values mv ON mv.id = pm.metadata_value_id
            WHERE pm.product_id = ?
        `, [id]);

        if (metaRows.length > 0) {
            rows[0].metadata = {};
            metaRows.forEach(mr => {
                const slug = mr.slug;
                if (mr.data_type === 'ENUM') {
                    // Use the label string (enum_value), NOT the numeric ID.
                    // This ensures the edit form can send it back and the
                    // update query can match it with `value = ?`.
                    const val = mr.enum_value;
                    if (rows[0].metadata[slug]) {
                        if (Array.isArray(rows[0].metadata[slug])) {
                            rows[0].metadata[slug].push(val);
                        } else {
                            rows[0].metadata[slug] = [rows[0].metadata[slug], val];
                        }
                    } else {
                        rows[0].metadata[slug] = val;
                    }
                } else {
                    rows[0].metadata[slug] = mr.value_text;
                }
            });
        }
    }

    return rows[0] || null;
}

async function findAll(filters = {}) {
    let baseQuery = `
    SELECT p.*, 
           c.id as category_leaf_id, c.name as category_leaf_name, c.slug as category_leaf_slug,
           parent.id as category_parent_id, parent.name as category_parent_name, parent.slug as category_parent_slug,
           pt.label as product_type_label,
           u.name as seller_name
    FROM products p
    LEFT JOIN categories_v2 c ON p.category_leaf_id = c.id
    LEFT JOIN categories_v2 parent ON c.parent_id = parent.id
    LEFT JOIN product_types pt ON p.product_type_code = pt.code
    LEFT JOIN users u ON p.seller_id = u.id
  `;

    const { where, params } = buildProductWhereClause(filters);

    let query = `${baseQuery}
    LEFT JOIN (
    SELECT oi.product_id, SUM(oi.quantity) as total_sold
    FROM order_items oi
    GROUP BY oi.product_id
) sales ON sales.product_id = p.id
${where}
ORDER BY COALESCE(sales.total_sold, 0) DESC
`;

    const limit = parseInt(filters.limit) || 20;
    const offset = parseInt(filters.offset) || 0;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    const count = await countAll(filters);

    rows.forEach(row => {
        if (row.attributes && typeof row.attributes === 'string') {
            try { row.attributes = JSON.parse(row.attributes); } catch (e) { }
        }
        if (row.tags && typeof row.tags === 'string') {
            try { row.tags = JSON.parse(row.tags); } catch (e) { }
        }
    });

    return { rows, count };
}

async function findByIds(ids) {
    if (!ids || ids.length === 0) return [];

    // Convert to numbers and filter duplicates
    const uniqueIds = [...new Set(ids.map(id => Number(id)))];

    const [rows] = await pool.query(
        `SELECT p.*, 
                c.id as leaf_id, c.name as leaf_name, c.slug as leaf_slug,
                parent.id as parent_id, parent.name as parent_name, parent.slug as parent_slug,
                pt.label as product_type_label,
                u.name as seller_name
         FROM products p
         LEFT JOIN categories_v2 c ON p.category_leaf_id = c.id
         LEFT JOIN categories_v2 parent ON c.parent_id = parent.id
         LEFT JOIN product_types pt ON p.product_type_code = pt.code
         LEFT JOIN users u ON p.seller_id = u.id
         WHERE p.id IN (?)`,
        [uniqueIds]
    );

    rows.forEach(row => {
        if (row.attributes && typeof row.attributes === 'string') {
            try { row.attributes = JSON.parse(row.attributes); } catch (e) { }
        }
        if (row.additional_images && typeof row.additional_images === 'string') {
            try { row.additional_images = JSON.parse(row.additional_images); } catch (e) { }
        }
        if (row.tags && typeof row.tags === 'string') {
            try { row.tags = JSON.parse(row.tags); } catch (e) { }
        }
    });

    return rows;
}

async function countAll(filters = {}) {
    let baseQuery = `
        SELECT COUNT(*) as total 
        FROM products p 
        LEFT JOIN categories_v2 c ON p.category_leaf_id = c.id
        LEFT JOIN categories_v2 parent ON c.parent_id = parent.id
        LEFT JOIN users u ON p.seller_id = u.id
    `;
    const { where, params } = buildProductWhereClause(filters);
    const query = `${baseQuery} ${where}`;
    const [rows] = await pool.query(query, params);
    return rows[0].total;
}

async function update(id, data) {
    const allowed = [
        'category_leaf_id', 'title', 'sku', 'description', 'mrp', 'selling_price', 'discount_percent',
        'stock', 'format', 'ebook_url', 'attributes', 'image_url', 'additional_images', 'is_active',
        'commission_percentage', 'is_unlimited_stock', 'meta_title', 'meta_description', 'tags',
        'gst_rate', 'is_gst_inclusive'
    ];

    const updates = [];
    const params = [];

    for (const key of allowed) {
        if (data[key] !== undefined) {
            updates.push(`${key} = ?`);
            let val = data[key];

            if (key === 'attributes' && val && typeof val === 'object') {
                val = JSON.stringify(val);
            } else if (key === 'additional_images' && val && Array.isArray(val)) {
                val = JSON.stringify(val);
            } else if (key === 'tags') {
                if (Array.isArray(val)) {
                    val = JSON.stringify(val);
                } else if (typeof val === 'string' && val.trim() !== '') {
                    val = JSON.stringify(val.split(',').map(t => t.trim()));
                } else {
                    val = null;
                }
            }
            params.push(val);
        }
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (updates.length > 0) {
            params.push(id);
            await connection.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Handle metadata updates if provided
        if (data.metadata !== undefined) {
            await connection.query('DELETE FROM product_metadata_map WHERE product_id = ?', [id]);

            if (data.metadata && typeof data.metadata === 'object') {
                for (const [slug, metaValue] of Object.entries(data.metadata)) {
                    // Step 1: Resolve slug
                    const [defRows] = await connection.query(
                        'SELECT id, data_type, is_multi_select FROM metadata_definitions WHERE slug = ?',
                        [slug]
                    );
                    if (defRows.length === 0) {
                        throw new Error(`Invalid metadata slug: ${slug}`);
                    }
                    const def = defRows[0];
                    const metaId = def.id;

                    let values = Array.isArray(metaValue) ? metaValue : [metaValue];

                    // Security rule: Reject array if not multi-select
                    if (values.length > 1 && !def.is_multi_select) {
                        throw new Error(`Multiple values passed for single-select metadata: ${slug}`);
                    }

                    for (const val of values) {
                        if (val === null || val === undefined || val === '') continue;

                        if (def.data_type === 'ENUM') {
                            // Step 2: ENUM Validation — accept both numeric ID and label string
                            const [valRows] = await connection.query(
                                'SELECT id FROM metadata_values WHERE metadata_id = ? AND (id = ? OR value = ?)',
                                [metaId, isNaN(val) ? null : Number(val), String(val)]
                            );
                            if (valRows.length === 0) {
                                throw new Error(`Invalid ENUM value for ${slug}: ${val}`);
                            }
                            const valueId = valRows[0].id;

                            // Step 3: Insert ENUM
                            await connection.query(
                                'INSERT INTO product_metadata_map (product_id, metadata_id, metadata_value_id, value_text) VALUES (?, ?, ?, NULL)',
                                [id, metaId, valueId]
                            );
                        } else {
                            // Step 3: Insert Non-ENUM
                            await connection.query(
                                'INSERT INTO product_metadata_map (product_id, metadata_id, metadata_value_id, value_text) VALUES (?, ?, NULL, ?)',
                                [id, metaId, String(val)]
                            );
                        }
                    }
                }
            }
        }

        await connection.commit();
        return await findById(id);
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function getCategoryTree(typeCode) {
    let query = `SELECT * FROM categories_v2 WHERE is_active=true`;
    const params = [];
    if (typeCode) {
        query += ` AND product_type_code = ?`;
        params.push(typeCode);
    }
    query += ` ORDER BY level ASC, sort_order ASC, name ASC`;
    const [rows] = await pool.query(query, params);
    return rows;
}

async function getCategoryById(id) {
    const [rows] = await pool.query('SELECT * FROM categories_v2 WHERE id=?', [id]);
    return rows[0];
}

async function findImages(productId) {
    const [rows] = await pool.query('SELECT * FROM product_images WHERE product_id=?', [productId]);
    return rows;
}

async function findLowStock(threshold = 10) {
    const [rows] = await pool.query(
        `SELECT p.*, u.name as seller_name
         FROM products p
         JOIN users u ON p.seller_id = u.id
         WHERE p.stock < ? AND p.is_active = true
         ORDER BY p.stock ASC`,
        [threshold]
    );
    return rows;
}

async function findLowStockBySeller(sellerId, threshold = 10) {
    const [rows] = await pool.query(
        `SELECT p.*, u.name as seller_name
         FROM products p
         JOIN users u ON p.seller_id = u.id
         WHERE p.seller_id = ? AND p.stock < ? AND p.is_active = true
         ORDER BY p.stock ASC`,
        [sellerId, threshold]
    );
    return rows;
}

async function hasChildren(id) {
    const [rows] = await pool.query('SELECT id FROM categories_v2 WHERE parent_id=? LIMIT 1', [id]);
    return rows.length > 0;
}

async function addImage(productId, imageUrl, isPrimary = false) {
    if (isPrimary) {
        // Unset any existing primary images if we are setting a new one
        await pool.query('UPDATE product_images SET is_primary=0 WHERE product_id=?', [productId]);
    }

    const [result] = await pool.query(
        'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
        [productId, imageUrl, isPrimary ? 1 : 0]
    );
    return result.insertId;
}

async function clearGalleryImages(productId) {
    // Keep primary image, remove others
    await pool.query('DELETE FROM product_images WHERE product_id=? AND is_primary=0', [productId]);
}

async function getCategoryIdByPath(path) {
    const slugs = path.split('/');
    let parentId = null;
    let categoryId = null;

    for (const slug of slugs) {
        const [rows] = await pool.query(
            'SELECT id FROM categories_v2 WHERE slug = ? AND parent_id <=> ?',
            [slug, parentId]
        );
        if (rows.length === 0) return null;
        categoryId = rows[0].id;
        parentId = categoryId;
    }
    return categoryId;
}

async function getCategoryDescendants(parentId) {
    // Recursive CTE to get all descendants
    const [rows] = await pool.query(`
        WITH RECURSIVE category_path (id) AS (
            SELECT id FROM categories_v2 WHERE id = ?
            UNION ALL
            SELECT c.id FROM categories_v2 c
            JOIN category_path cp ON cp.id = c.parent_id
        )
        SELECT id FROM category_path
    `, [parentId]);
    
    return rows.map(r => r.id);
}

module.exports = {
    create,
    findById,
    findAll,
    countAll,
    update,
    getCategoryTree,
    getCategoryById,
    getCategoryIdByPath,
    getCategoryDescendants,
    findImages,
    findLowStock,
    findLowStockBySeller,
    findByIds,
    hasChildren,
    addImage,
    clearGalleryImages
};