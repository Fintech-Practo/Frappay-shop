const siteSettingsModel = require('./site-settings.model');
const { uploadFile } = require('../../utils/upload');
const fs = require('fs');

const path = require('path');

function logToFile(msg) {
    try {
        const logPath = 'c:\\PRACTOMIND\\25\\Books-and-Copies\\backend\\debug.log';
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) { }
}

// Get all settings (Public)
async function getPublicSettings(req, res) {
    try {
        const settings = await siteSettingsModel.getAllSettings(true);
        logToFile(`[SiteSettings] getPublicSettings: Fetched ${Object.keys(settings).length} public settings.`);
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get public settings error:', error);
        logToFile(`[SiteSettings] getPublicSettings Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
}

// Get all settings (Admin)
async function getAdminSettings(req, res) {
    try {
        const settings = await siteSettingsModel.getAllSettings(false); // Fetch all including private
        logToFile(`[SiteSettings] getAdminSettings: Fetched ${Object.keys(settings).length} admin settings.`);
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get admin settings error:', error);
        logToFile(`[SiteSettings] getAdminSettings Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
}

// Update settings
async function updateSettings(req, res) {
    try {
        logToFile(`[SiteSettings] updateSettings called with body: ${JSON.stringify(req.body)}`);
        const { settings } = req.body;
        logToFile(`[SiteSettings] Extracted settings keys: ${settings ? Object.keys(settings).join(', ') : 'NONE'}`);
        // Expecting object: { "site_logo": "...", "contact_email": "..." }

        if (!settings) {
            logToFile(`[SiteSettings] updateSettings: No settings provided in request.`);
            return res.status(400).json({ success: false, message: 'No settings provided' });
        }

        const updates = [];
        for (const [key, value] of Object.entries(settings)) {
            let valToStore = value;
            if (typeof value === 'object' && value !== null) {
                valToStore = JSON.stringify(value);
            }
            updates.push(siteSettingsModel.updateSetting(key, valToStore));
            logToFile(`[SiteSettings] updateSettings: Preparing to update key '${key}' with value '${valToStore}'.`);
        }

        await Promise.all(updates);
        logToFile(`[SiteSettings] updateSettings: All settings updated successfully.`);

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        logToFile(`[SiteSettings] updateSettings Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
}

// Upload Image for Setting
// Route: POST /api/site-settings/upload/:key
async function uploadSettingImage(req, res) {
    try {
        const { key } = req.params;
        const file = req.file;
        logToFile(`[SiteSettings] uploadSettingImage called for key: ${key}`);

        if (!file) {
            logToFile(`[SiteSettings] uploadSettingImage: No file uploaded for key '${key}'.`);
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        // Verify key exists
        const setting = await siteSettingsModel.getSettingByKey(key);
        if (!setting) {
            logToFile(`[SiteSettings] uploadSettingImage: Setting key '${key}' not found.`);
            return res.status(404).json({ success: false, message: 'Setting key not found' });
        }

        // Upload to S3
        const imageUrl = await uploadFile(
            file.buffer,
            file.mimetype,
            'site-assets',
            file.originalname
        );

        // Update DB
        await siteSettingsModel.updateSetting(key, imageUrl);

        res.json({ success: true, data: { imageUrl }, message: 'Image uploaded successfully' });
    } catch (error) {
        console.error('Upload setting image error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
}

// Upload Asset (Generic) - Returns URL only
// Route: POST /api/site-settings/upload-asset
async function uploadAsset(req, res) {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        const imageUrl = await uploadFile(
            file.buffer,
            file.mimetype,
            'site-assets',
            file.originalname
        );
        res.json({ success: true, data: { imageUrl }, message: 'Asset uploaded' });
    } catch (error) {
        console.error('Upload asset error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload asset' });
    }
}

module.exports = {
    getPublicSettings,
    getAdminSettings,
    updateSettings,
    uploadSettingImage,
    uploadAsset
};
