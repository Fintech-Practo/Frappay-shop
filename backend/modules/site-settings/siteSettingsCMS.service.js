const db = require('../../config/db');
const { uploadFile } = require('../../utils/upload');
const logger = require('../../utils/logger');

class SiteSettingsCMSService {
  // Hero Banners Management
  async getHeroBanners() {
    try {
      const query = `
        SELECT * FROM site_settings 
        WHERE group_name = 'hero' 
        ORDER BY JSON_EXTRACT(setting_value, '$.order') ASC
      `;
      const [rows] = await db.execute(query);

      return rows.map(row => ({
        id: row.setting_key,
        ...JSON.parse(row.setting_value)
      }));
    } catch (error) {
      logger.error('Get hero banners error:', error);
      throw new Error('Failed to fetch hero banners');
    }
  }

  async createHeroBanner(bannerData) {
    try {
      const bannerId = `hero_${Date.now()}`;
      const banner = {
        ...bannerData,
        id: bannerId,
        created_at: new Date().toISOString(),
        order: bannerData.order || 999
      };

      const query = `
        INSERT INTO site_settings (setting_key, setting_value, setting_type, group_name, is_public)
        VALUES (?, ?, 'json', 'hero', true)
      `;

      await db.execute(query, [bannerId, JSON.stringify(banner)]);
      return banner;
    } catch (error) {
      logger.error('Create hero banner error:', error);
      throw new Error('Failed to create hero banner');
    }
  }

  async updateHeroBanner(id, bannerData) {
    try {
      const existingQuery = `SELECT setting_value FROM site_settings WHERE setting_key = ?`;
      const [existing] = await db.execute(existingQuery, [id]);

      if (!existing.length) {
        throw new Error('Hero banner not found');
      }

      const existingBanner = JSON.parse(existing[0].setting_value);
      const updatedBanner = {
        ...existingBanner,
        ...bannerData,
        updated_at: new Date().toISOString()
      };

      const updateQuery = `
        UPDATE site_settings 
        SET setting_value = ? 
        WHERE setting_key = ?
      `;

      await db.execute(updateQuery, [JSON.stringify(updatedBanner), id]);
      return updatedBanner;
    } catch (error) {
      logger.error('Update hero banner error:', error);
      throw new Error('Failed to update hero banner');
    }
  }

  async deleteHeroBanner(id) {
    try {
      const query = `DELETE FROM site_settings WHERE setting_key = ? AND group_name = 'hero'`;
      const [result] = await db.execute(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Hero banner not found');
      }

      return true;
    } catch (error) {
      logger.error('Delete hero banner error:', error);
      throw new Error('Failed to delete hero banner');
    }
  }

  async reorderHeroBanner(id, newOrder) {
    try {
      const banner = await this.getHeroBannerById(id);
      if (!banner) {
        throw new Error('Hero banner not found');
      }

      return await this.updateHeroBanner(id, { order: newOrder });
    } catch (error) {
      logger.error('Reorder hero banner error:', error);
      throw new Error('Failed to reorder hero banner');
    }
  }

  async getHeroBannerById(id) {
    try {
      const query = `SELECT setting_value FROM site_settings WHERE setting_key = ? AND group_name = 'hero'`;
      const [rows] = await db.execute(query, [id]);

      if (!rows.length) {
        return null;
      }

      return { id, ...JSON.parse(rows[0].setting_value) };
    } catch (error) {
      logger.error('Get hero banner by ID error:', error);
      throw new Error('Failed to fetch hero banner');
    }
  }

  // Promo Banners Management (similar structure)
  async getPromoBanners() {
    try {
      const query = `
        SELECT * FROM site_settings 
        WHERE group_name = 'promo' 
        ORDER BY JSON_EXTRACT(setting_value, '$.order') ASC
      `;
      const [rows] = await db.execute(query);

      return rows.map(row => ({
        id: row.setting_key,
        ...JSON.parse(row.setting_value)
      }));
    } catch (error) {
      logger.error('Get promo banners error:', error);
      throw new Error('Failed to fetch promo banners');
    }
  }

