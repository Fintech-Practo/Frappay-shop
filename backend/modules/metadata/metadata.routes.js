const express = require('express');
const router = express.Router();
const controller = require('./metadata.controller');

// Public route for fetching metadata
router.get('/', controller.getMetadataDefinitions);

module.exports = router;
