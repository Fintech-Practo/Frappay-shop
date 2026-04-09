const db = require('../config/db');
const { verifyToken } = require('../utils/jwt');

async function maintenanceGuard(req, res, next) {
    try {
        const isPublicSettingsGet = req.originalUrl.includes('/api/site-settings') && req.method === 'GET';
        const isAdminLoginRoute = req.originalUrl.includes('/api/auth/admin/login');

        if (isAdminLoginRoute || isPublicSettingsGet) {
            return next();
        }

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1].replace(/^"|"$/g, '');
            try {
                const decoded = verifyToken(token);
                const role = (decoded?.user?.role || decoded?.role || "").toUpperCase();

                if (role === 'ADMIN') {
                    return next();
                }
            } catch (err) {
                // Invalid token - continue to check maintenance mode
            }
        }

        const [rows] = await db.query(
            "SELECT setting_value FROM site_settings WHERE setting_key = 'maintenance_mode'"
        );

        if (rows.length === 0) {
            return next();
        }

        const config = JSON.parse(rows[0].setting_value);
        if (!config.enabled) return next();

        return res.status(503).json({
            success: false,
            maintenance: true,
            data: { maintenance_mode: config },
            message: config.message || "System under maintenance"
        });

    } catch (err) {
        console.error("[MaintenanceGuard] Unexpected Error:", err);
        next();
    }
}

module.exports = maintenanceGuard;