  async createPromoBanner(bannerData) {
    try {
      const bannerId = `promo_${Date.now()}`;
      const banner = {
        ...bannerData,
        id: bannerId,
        created_at: new Date().toISOString(),
        order: bannerData.order || 999
      };

      const query = `
        INSERT INTO site_settings (setting_key, setting_value, setting_type, group_name, is_public)
        VALUES (?, ?, 'json', 'promo', true)
      `;

      await db.execute(query, [bannerId, JSON.stringify(banner)]);
      return banner;
    } catch (error) {
      logger.error('Create promo banner error:', error);
      throw new Error('Failed to create promo banner');
    }
  }

  async updatePromoBanner(id, bannerData) {
    try {
      const existingQuery = `SELECT setting_value FROM site_settings WHERE setting_key = ?`;
      const [existing] = await db.execute(existingQuery, [id]);

      if (!existing.length) {
        throw new Error('Promo banner not found');
      }

      const existingBanner = JSON.parse(existing[0].setting_value);
      const updatedBanner = {
        ...existingBanner,
        ...bannerData,
        updated_at: new Date().toISOString()
      };

      const updateQuery = `
        UPDATE site_settings 
        SET setting_value = ? 
        WHERE setting_key = ?
      `;

      await db.execute(updateQuery, [JSON.stringify(updatedBanner), id]);
      return updatedBanner;
    } catch (error) {
      logger.error('Update promo banner error:', error);
      throw new Error('Failed to update promo banner');
    }
  }

  async deletePromoBanner(id) {
    try {
      const query = `DELETE FROM site_settings WHERE setting_key = ? AND group_name = 'promo'`;
      const [result] = await db.execute(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Promo banner not found');
      }

      return true;
    } catch (error) {
      logger.error('Delete promo banner error:', error);
      throw new Error('Failed to delete promo banner');
    }
  }

  // Categories Management
  async getHomepageCategories() {
    try {
      const query = `
        SELECT * FROM site_settings 
        WHERE group_name = 'categories' 
        ORDER BY JSON_EXTRACT(setting_value, '$.order') ASC
      `;
      const [rows] = await db.execute(query);

      return rows.map(row => ({
        id: row.setting_key,
        ...JSON.parse(row.setting_value)
      }));
    } catch (error) {
      logger.error('Get homepage categories error:', error);
      throw new Error('Failed to fetch homepage categories');
    }
  }

  async createHomepageCategory(categoryData) {
    try {
      const categoryId = `category_${Date.now()}`;
      const category = {
        ...categoryData,
        id: categoryId,
        created_at: new Date().toISOString(),
        order: categoryData.order || 999
      };

      const query = `
        INSERT INTO site_settings (setting_key, setting_value, setting_type, group_name, is_public)
        VALUES (?, ?, 'json', 'categories', true)
      `;

      await db.execute(query, [categoryId, JSON.stringify(category)]);
      return category;
    } catch (error) {
      logger.error('Create homepage category error:', error);
      throw new Error('Failed to create homepage category');
    }
  }

  async updateHomepageCategory(id, categoryData) {
    try {
      const existingQuery = `SELECT setting_value FROM site_settings WHERE setting_key = ?`;
      const [existing] = await db.execute(existingQuery, [id]);

      if (!existing.length) {
        throw new Error('Homepage category not found');
      }

      const existingCategory = JSON.parse(existing[0].setting_value);
      const updatedCategory = {
        ...existingCategory,
        ...categoryData,
        updated_at: new Date().toISOString()
      };

      const updateQuery = `
        UPDATE site_settings 
        SET setting_value = ? 
        WHERE setting_key = ?
      `;

      await db.execute(updateQuery, [JSON.stringify(updatedCategory), id]);
      return updatedCategory;
    } catch (error) {
      logger.error('Update homepage category error:', error);
      throw new Error('Failed to update homepage category');
    }
  }

  async deleteHomepageCategory(id) {
    try {
      const query = `DELETE FROM site_settings WHERE setting_key = ? AND group_name = 'categories'`;
      const [result] = await db.execute(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Homepage category not found');
      }

      return true;
    } catch (error) {
      logger.error('Delete homepage category error:', error);
      throw new Error('Failed to delete homepage category');
    }
  }

  // Footer Management
  async getFooterSettings() {
    try {
      const query = `
        SELECT * FROM site_settings 
        WHERE group_name = 'footer' 
        ORDER BY setting_key ASC
      `;
      const [rows] = await db.execute(query);

      const footer = {};
      rows.forEach(row => {
        const key = row.setting_key.replace('footer_', '');
        footer[key] = row.setting_type === 'json' ? JSON.parse(row.setting_value) : row.setting_value;
      });

      return footer;
    } catch (error) {
      logger.error('Get footer settings error:', error);
      throw new Error('Failed to fetch footer settings');
    }
  }

