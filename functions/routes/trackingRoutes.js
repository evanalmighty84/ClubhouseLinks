// /routes/trackingRoutes.js
const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

// Route to track email opens (via pixel)
router.get('/campaign/open/:campaignId/:subscriberId', trackingController.trackOpenCampaign);

// Route to track link clicks
router.get('/campaign/click/:campaignId/:subscriberId', trackingController.trackClickCampaign);

router.get('/template/open/:templateId/:subscriberId', trackingController.trackOpenTemplate);

router.get('/template/click/:templateId/:subscriberId', trackingController.trackClickTemplate);

module.exports = router;
