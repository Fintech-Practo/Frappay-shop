const siteSettingsCMSService = require('./siteSettingsCMS.service');
const logger = require('../../utils/logger');

class SiteSettingsCMSController {
  // Get all CMS settings (Admin)
  async getAllCMSSettings(req, res) {
    try {
      const settings = await siteSettingsCMSService.getAllCMSSettings();
      
      res.json({
        success: true,
        data: settings,
        message: "CMS settings retrieved successfully"
      });
    } catch (error) {
      logger.error('Get all CMS settings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch CMS settings"
      });
    }
  }

  // Get public site settings
  async getPublicSiteSettings(req, res) {
    try {
      const settings = await siteSettingsCMSService.getPublicSiteSettings();
      
      res.json({
        success: true,
        data: settings,
        message: "Public site settings retrieved successfully"
      });
    } catch (error) {
      logger.error('Get public site settings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch public site settings"
      });
    }
  }

  // HERO BANNERS MANAGEMENT
  async getHeroBanners(req, res) {
    try {
      const banners = await siteSettingsCMSService.getHeroBanners();
      
      res.json({
        success: true,
        data: banners,
        message: "Hero banners retrieved successfully"
      });
    } catch (error) {
      logger.error('Get hero banners error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch hero banners"
      });
    }
  }

  async createHeroBanner(req, res) {
    try {
      const bannerData = req.body;
      
      // Validate required fields
      const requiredFields = ['title', 'description', 'btnText', 'btnLink'];
      for (const field of requiredFields) {
        if (!bannerData[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }
      }

      const banner = await siteSettingsCMSService.createHeroBanner(bannerData);
      
      res.status(201).json({
        success: true,
        data: banner,
        message: "Hero banner created successfully"
      });
    } catch (error) {
      logger.error('Create hero banner error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create hero banner"
      });
    }
  }

  async updateHeroBanner(req, res) {
    try {
      const { id } = req.params;
      const bannerData = req.body;
      
      const banner = await siteSettingsCMSService.updateHeroBanner(id, bannerData);
      
      res.json({
        success: true,
        data: banner,
        message: "Hero banner updated successfully"
      });
    } catch (error) {
      logger.error('Update hero banner error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update hero banner"
      });
    }
  }

  async deleteHeroBanner(req, res) {
    try {
      const { id } = req.params;
      
      await siteSettingsCMSService.deleteHeroBanner(id);
      
      res.json({
        success: true,
        message: "Hero banner deleted successfully"
      });
    } catch (error) {
      logger.error('Delete hero banner error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete hero banner"
      });
    }
  }

  async reorderHeroBanner(req, res) {
    try {
      const { id } = req.params;
      const { order } = req.body;
      
      if (typeof order !== 'number') {
        return res.status(400).json({
          success: false,
          message: "Order must be a number"
        });
      }

      const banner = await siteSettingsCMSService.reorderHeroBanner(id, order);
      
      res.json({
        success: true,
        data: banner,
        message: "Hero banner reordered successfully"
      });
    } catch (error) {
      logger.error('Reorder hero banner error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reorder hero banner"
      });
    }
  }

  // PROMO BANNERS MANAGEMENT
  async getPromoBanners(req, res) {
    try {
      const banners = await siteSettingsCMSService.getPromoBanners();
      
      res.json({
        success: true,
        data: banners,
        message: "Promo banners retrieved successfully"
      });
    } catch (error) {
      logger.error('Get promo banners error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch promo banners"
      });
    }
  }

  async createPromoBanner(req, res) {
    try {
      const bannerData = req.body;
      
      // Validate required fields
      const requiredFields = ['title', 'description', 'btnText', 'btnLink'];
      for (const field of requiredFields) {
        if (!bannerData[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }
      }

      const banner = await siteSettingsCMSService.createPromoBanner(bannerData);
      
      res.status(201).json({
        success: true,
        data: banner,
        message: "Promo banner created successfully"
      });
    } catch (error) {
      logger.error('Create promo banner error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create promo banner"
      });
    }
  }

  async updatePromoBanner(req, res) {
    try {
      const { id } = req.params;
      const bannerData = req.body;
      
      const banner = await siteSettingsCMSService.updatePromoBanner(id, bannerData);
      
      res.json({
        success: true,
        data: banner,
        message: "Promo banner updated successfully"
      });
    } catch (error) {
      logger.error('Update promo banner error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update promo banner"
      });
    }
  }

  async deletePromoBanner(req, res) {
    try {
      const { id } = req.params;
      
      await siteSettingsCMSService.deletePromoBanner(id);
      
      res.json({
        success: true,
        message: "Promo banner deleted successfully"
      });
    } catch (error) {
      logger.error('Delete promo banner error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete promo banner"
      });
    }
  }

  // CATEGORIES MANAGEMENT
  async getHomepageCategories(req, res) {
    try {
      const categories = await siteSettingsCMSService.getHomepageCategories();
      
      res.json({
        success: true,
        data: categories,
        message: "Homepage categories retrieved successfully"
      });
    } catch (error) {
      logger.error('Get homepage categories error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch homepage categories"
      });
    }
  }

  async createHomepageCategory(req, res) {
    try {
      const categoryData = req.body;
      
      // Validate required fields
      const requiredFields = ['name', 'description', 'image', 'link'];
      for (const field of requiredFields) {
        if (!categoryData[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }
      }

      const category = await siteSettingsCMSService.createHomepageCategory(categoryData);
      
      res.status(201).json({
        success: true,
        data: category,
        message: "Homepage category created successfully"
      });
    } catch (error) {
      logger.error('Create homepage category error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create homepage category"
      });
    }
  }

  async updateHomepageCategory(req, res) {
    try {
      const { id } = req.params;
      const categoryData = req.body;
      
      const category = await siteSettingsCMSService.updateHomepageCategory(id, categoryData);
      
      res.json({
        success: true,
        data: category,
        message: "Homepage category updated successfully"
      });
    } catch (error) {
      logger.error('Update homepage category error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update homepage category"
      });
    }
  }

  async deleteHomepageCategory(req, res) {
    try {
      const { id } = req.params;
      
      await siteSettingsCMSService.deleteHomepageCategory(id);
      
      res.json({
        success: true,
        message: "Homepage category deleted successfully"
      });
    } catch (error) {
      logger.error('Delete homepage category error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete homepage category"
      });
    }
  }

  // FOOTER MANAGEMENT
  async getFooterSettings(req, res) {
    try {
      const footer = await siteSettingsCMSService.getFooterSettings();
      
      res.json({
        success: true,
        data: footer,
        message: "Footer settings retrieved successfully"
      });
    } catch (error) {
      logger.error('Get footer settings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch footer settings"
      });
    }
  }

  async updateFooterSettings(req, res) {
    try {
      const footerData = req.body;
      
      const footer = await siteSettingsCMSService.updateFooterSettings(footerData);
      
      res.json({
        success: true,
        data: footer,
        message: "Footer settings updated successfully"
      });
    } catch (error) {
      logger.error('Update footer settings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update footer settings"
      });
    }
  }

  // FEATURE STRIPS MANAGEMENT
  async getFeatureStrips(req, res) {
    try {
      const features = await siteSettingsCMSService.getFeatureStrips();
      
      res.json({
        success: true,
        data: features,
        message: "Feature strips retrieved successfully"
      });
    } catch (error) {
      logger.error('Get feature strips error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch feature strips"
      });
    }
  }

  async updateFeatureStrips(req, res) {
    try {
      const featuresData = req.body;
      
      const features = await siteSettingsCMSService.updateFeatureStrips(featuresData);
      
      res.json({
        success: true,
        data: features,
        message: "Feature strips updated successfully"
      });
    } catch (error) {
      logger.error('Update feature strips error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update feature strips"
      });
    }
  }

  // IMAGE UPLOAD
  async uploadImage(req, res) {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      const imageUrl = await siteSettingsCMSService.uploadImage(file);
      
      res.json({
        success: true,
        data: { imageUrl },
        message: "Image uploaded successfully"
      });
    } catch (error) {
      logger.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image"
      });
    }
  }
}

module.exports = new SiteSettingsCMSController();
