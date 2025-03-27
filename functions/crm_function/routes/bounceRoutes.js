// bounceRoutes.js
const express = require('express');
const router = express.Router();
const bounceController = require('../controllers/bounceController');

// Define a POST route to handle Zoho bounce webhooks
router.post('/bounce-webhook', bounceController.handleBounceEvent);

module.exports = router;
