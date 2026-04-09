const db = require('../../config/db');
const response = require('../../utils/response');
const logger = require('../../utils/logger');

// GET /api/metadata?product_type=BOOK
async function getMetadataDefinitions(req, res) {
    try {
        const { product_type } = req.query;

        let query = 'SELECT * FROM metadata_definitions WHERE 1=1';
        let params = [];

        if (product_type) {
            query += ' AND (product_type_code = ? OR product_type_code IS NULL)';
            params.push(product_type);
        }

        const [definitions] = await db.query(query, params);

        // Fetch values for ENUM types
        const enumIds = definitions.filter(d => d.data_type === 'ENUM').map(d => d.id);
        let valuesMap = {};

        if (enumIds.length > 0) {
            const [values] = await db.query(
                `SELECT * FROM metadata_values WHERE metadata_id IN (?) ORDER BY value ASC`,
                [enumIds]
            );

            values.forEach(v => {
                if (!valuesMap[v.metadata_id]) valuesMap[v.metadata_id] = [];
                valuesMap[v.metadata_id].push(v);
            });
        }

        // Attach values to definitions
        const mapped = definitions.map(def => ({
            slug: def.slug,
            name: def.name,
            data_type: def.data_type,
            is_multi_select: !!def.is_multi_select,
            is_filterable: !!def.is_filterable,
            is_searchable: !!def.is_searchable,
            options: valuesMap[def.id] || []
        }));

        return response.success(res, mapped, 'Metadata fetched successfully');
    } catch (err) {
        logger.error('Get metadata failed', { error: err.message });
        return response.error(res, err.message, 500);
    }
}

// POST /api/admin/metadata
async function createMetadataDefinition(req, res) {
    try {
        const { name, slug, data_type, is_multi_select, is_filterable, is_searchable, product_type_code } = req.body;

        if (!name || !slug) {
            return response.error(res, 'Name and slug are required', 400);
        }

        const [result] = await db.query(
            `INSERT INTO metadata_definitions 
      (name, slug, data_type, is_multi_select, is_filterable, is_searchable, product_type_code) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                slug,
                data_type || 'STRING',
                is_multi_select || false,
                is_filterable !== undefined ? is_filterable : true,
                is_searchable !== undefined ? is_searchable : true,
                product_type_code || null
            ]
        );

        return response.success(res, { id: result.insertId, slug }, 'Metadata definition created', 201);
    } catch (err) {
        logger.error('Create metadata failed', { error: err.message });
        if (err.code === 'ER_DUP_ENTRY') {
            return response.error(res, 'A metadata definition with this slug already exists', 400);
        }
        return response.error(res, err.message, 500);
    }
}

// POST /api/admin/metadata/:id/values
async function addMetadataValue(req, res) {
    try {
        const { id } = req.params;
        const { value } = req.body;

        if (!value) {
            return response.error(res, 'Value is required', 400);
        }

        const [result] = await db.query(
            'INSERT INTO metadata_values (metadata_id, value) VALUES (?, ?)',
            [id, value]
        );

        return response.success(res, { id: result.insertId, value }, 'Metadata value added', 201);
    } catch (err) {
        logger.error('Add metadata value failed', { error: err.message });
        if (err.code === 'ER_DUP_ENTRY') {
            return response.error(res, 'This value already exists for the metadata', 400);
        }
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return response.error(res, 'Metadata definition not found', 404);
        }
        return response.error(res, err.message, 500);
    }
}

module.exports = {
    getMetadataDefinitions,
    createMetadataDefinition,
    addMetadataValue
};
