const pool = require('../../config/db');

/**
 * Get all site settings
 * @param {boolean} isPublic - If true, returns only public settings
 */
async function getAllSettings(isPublic = true) {
    try {
        let query = 'SELECT setting_key, setting_value, setting_type, group_name FROM site_settings';
        if (isPublic) {
            query += ' WHERE is_public = true';
        }
        const [rows] = await pool.query(query);

        // Convert to object { key: value }
        return rows.reduce((acc, row) => {
            let value = row.setting_value;
            // Parse JSON if type is json
            if (row.setting_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    console.error(`Failed to parse JSON for setting ${row.setting_key}`, e);
                    value = {};
                }
            }
            acc[row.setting_key] = value;
            return acc;
        }, {});
    } catch (err) {
        // If table doesn't exist yet, return empty settings instead of throwing
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            console.warn('site_settings table missing, returning empty settings');
            return {};
        }
        throw err;
    }
}

/**
 * Update a specific setting (UPSERT)
 */
async function updateSetting(key, value) {
    const isJson = typeof value === 'string' && (value.startsWith('{') || value.startsWith('['));
    const type = isJson ? 'json' : 'text';
    const group = (key === 'maintenance_mode' || key === 'header_notices') ? 'system' : 'general';

    const [result] = await pool.query(
        `INSERT INTO site_settings (setting_key, setting_value, setting_type, group_name, is_public)
         VALUES (?, ?, ?, ?, true)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [key, value, type, group]
    );
    return result.affectedRows > 0;
}

/**
 * Get a specific setting by key
 */
async function getSettingByKey(key) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM site_settings WHERE setting_key = ?',
            [key]
        );
        return rows[0];
    } catch (err) {
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            console.warn('site_settings table missing when fetching key', key);
            return null;
        }
        throw err;
    }
}

module.exports = {
    getAllSettings,
    updateSetting,
    getSettingByKey
};
