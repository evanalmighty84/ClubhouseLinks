const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaignsController');

// ⭐⭐⭐ SEND TO LEAD (must be before the catch-all route)
router.post('/send-to-lead/:id', campaignsController.sendCampaignToLead);

// Create a new campaign
router.post('/create', campaignsController.createCampaign);

// Route to resend a campaign
router.post('/send/:id', campaignsController.resendCampaign);

// Update campaign status
router.put('/:campaignId/status', campaignsController.updateCampaignStatus);



router.post('/user/sent', campaignsController.getSentCampaignsByUser);

// Get all campaigns by user ID
router.get('/user/:userId', campaignsController.getCampaignsByUser);

// Campaign stats
router.get('/stats/:userId', campaignsController.getCampaignStatsByUser);
router.get('/:campaignId/stats', campaignsController.getCampaignStatsByCampaign);



// Update a specific campaign by ID
router.put('/:campaignId', campaignsController.updateCampaignById);

// ⭐⭐⭐ ALWAYS LAST (catch-all dynamic route)


router.get('/test-db', campaignsController.testDatabaseConnection);

router.get('/:campaignId', campaignsController.getCampaignById); //need to change to /update later because this has tobe at the end no matter what!



module.exports = router;
