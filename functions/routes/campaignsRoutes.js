const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaignsController');

// Create a new campaign
router.post('/create', campaignsController.createCampaign);

// Route to resend a campaign
router.post('/send/:id', campaignsController.resendCampaign);

// Update campaign status
router.put('/:campaignId/status', campaignsController.updateCampaignStatus);

// Update a specific campaign by ID
router.put('/:campaignId', campaignsController.updateCampaignById); // Add this route

// Get all campaigns by user ID
router.get('/user/:userId', campaignsController.getCampaignsByUser);

// Get stats for all campaigns by user
router.get('/stats/:userId', campaignsController.getCampaignStatsByUser);

// Get stats for a specific campaign
router.get('/:campaignId/stats', campaignsController.getCampaignStatsByCampaign);

// Get a specific campaign by ID
router.get('/:campaignId', campaignsController.getCampaignById);

// Route to test database connection
router.get('/test-db', campaignsController.testDatabaseConnection);

module.exports = router;