  async updateFooterSettings(footerData) {
    try {
      const updates = [];

      for (const [key, value] of Object.entries(footerData)) {
        const settingKey = `footer_${key}`;
        const settingValue = typeof value === 'object' ? JSON.stringify(value) : value;
        const settingType = typeof value === 'object' ? 'json' : 'string';

        const query = `
          INSERT INTO site_settings (setting_key, setting_value, setting_type, group_name, is_public)
          VALUES (?, ?, ?, 'footer', true)
          ON DUPLICATE KEY UPDATE setting_value = ?, setting_type = ?
        `;

        updates.push(db.execute(query, [settingKey, settingValue, settingType, settingValue, settingType]));
      }

      await Promise.all(updates);
      return footerData;
    } catch (error) {
      logger.error('Update footer settings error:', error);
      throw new Error('Failed to update footer settings');
    }
  }

  // Feature Strips Management
  async getFeatureStrips() {
    try {
      const query = `
        SELECT setting_value FROM site_settings 
        WHERE setting_key = 'feature_strips' AND group_name = 'features'
      `;
      const [rows] = await db.execute(query);

      if (!rows.length) {
        return {
          free_shipping: { enabled: true, text: 'Free Shipping on Orders Above ₹500' },
          secure_payment: { enabled: true, text: '100% Secure Payment' },
          fast_delivery: { enabled: true, text: 'Fast Delivery Across India' },
          customer_support: { enabled: true, text: '24/7 Customer Support' }
        };
      }

      return JSON.parse(rows[0].setting_value);
    } catch (error) {
      logger.error('Get feature strips error:', error);
      throw new Error('Failed to fetch feature strips');
    }
  }

  async updateFeatureStrips(featuresData) {
    try {
      const query = `
        INSERT INTO site_settings (setting_key, setting_value, setting_type, group_name, is_public)
        VALUES ('feature_strips', ?, 'json', 'features', true)
        ON DUPLICATE KEY UPDATE setting_value = ?
      `;

      await db.execute(query, [JSON.stringify(featuresData), JSON.stringify(featuresData)]);
      return featuresData;
    } catch (error) {
      logger.error('Update feature strips error:', error);
      throw new Error('Failed to update feature strips');
    }
  }

  // Image Upload Helper
  async uploadImage(file, folder = 'site-assets') {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      const imageUrl = await uploadFile(
        file.buffer,
        file.mimetype,
        folder,
        file.originalname
      );

      return imageUrl;
    } catch (error) {
      logger.error('Upload image error:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Get all CMS data for admin
  async getAllCMSSettings() {
    try {
      const [
        heroBanners,
        promoBanners,
        categories,
        footer,
        features
      ] = await Promise.all([
        this.getHeroBanners(),
        this.getPromoBanners(),
        this.getHomepageCategories(),
        this.getFooterSettings(),
        this.getFeatureStrips()
      ]);

      return {
        hero_banners: heroBanners,
        promo_banners: promoBanners,
        homepage_categories: categories,
        footer_settings: footer,
        feature_strips: features
      };
    } catch (error) {
      logger.error('Get all CMS settings error:', error);
      throw new Error('Failed to fetch CMS settings');
    }
  }

  // Get public site settings (for frontend)
  async getPublicSiteSettings() {
    try {
      const [
        heroBanners,
        promoBanners,
        categories,
        footer,
        features
      ] = await Promise.all([
        this.getHeroBanners(),
        this.getPromoBanners(),
        this.getHomepageCategories(),
        this.getFooterSettings(),
        this.getFeatureStrips()
      ]);

      return {
        hero_banners: heroBanners.filter(banner => banner.is_active),
        promo_banners: promoBanners.filter(banner => banner.is_active),
        homepage_categories: categories.filter(cat => cat.is_active),
        footer_settings: footer,
        feature_strips: features
      };
    } catch (error) {
      logger.error('Get public site settings error:', error);
      throw new Error('Failed to fetch public site settings');
    }
  }
}

module.exports = new SiteSettingsCMSService();
