const express = require('express');
const router = express.Router();
const chatbotController = require('./chatbot.controller');

// Handle user message
router.post('/message', chatbotController.handleMessage);

module.exports = router;
